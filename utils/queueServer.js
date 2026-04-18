const express = require('express');
const cors = require('cors');

// Internal State
const queue = [];
const connecting = new Set();
const grace = new Map();

function getPriority(member) {
    if (!member) return { priority: 0, isVerified: false };

    const priorities = global.PriorityLevels || {};
    const verifiedRoleName = (global.VerifiedRole || 'verified').toLowerCase();
    
    let maxPriority = 0; // Default base level for unverified/verified
    let isVerified = (!verifiedRoleName); // If no verified role bound, act as verified

    // Check Member Roles Cache
    member.roles.cache.forEach(role => {
        const rName = role.name.toLowerCase();
        
        // Staff overriding all restrictions
        const staffRoles = ['owner', 'developer', 'staff'];
        if (staffRoles.includes(rName)) {
            isVerified = true;
        }

        if (rName === verifiedRoleName) isVerified = true;
        
        if (priorities[rName] && priorities[rName] > maxPriority) {
            maxPriority = priorities[rName];
        }
    });

    return { priority: maxPriority, isVerified };
}

const db = require('./database');
async function fetchPlayerJob(discordId) {
    try {
        const [linkData] = await db.query('SELECT citizenid FROM djon_discord_links WHERE discord_id = ? AND is_linked = 1', [discordId]);
        if (!linkData || linkData.length === 0) return null;

        const citizenid = linkData[0].citizenid;
        const framework = global.FiveMFramework || 'qbcore';

        if (framework === 'qbcore') {
            const [rows] = await db.query('SELECT job FROM players WHERE citizenid = ?', [citizenid]);
            if (rows.length > 0) {
                const jobObj = JSON.parse(rows[0].job || '{}');
                return { job: jobObj.label || 'Unemployed', grade: jobObj.grade ? jobObj.grade.name : '' };
            }
        } else if (framework === 'esx') {
            const [rows] = await db.query('SELECT job, job_grade FROM users WHERE identifier = ?', [citizenid]);
            if (rows.length > 0) {
                return { job: rows[0].job || 'Unemployed', grade: rows[0].job_grade !== undefined ? `Grade ${rows[0].job_grade}` : '' };
            }
        }
    } catch (e) {
        console.error('[QUEUE] Failed to fetch player job:', e);
    }
    return null;
}

function startQueueServer(client) {
    global.onlinePlayers = [];
    global.FiveMFramework = process.env.FRAMEWORK || 'auto';
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Clean grace memory periodically
    setInterval(() => {
        const now = Date.now();
        grace.forEach((expiry, discordId) => {
            if (now > expiry) grace.delete(discordId);
        });
    }, 60000);

    app.post('/api/bridge/online', (req, res) => {
        global.onlinePlayers = req.body.onlinePlayers || [];
        res.json({ success: true });
    });

    app.post('/api/queue/join', async (req, res) => {
        console.log(`[QUEUE] JOIN REQUEST from: ${req.body.discordId}`);
        const { discordId, name, maxSlots, currentPlayers } = req.body;
        
        if (!discordId) return res.status(400).json({ error: 'Missing Discord ID' });

        const isEnabled = process.env.QUEUE_ENABLED === 'true';
        if (!isEnabled) {
            return res.json({ allowed: true });
        }

        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) return res.status(500).json({ error: 'Guild not found in Bot cache' });

        const member = await guild.members.fetch(discordId).catch(() => null);
        
        if (!member) {
            return res.json({ allowed: false, rejectReason: 'NOT_IN_DISCORD' });
        }

        const { priority, isVerified } = getPriority(member);

        if (!isVerified) {
            return res.json({ allowed: false, rejectReason: 'NOT_VERIFIED' });
        }

        // Check grace
        if (grace.has(discordId)) {
            grace.delete(discordId);
            connecting.add(discordId);
            return res.json({ allowed: true, grace: true });
        }

        // Compute slots
        const activeConnecting = connecting.size;
        const availableSlots = Math.max(0, maxSlots - currentPlayers - activeConnecting);

        if (availableSlots > 0 && queue.length === 0) {
            connecting.add(discordId);
            return res.json({ allowed: true }); // Go right in
        }

        // Add to queue
        const existingIdx = queue.findIndex(q => q.discordId === discordId);
        if (existingIdx === -1) {
            queue.push({ discordId, name, priority, time: Date.now(), job: 'Civilian', grade: '' });
            fetchPlayerJob(discordId).then(jobData => {
                const target = queue.find(q => q.discordId === discordId);
                if (target && jobData) {
                    target.job = jobData.job;
                    target.grade = jobData.grade;
                }
            }).catch(console.error);
        }
        
        // Sort queue
        queue.sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority;
            return a.time - b.time;
        });

        const pos = queue.findIndex(q => q.discordId === discordId);
        
        let inFront = 'Nobody';
        if (pos > 0) {
            inFront = queue[pos - 1].name || 'Unknown';
        }
        
        return res.json({ 
            allowed: false, 
            position: pos + 1, 
            total: queue.length, 
            priority,
            inFront,
            job: queue[pos]?.job || 'Civilian',
            grade: queue[pos]?.grade || ''
        });
    });

    app.get('/api/queue/status/:discordId', (req, res) => {
        const discordId = req.params.discordId;
        
        // If they are allowed to connect
        if (connecting.has(discordId)) {
            return res.json({ allowed: true });
        }

        // Find them in queue
        const pos = queue.findIndex(q => q.discordId === discordId);
        if (pos === -1) {
            return res.json({ allowed: false, dropped: true });
        }

        let inFront = 'Nobody';
        if (pos > 0) {
            inFront = queue[pos - 1].name || 'Unknown';
        }

        return res.json({ 
            allowed: false, 
            position: pos + 1, 
            total: queue.length, 
            priority: queue[pos].priority,
            inFront,
            job: queue[pos]?.job || 'Civilian',
            grade: queue[pos]?.grade || ''
        });
    });

    app.post('/api/queue/process', (req, res) => {
        // Lua pings this to step the queue forward
        const { maxSlots, currentPlayers, framework, priorityLevels, verifiedRole } = req.body;
        
        if (framework && framework !== 'auto') {
            global.FiveMFramework = framework;
        }

        if (priorityLevels) {
            // Lowercase mapping for fault tolerance
            global.PriorityLevels = {};
            for (const [k, v] of Object.entries(priorityLevels)) {
                global.PriorityLevels[k.toLowerCase()] = v;
            }
        }
        
        if (verifiedRole) {
            global.VerifiedRole = verifiedRole;
        }
        
        const activeConnecting = connecting.size;
        const availableSlots = Math.max(0, maxSlots - currentPlayers - activeConnecting);

        if (availableSlots > 0 && queue.length > 0) {
            const toAdmit = Math.min(availableSlots, queue.length);
            for (let i = 0; i < toAdmit; i++) {
                const admitted = queue.shift();
                connecting.add(admitted.discordId);
            }
        }
        
        return res.json({ queueSize: queue.length });
    });

    app.post('/api/queue/leave', (req, res) => {
        const { discordId } = req.body;
        // They dropped from fiveM
        connecting.delete(discordId);
        
        const pos = queue.findIndex(q => q.discordId === discordId);
        if (pos !== -1) queue.splice(pos, 1);
        
        // Grant grace period
        if (process.env.QUEUE_ENABLED === 'true') {
            grace.set(discordId, Date.now() + 120000); // 2 mins
        }
        
        res.json({ success: true });
    });

    const port = process.env.QUEUE_PORT || 3012;
    app.listen(port, () => {
        console.log(`[QUEUE] Local Internal API listening on port ${port}`);
    });
}

function skipPlayer(discordId) {
    const pos = queue.findIndex(q => q.discordId === discordId);
    if (pos !== -1) {
        const player = queue.splice(pos, 1)[0];
        player.priority = 9999;
        // The queue will automatically sort itself next time someone joins or queue processes.
        // Let's force them to the exact front by manipulating the time too.
        player.time = 0; 
        queue.unshift(player);
        return true;
    }
    return false;
}

module.exports = { startQueueServer, skipPlayer };
