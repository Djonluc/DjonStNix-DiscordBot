/**
 * Ensures a role exists in the guild, creating it if it doesn't.
 * @param {import('discord.js').Guild} guild 
 * @param {string} roleName 
 * @returns {Promise<import('discord.js').Role>} The found or created role
 */
async function getOrCreateRole(guild, roleName) {
    let role = guild.roles.cache.find(r => r.name === roleName);
    
    if (!role) {
        try {
            console.log(`[INFO] Role "${roleName}" not found. Creating it...`);
            role = await guild.roles.create({
                name: roleName,
                reason: 'Auto-created by DjonStNix Verification Bot',
                color: roleName === 'Verified' ? 0x00FF00 : 0xFFD700 // Green for Verified, Gold for Whitelisted
            });
        } catch (error) {
            console.error(`[ERROR] Failed to create role "${roleName}": ${error.message}`);
            throw error;
        }
    }
    
    return role;
}

module.exports = { getOrCreateRole };
