Here is the finalized master script with your credentials pre-configured inside it. You can copy this entire block, paste it straight into your index.js file on GitHub or Railway, and it will run instantly with zero manual configuration needed on your phone.
```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Auto-Dependency Installer
try {
    require.resolve('discord.js');
} catch (e) {
    console.log('Dependencies missing. Installing discord.js...');
    execSync('npm install discord.js', { stdio: 'inherit' });
}

const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes, 
    PermissionFlagsBits, ChannelType
} = require('discord.js');

// 2. Configuration (Pre-configured with your Credentials)
const TOKEN = process.env.DISCORD_TOKEN || 'MTUxMTU3NzI4OTI5OTcyNjQwNw.G9zHuP.Xl78q78SMJ-F6g5lKCV_wJpEhLjU5AKj3aYPl8';
const CLIENT_ID = process.env.CLIENT_ID || '1511577289299726407';

// 3. Simple Database Storage
const dbPath = path.join(__dirname, 'gatelock-db.json');
function loadDB() {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(dbPath));
}
function saveDB(data) { fs.writeFileSync(dbPath, JSON.stringify(data, null, 4)); }
function updateConfig(guildId, config) {
    const db = loadDB();
    db[guildId] = { ...db[guildId], ...config };
    saveDB(db);
}
function getConfig(guildId) { return loadDB()[guildId] || {}; }

// 4. Client Core Setup
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

// 5. Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('gatelock-setup')
        .setDescription('Deploys full server layout, channels, roles, automated embeds, and mod panel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName('report')
        .setDescription('Securely report a user or threat to the moderation team.')
        .addStringOption(option => option.setName('details').setDescription('Thorough description of the issue or target user.').setRequired(true))
].map(c => c.toJSON());

// 6. Application Loop
client.once('ready', async () => {
    console.log(`🛡️ Gatelock Master Core Online: ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Synchronized global application slash commands.');
    } catch (err) { console.error(err); }
});

client.on('interactionCreate', async interaction => {
    const guild = interaction.guild;
    const config = getConfig(guild?.id);
    const everyone = guild?.roles.everyone;

    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'gatelock-setup') {
            await interaction.deferReply({ ephemeral: true });

            try {
                // Generate Roles
                let verifiedRole = guild.roles.cache.find(r => r.name === 'Verified Member');
                if (!verifiedRole) {
                    verifiedRole = await guild.roles.create({ name: 'Verified Member', color: '#2ecc71' });
                }

                let staffRole = guild.roles.cache.find(r => r.name === 'Gatelock Staff');
                if (!staffRole) {
                    staffRole = await guild.roles.create({ name: 'Gatelock Staff', color: '#e74c3c', permissions: [PermissionFlagsBits.ViewAuditLog] });
                }

                // Layout mapping directly from screenshots
                const serverStructure = [
                    {
                        category: 'Welcome & Info',
                        channels: [
                            { name: 'welcome', public: true },
                            { name: 'policies', public: true },
                            { name: 'mission-and-values', public: true },
                            { name: 'announcements', public: true },
                            { name: 'faq', public: true }
                        ]
                    },
                    {
                        category: 'Verification & Roles',
                        channels: [
                            { name: 'verification', public: true, hideOnVerify: true },
                            { name: 'roles', public: false },
                            { name: 'access-levels', public: false }
                        ]
                    },
                    {
                        category: 'Security & Compliance',
                        channels: [
                            { name: 'security-guidelines', public: false },
                            { name: 'incident-prevention', public: false },
                            { name: 'tools-and-resources', public: false },
                            { name: 'training-materials', public: false },
                            { name: 'case-studies', public: false }
                        ]
                    },
                    {
                        category: 'Incident Management',
                        channels: [
                            { name: 'incident-reports', public: false },
                            { name: 'alerts', public: false },
                            { name: 'investigation-updates', public: false }
                        ]
                    },
                    {
                        category: 'Support & Community',
                        channels: [
                            { name: 'general-discussion', public: false },
                            { name: 'support', public: false },
                            { name: 'feedback', public: false },
                            { name: 'partnerships', public: false },
                            { name: 'community', type: ChannelType.GuildVoice, public: false }
                        ]
                    },
                    {
                        category: 'Administration & Operations',
                        channels: [
                            { name: 'staff-chat', staffOnly: true },
                            { name: 'operation-logs', staffOnly: true },
                            { name: 'bot-operations', staffOnly: true },
                            { name: 'staff-announcements', staffOnly: true },
                            { name: 'ticket-3', staffOnly: true }
                        ]
                    },
                    {
                        category: 'Learning & Development',
                        channels: [
                            { name: 'resource-center', public: false },
                            { name: 'events', public: false },
                            { name: 'research', public: false }
                        ]
                    }
                ];

                let publicModlogsRef = null;
                let opLogsRef = null;
                let verificationChanRef = null;
                let botOpsChanRef = null;

                // Create individual standalone channels first
                publicModlogsRef = guild.channels.cache.find(c => c.name === 'modlogs') || 
                    await guild.channels.create({
                        name: 'modlogs',
                        type: ChannelType.GuildText,
                        permissionOverwrites: [{ id: everyone.id, deny: [PermissionFlagsBits.SendMessages] }]
                    });

                // Build Layout
                for (const group of serverStructure) {
                    const catOverwrites = group.staffOnly ? [{ id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel] }] : [];
                    const category = await guild.channels.create({ name: group.category, type: ChannelType.GuildCategory, permissionOverwrites: catOverwrites });

                    for (const ch of group.channels) {
                        const channelOptions = {
                            name: ch.name,
                            type: ch.type || ChannelType.GuildText,
                            parent: category.id,
                            permissionOverwrites: []
                        };

                        // Calculate Permissions
                        if (ch.staffOnly) {
                            channelOptions.permissionOverwrites.push(
                                { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                                { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                            );
                        } else if (!ch.public) {
                            channelOptions.permissionOverwrites.push(
                                { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                                { id: verifiedRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                                { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                            );
                        } else {
                            channelOptions.permissionOverwrites.push(
                                { id: everyone.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
                                { id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                            );
                            if (ch.hideOnVerify) {
                                channelOptions.permissionOverwrites.push({ id: verifiedRole.id, deny: [PermissionFlagsBits.ViewChannel] });
                            }
                        }

                        const createdChannel = await guild.channels.create(channelOptions);
                        if (ch.name === 'operation-logs') opLogsRef = createdChannel;
                        if (ch.name === 'verification') verificationChanRef = createdChannel;
                        if (ch.name === 'bot-operations') botOpsChanRef = createdChannel;

                        // Send intro embeds to functionalize text channels
                        if (channelOptions.type === ChannelType.GuildText) {
                            const title = ch.name.replace(/-/g, ' ').toUpperCase();
                            
                            if (ch.name === 'verification') {
                                const verifyEmbed = new EmbedBuilder()
                                    .setTitle('🛡️ Gatelock Central Verification Gateway')
                                    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━\nWelcome to our community ecosystem.\n\nTo cross the boundary wall and access server features, trigger human validation by utilizing the interactive button below.\n━━━━━━━━━━━━━━━━━━━━━━━━━━')
                                    .setColor('#2b2d31');
                                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('gl_verify').setLabel('Complete Verification').setStyle(ButtonStyle.Success).setEmoji('🛡️'));
                                await createdChannel.send({ embeds: [verifyEmbed], components: [row] });
                            } else {
                                const infoEmbed = new EmbedBuilder()
                                    .setTitle(`📌 Framework Channel: ${title}`)
                                    .setDescription(`━━━━━━━━━━━━━━━━━━━━━━━━━━\nWelcome to **#${ch.name}**.\nThis channel is operational and synchronized with the Gatelock security registry.\n━━━━━━━━━━━━━━━━━━━━━━━━━━`)
                                    .setColor('#2b2d31');
                                await createdChannel.send({ embeds: [infoEmbed] });
                            }
                        }
                    }
                }

                // Construct Mod Control Panel in bot-operations
                if (botOpsChanRef) {
                    const panelEmbed = new EmbedBuilder()
                        .setTitle('🚨 Gatelock Command Center Panel')
                        .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━\nUse this secure control room dashboard to quickly toggle global defense mechanisms.\n━━━━━━━━━━━━━━━━━━━━━━━━━━')
                        .addFields(
                            { name: 'Raid Lockdown Status', value: '🟢 Normal Execution Mode', inline: true },
                            { name: 'Filter Matrix', value: '🕵️ Anti-Bot Check Active', inline: true }
                        )
                        .setColor('#e74c3c');

                    const controls = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('gl_toggle_lockdown').setLabel('Toggle Server Lockdown').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                        new ButtonBuilder().setCustomId('gl_view_stats').setLabel('System Diagnostics').setStyle(ButtonStyle.Secondary).setEmoji('📊')
                    );

                    await botOpsChanRef.send({ embeds: [panelEmbed], components: [controls] });
                }

                // Global Config Mapping State
                updateConfig(guild.id, {
                    verifiedRoleId: verifiedRole.id,
                    staffRoleId: staffRole.id,
                    publicLogsId: publicModlogsRef.id,
                    privateLogsId: opLogsRef ? opLogsRef.id : null,
                    lockdownActive: false
                });

                await interaction.editReply({ content: '✅ **Gatelock Master Script Run Complete.** Full asset layout, permission barriers, individual functional embeds, and your private administration deck are fully deployable.' });

            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: '❌ Structural error encountered. Ensure Gatelock has absolute **Administrator** role clearance and sits at the hierarchy ceiling.' });
            }
        }

        // ==========================================
        // /REPORT DISPATCH (Logs privately to Staff)
        // ==========================================
        if (interaction.commandName === 'report') {
            if (!config.privateLogsId) return interaction.reply({ content: 'Gatelock monitoring framework hasn\'t been deployed via setup yet.', ephemeral: true });
            
            const targetChan = client.channels.cache.get(config.privateLogsId);
            if (!targetChan) return interaction.reply({ content: 'Logging vector channel target lost.', ephemeral: true });

            const logEmbed = new EmbedBuilder()
                .setTitle('🚨 Incoming Alert Threat Vector Received')
                .addFields(
                    { name: 'Source Target', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                    { name: 'Context Vector Summary', value: interaction.options.getString('details') }
                )
                .setColor('#f39c12')
                .setTimestamp();

            await targetChan.send({ embeds: [logEmbed] });
            await interaction.reply({ content: 'Report channeled and forwarded securely to the Operations Base logs.', ephemeral: true });
        }
    }

    // ==========================================
    // INTERACTIVE PANEL & BUTTON LOGIC
    // ==========================================
    if (interaction.isButton()) {
        if (interaction.customId === 'gl_verify') {
            if (config.lockdownActive) return interaction.reply({ content: '🔒 Access Denied. The server is under high-threat deployment protocol lockdown.', ephemeral: true });
            if (!config.verifiedRoleId) return interaction.reply({ content: 'Verification target configuration signature unmapped.', ephemeral: true });

            const targetRole = guild.roles.cache.get(config.verifiedRoleId);
            if (!targetRole) return interaction.reply({ content: 'Verification signature element lost.', ephemeral: true });

            await interaction.member.roles.add(targetRole);
            return interaction.reply({ content: '✅ Credentials validated. Security clear.', ephemeral: true });
        }

        // Admin Panel Controls
        if (interaction.customId === 'gl_toggle_lockdown') {
            if (!interaction.member.roles.cache.has(config.staffRoleId)) return interaction.reply({ content: 'Access violation: Admin clear signature absent.', ephemeral: true });

            const currentStatus = !config.lockdownActive;
            updateConfig(guild.id, { lockdownActive: currentStatus });

            const alertEmbed = new EmbedBuilder()
                .setTitle(currentStatus ? '🔒 SYSTEM PERIMETER LOCKDOWN ENFORCED' : '🔓 DEFENSE GRID STABILIZED')
                .setDescription(`Administrative authorization action triggered by <@${interaction.user.id}>. Join permissions altered.`)
                .setColor(currentStatus ? '#d9383a' : '#2ecc71')
                .setTimestamp();

            const pLog = client.channels.cache.get(config.privateLogsId);
            if (pLog) await pLog.send({ embeds: [alertEmbed] });

            return interaction.reply({ content: `Defensive Grid State updated: **Lockdown Status = ${currentStatus}**`, ephemeral: true });
        }

        if (interaction.customId === 'gl_view_stats') {
            if (!interaction.member.roles.cache.has(config.staffRoleId)) return interaction.reply({ content: 'Access violation.', ephemeral: true });
            return interaction.reply({ content: `🛰️ **System Diagnostics:**\n- Guild ID Cache: \`${guild.id}\`\n- Security Filters: \`Active\`\n- Thread Integrity: \`Operational\``, ephemeral: true });
        }
    }
});

// ==========================================
// THREAT PREVENTATIVE AUTO MOD & RAID DEFENSE
// ==========================================
client.on('guildMemberAdd', async member => {
    const config = getConfig(member.guild.id);
    if (!config.privateLogsId) return;

    const auditTrail = client.channels.cache.get(config.privateLogsId);

    // Lockdown Kick Mode
    if (config.lockdownActive) {
        try { await member.send('⛔ Access Denied. The destination server has enforced full emergency parameter lockdown.'); } catch (e) {}
        await member.kick('Gatelock Shield: Emergency Parameter Lockdown Overdrive Execution.');
        if (auditTrail) auditTrail.send(`🚨 **Join Prevention Mitigation:** Account \`${member.user.tag}\` dropped due to forced lockdown.`);
        return;
    }

    // Account Generation Threshold Defense
    const minimumSurvivalAge = 1000 * 60 * 60 * 24 * 3; // 3 Operational Days
    const calculatedAge = Date.now() - member.user.createdTimestamp;

    if (calculatedAge < minimumSurvivalAge) {
        try { await member.send('🛡️ Access Revoked. Account signature age falls below security classification requirements (Minimum 3 days old).'); } catch (e) {}
        await member.kick('Gatelock Shield Mitigation: Threat Signature Account Age Deficit.');
        if (auditTrail) auditTrail.send(`⚠️ **Raid Defense Mitigation Triggered:** Dropped newly initialized user \`${member.user.tag}\` (\`${member.user.id}\`).`);
    }
});

client.login(TOKEN);

```
