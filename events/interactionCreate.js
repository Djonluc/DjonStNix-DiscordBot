const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { createEmbed, COLORS } = require('../utils/embeds');
const db = require('../utils/database');

// Ticket category labels
const TICKET_CATEGORIES = {
    'ticket_open_general': '📋 General Support',
    'ticket_open_billing': '💰 Billing / Economy',
    'ticket_open_report': '🛡️ Player Report'
};

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		// 1. SLASH COMMANDS
		// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        } 
        
		// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		// 2. MODAL SUBMISSIONS (Applications)
		// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'application_modal') {
                const charName = interaction.fields.getTextInputValue('char_name');
                const age = interaction.fields.getTextInputValue('age');
                const background = interaction.fields.getTextInputValue('background');

                const ackEmbed = createEmbed({
                    title: '✅ Application Submitted',
                    description: 'Your application has been securely transmitted to the Elite Staff. You will be notified of their decision soon.',
                    color: COLORS.GREEN
                });
                await interaction.reply({ embeds: [ackEmbed], ephemeral: true });

                const staffChannelId = process.env.APP_CHANNEL_ID || process.env.LOG_CHANNEL_ID;
                if (!staffChannelId) return;
                const staffChannel = interaction.client.channels.cache.get(staffChannelId);

                const reviewEmbed = createEmbed({
                    title: '📝 New Whitelist Application',
                    description: `An application has been submitted by **${interaction.user.tag}** (\`${interaction.user.id}\`)`,
                    color: COLORS.BLUE,
                    fields: [
                        { name: 'Character Name', value: charName, inline: true },
                        { name: 'Age', value: age, inline: true },
                        { name: 'Background Story', value: background, inline: false }
                    ]
                });

                const approveBtn = new ButtonBuilder()
                    .setCustomId(`app_approve_${interaction.user.id}`)
                    .setLabel('Approve')
                    .setStyle(ButtonStyle.Success);

                const denyBtn = new ButtonBuilder()
                    .setCustomId(`app_deny_${interaction.user.id}`)
                    .setLabel('Deny')
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(approveBtn, denyBtn);

                if (staffChannel) {
                    await staffChannel.send({ embeds: [reviewEmbed], components: [row] });
                }
            }
        }

		// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
		// 3. BUTTON INTERACTIONS
		// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        else if (interaction.isButton()) {

            // ── APPLICATION APPROVE / DENY ──
            if (interaction.customId.startsWith('app_approve_') || interaction.customId.startsWith('app_deny_')) {
                const isApprove = interaction.customId.startsWith('app_approve_');
                const targetUserId = interaction.customId.split('_')[2];

                const adminRoleIds = (process.env.ADMIN_ROLES || '').split(',');
                const hasAdminAccess = interaction.member.roles.cache.some(r => adminRoleIds.includes(r.id)) || 
                                       interaction.member.permissions.has('Administrator');
                
                if (!hasAdminAccess) {
                    return await interaction.reply({ content: 'You do not have permission to review applications.', ephemeral: true });
                }

                const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
                originalEmbed.setColor(isApprove ? COLORS.GREEN : COLORS.RED);
                originalEmbed.addFields({ name: 'Decision', value: `${isApprove ? '🟢 APPROVED' : '🔴 DENIED'} by ${interaction.user.tag}`, inline: false });
                
                await interaction.update({ embeds: [originalEmbed], components: [] });

                try {
                    const targetUser = await interaction.client.users.fetch(targetUserId);
                    const guild = interaction.guild;
                    
                    if (isApprove) {
                        const whitelistRoleName = process.env.WHITELIST_ROLE_NAME || 'Whitelisted';
                        const role = guild.roles.cache.find(r => r.name === whitelistRoleName);
                        const member = await guild.members.fetch(targetUserId);
                        
                        if (role && member) {
                            await member.roles.add(role);
                        }

                        const dmEmbed = createEmbed({
                            title: '🎉 Application Approved!',
                            description: `Congratulations! Your application for **${guild.name}** has been approved.\n\nYou now have the **Whitelisted** role and can connect to the server.`,
                            color: COLORS.GOLD,
                            fields: [
                                { name: '━━━ How to Connect ━━━', value: '\u200b', inline: false },
                                { name: 'Step 1', value: 'Open FiveM and search for our server name, or use Direct Connect.', inline: false },
                                { name: 'Step 2', value: 'The server will automatically detect your Whitelisted role and let you in.', inline: false },
                                { name: 'Step 3 (Optional)', value: 'Use `/link` in Discord, then `/linkdiscord [code]` in-game to enable economy features like `/balance` and `/pay`.', inline: false }
                            ]
                        });
                        await targetUser.send({ embeds: [dmEmbed] }).catch(()=> {});

                        await db.query('INSERT IGNORE INTO djon_discord_apps (discord_id, app_type, app_data, status, reviewed_by) VALUES (?, ?, ?, ?, ?)', [
                            targetUserId, 'whitelist', '{}', 'approved', interaction.user.id
                        ]).catch(e => console.error(e));

                    } else {
                        const dmEmbed = createEmbed({
                            title: '❌ Application Denied',
                            description: `Unfortunately, your recent application for **${guild.name}** was denied at this time. You may re-apply in the future.`,
                            color: COLORS.RED
                        });
                        await targetUser.send({ embeds: [dmEmbed] }).catch(()=> {});

                        await db.query('INSERT IGNORE INTO djon_discord_apps (discord_id, app_type, app_data, status, reviewed_by) VALUES (?, ?, ?, ?, ?)', [
                            targetUserId, 'whitelist', '{}', 'denied', interaction.user.id
                        ]).catch(e => console.error(e));
                    }
                } catch (e) {
                    console.error('[APP BUTTON ERROR]', e);
                }
            }

            // ── TICKET OPEN ──
            else if (interaction.customId.startsWith('ticket_open_')) {
                const category = TICKET_CATEGORIES[interaction.customId] || 'General Support';
                const guild = interaction.guild;
                const member = interaction.member;

                // Check if they already have an open ticket
                const existingTicket = guild.channels.cache.find(
                    c => c.name === `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}` && c.type === ChannelType.GuildText
                );

                if (existingTicket) {
                    return await interaction.reply({ content: `You already have an open ticket: ${existingTicket}`, ephemeral: true });
                }

                await interaction.deferReply({ ephemeral: true });

                try {
                    // Find or use the ticket category
                    const ticketCategoryId = process.env.TICKET_CATEGORY_ID;
                    const sanitizedName = member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');

                    // Create the private ticket channel
                    const ticketChannel = await guild.channels.create({
                        name: `ticket-${sanitizedName}`,
                        type: ChannelType.GuildText,
                        parent: ticketCategoryId || null,
                        permissionOverwrites: [
                            {
                                id: guild.id,
                                deny: [PermissionFlagsBits.ViewChannel]
                            },
                            {
                                id: member.id,
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
                            },
                            // Allow all admin roles to see the ticket
                            ...(process.env.ADMIN_ROLES || '').split(',').filter(Boolean).map(roleId => ({
                                id: roleId,
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages]
                            }))
                        ],
                        topic: `${category} | Opened by ${member.user.tag} | ${new Date().toISOString()}`
                    });

                    // Post the ticket info embed inside the new channel
                    const ticketEmbed = createEmbed({
                        title: `🎫 ${category}`,
                        description: `Hello ${member}! A staff member will be with you shortly.\n\nPlease describe your issue in detail below.`,
                        color: COLORS.GOLD,
                        fields: [
                            { name: 'Opened By', value: member.user.tag, inline: true },
                            { name: 'Category', value: category, inline: true },
                            { name: 'Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                        ]
                    });

                    const closeBtn = new ButtonBuilder()
                        .setCustomId('ticket_close')
                        .setLabel('🔒 Close Ticket')
                        .setStyle(ButtonStyle.Danger);

                    const closeRow = new ActionRowBuilder().addComponents(closeBtn);

                    await ticketChannel.send({ content: `${member} | Staff will be notified.`, embeds: [ticketEmbed], components: [closeRow] });

                    await interaction.editReply({ content: `Your ticket has been created: ${ticketChannel}` });

                    // Notify staff in logs
                    const logChannelId = process.env.LOG_CHANNEL_ID;
                    if (logChannelId) {
                        const logChannel = guild.channels.cache.get(logChannelId);
                        if (logChannel) {
                            const logEmbed = createEmbed({
                                title: '🎫 New Ticket Opened',
                                description: `**${member.user.tag}** opened a ticket: ${ticketChannel}`,
                                color: COLORS.BLUE,
                                fields: [
                                    { name: 'Category', value: category, inline: true }
                                ]
                            });
                            await logChannel.send({ embeds: [logEmbed] });
                        }
                    }

                } catch (error) {
                    console.error('[TICKET ERROR]', error);
                    await interaction.editReply({ content: 'Failed to create ticket. Make sure the bot has Manage Channels permission.' });
                }
            }

            // ── TICKET CLOSE ──
            else if (interaction.customId === 'ticket_close') {
                const channel = interaction.channel;

                // Only staff or the ticket creator can close
                const adminRoleIds = (process.env.ADMIN_ROLES || '').split(',');
                const isStaff = interaction.member.roles.cache.some(r => adminRoleIds.includes(r.id)) || 
                                interaction.member.permissions.has('Administrator');
                const isTicketOwner = channel.name.includes(interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, ''));

                if (!isStaff && !isTicketOwner) {
                    return await interaction.reply({ content: 'You do not have permission to close this ticket.', ephemeral: true });
                }

                // Collect transcript
                const messages = await channel.messages.fetch({ limit: 100 });
                const transcript = messages
                    .reverse()
                    .map(m => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content || '(embed/attachment)'}`)
                    .join('\n');

                const closedEmbed = createEmbed({
                    title: '🔒 Ticket Closed',
                    description: `This ticket was closed by **${interaction.user.tag}**.`,
                    color: COLORS.RED,
                    fields: [
                        { name: 'Messages Logged', value: `${messages.size}`, inline: true },
                        { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    ]
                });

                await interaction.reply({ embeds: [closedEmbed] });

                // Log to staff channel
                const logChannelId = process.env.LOG_CHANNEL_ID;
                if (logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(logChannelId);
                    if (logChannel) {
                        const logEmbed = createEmbed({
                            title: '🔒 Ticket Closed',
                            description: `**${channel.name}** was closed by ${interaction.user.tag}.`,
                            color: COLORS.RED,
                            fields: [
                                { name: 'Messages', value: `${messages.size}`, inline: true }
                            ]
                        });

                        // Attach transcript as a file
                        const transcriptBuffer = Buffer.from(transcript, 'utf8');
                        await logChannel.send({ 
                            embeds: [logEmbed], 
                            files: [{ attachment: transcriptBuffer, name: `transcript-${channel.name}.txt` }] 
                        });
                    }
                }

                // Delete the channel after a short delay
                setTimeout(async () => {
                    try {
                        await channel.delete('Ticket closed');
                    } catch (e) {
                        console.error('[TICKET DELETE ERROR]', e);
                    }
                }, 5000);
            }

            // ── REACTION ROLES (Toggle) ──
            else if (interaction.customId.startsWith('rr_')) {
                const roleId = interaction.customId.replace('rr_', '');
                const member = interaction.member;
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) {
                    return await interaction.reply({ content: 'This role no longer exists.', ephemeral: true });
                }

                try {
                    if (member.roles.cache.has(roleId)) {
                        await member.roles.remove(roleId);
                        const removeEmbed = createEmbed({
                            title: '🏷️ Role Removed',
                            description: `The **${role.name}** role has been removed.`,
                            color: COLORS.RED
                        });
                        await interaction.reply({ embeds: [removeEmbed], ephemeral: true });
                    } else {
                        await member.roles.add(roleId);
                        const addEmbed = createEmbed({
                            title: '🏷️ Role Added',
                            description: `You now have the **${role.name}** role!`,
                            color: COLORS.GREEN
                        });
                        await interaction.reply({ embeds: [addEmbed], ephemeral: true });
                    }
                } catch (e) {
                    await interaction.reply({ content: 'Failed to update role. The bot may not have permission.', ephemeral: true });
                }
            }

            // ── GIVEAWAY ENTRY ──
            else if (interaction.customId === 'giveaway_enter') {
                // Access the active giveaways from the giveaway command module
                let activeGiveaways;
                try {
                    activeGiveaways = require('../commands/giveaway').activeGiveaways;
                } catch (e) {
                    return await interaction.reply({ content: 'Giveaway system error.', ephemeral: true });
                }

                const giveaway = activeGiveaways.get(interaction.message.id);

                if (!giveaway) {
                    return await interaction.reply({ content: 'This giveaway has already ended.', ephemeral: true });
                }

                if (giveaway.entries.has(interaction.user.id)) {
                    giveaway.entries.delete(interaction.user.id);
                    await interaction.reply({ content: `❌ You have left the giveaway. (${giveaway.entries.size} entries)`, ephemeral: true });
                } else {
                    giveaway.entries.add(interaction.user.id);
                    const entryEmbed = createEmbed({
                        title: '🎉 Entry Confirmed!',
                        description: `You have entered the giveaway for **${giveaway.prize}**!\n\n🎫 Total entries: **${giveaway.entries.size}**\n⏰ Ends: <t:${giveaway.endTime}:R>`,
                        color: COLORS.GREEN
                    });
                    await interaction.reply({ embeds: [entryEmbed], ephemeral: true });
                }
            }
        }
	},
};

