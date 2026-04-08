//dont question how its formatted I used a beautifier
//made by wmnd

require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    InteractionType,
} = require('discord.js');
const {
    banPlayer,
    unbanPlayer,
    getBanStatus,
    getRobloxUser,
    getGameName
} = require('./utils');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const red = 0xed4245;
const green = 0x57f287;
const grey = 0x2b2d31;
const pendingactions = new Map();

function hasmod(member) {
    const roleid = process.env.roleId;
    if (!roleid) return true;
    return member.roles.cache.has(roleid);
}

function parseduration(str) {
    if (!str || str.toLowerCase() === 'perm' || str.toLowerCase() === 'permanent') return null;
    const match = str.match(/^(\d+)(s|m|h|d|w)$/i);
    if (!match) return undefined;
    const [, num, unit] = match;
    const multipliers = {
        s: 1,
        m: 60,
        h: 3600,
        d: 86400,
        w: 604800
    };
    return parseInt(num) * multipliers[unit.toLowerCase()];
}

function formatseconds(secs) {
    if (!secs) return 'Permanent';
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    return parts.join(' ') || '< 1m';
}

function friendlyerror(msg) {
    if (msg && msg.includes('RESOURCE_EXHAUSTED')) {
        return 'Too many requests for this user. Please try again in a minute or so.';
    }
    return msg;
}

function errembed(desc) {
    return new EmbedBuilder().setColor(red).setTitle('Error').setDescription(desc).setTimestamp();
}

function userfields(userinfo) {
    return [{
        name: 'Username',
        value: `[\`${userinfo.username}\`](${userinfo.profileurl})`,
        inline: true
    }, {
        name: 'Display Name',
        value: `\`${userinfo.displayname}\``,
        inline: true
    }, {
        name: 'User ID',
        value: `\`${userinfo.userid}\``,
        inline: true
    }, ];
}

function confirmembed(action, userinfo, duration, reason) {
    const durationtext = duration === null ? 'Permanent' : formatseconds(duration);
    const color = action === 'unban' ? green : red;
    const title = action === 'unban' ? 'Confirm Unban' : action === 'tempban' ? 'Confirm Temp Ban' : 'Confirm Permanent Ban';
    const embed = new EmbedBuilder().setColor(color).setTitle(title).setThumbnail(userinfo.avatar).addFields(...userfields(userinfo)).setTimestamp();
    if (action !== 'unban') {
        embed.addFields({
            name: 'Duration',
            value: durationtext,
            inline: true
        }, {
            name: 'Reason',
            value: reason || 'No reason provided.',
            inline: true
        }, );
    }
    return embed;
}

function confirmrow(id) {
    return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`confirm_${id}`).setLabel('Confirm').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId(`cancel_${id}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary), );
}

const commands = [
    new SlashCommandBuilder().setName('tempban').setDescription('Temporarily ban a player.').addStringOption(o => o.setName('user').setDescription('Username or User ID').setRequired(true)).addStringOption(o => o.setName('duration').setDescription('Duration e.g. 7d, 24h, 30m').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason for the ban').setRequired(false)),
    new SlashCommandBuilder().setName('permban').setDescription('Permanently ban a player.').addStringOption(o => o.setName('user').setDescription('Username or User ID').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason for the ban').setRequired(false)),
    new SlashCommandBuilder().setName('unban').setDescription('Unban a player.').addStringOption(o => o.setName('user').setDescription('Username or User ID').setRequired(true)),
    new SlashCommandBuilder().setName('check').setDescription('Check the ban status of a player.').addStringOption(o => o.setName('user').setDescription('Username or User ID').setRequired(true)),
];

async function registercmds() {
    const rest = new REST({
        version: '10'
    }).setToken(process.env.token);
    const appid = (await client.application.fetch()).id;
    await rest.put(Routes.applicationCommands(appid), {
        body: commands.map(c => c.toJSON())
    });
}

client.on('interactionCreate', async (interaction) => {
    if (interaction.type === InteractionType.ApplicationCommand) {
        const {
            commandName,
            member
        } = interaction;

        if (['tempban', 'permban', 'unban'].includes(commandName)) {
            if (!hasmod(member)) {
                return interaction.reply({
                    embeds: [errembed('You do not have permission to use this command.')],
                    ephemeral: true,
                });
            }
        }

        if (commandName === 'tempban' || commandName === 'permban') {
            const target = interaction.options.getString('user');
            const reason = interaction.options.getString('reason') || 'No reason provided.';
            let durationsecs = null;
            if (commandName === 'tempban') {
                const durationstr = interaction.options.getString('duration');
                durationsecs = parseduration(durationstr);
                if (durationsecs === undefined) {
                    return interaction.reply({
                        embeds: [errembed('Invalid duration format. Use `7d`, `24h`, `30m`, etc.')],
                        ephemeral: true,
                    });
                }
            }
            await interaction.deferReply();
            try {
                const userinfo = await getRobloxUser(target);
                const banstatus = await getBanStatus(userinfo.userid);
                const isbanned = banstatus?.gameJoinRestriction?.active === true;
                if (isbanned) {
                    const restriction = banstatus.gameJoinRestriction;
                    const expiry = restriction.endTime ? `<t:${Math.floor(new Date(restriction.endTime).getTime() / 1000)}:R>` : 'Never (Permanent)';
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder().setColor(grey).setTitle('Already Banned').setThumbnail(userinfo.avatar).addFields(...userfields(userinfo), {
                                name: 'Reason',
                                value: restriction.privateReason || restriction.displayReason || 'N/A',
                                inline: false
                            }, {
                                name: 'Expires',
                                value: expiry,
                                inline: true
                            }, ).setTimestamp(),
                        ],
                    });
                }
                const id = `${interaction.id}`;
                pendingactions.set(id, {
                    action: commandName,
                    userinfo,
                    durationsecs,
                    reason
                });
                setTimeout(() => pendingactions.delete(id), 60_000);
                await interaction.editReply({
                    embeds: [confirmembed(commandName, userinfo, durationsecs, reason)],
                    components: [confirmrow(id)],
                });
            } catch (err) {
                await interaction.editReply({
                    embeds: [errembed(friendlyerror(err.message))]
                });
            }
        }

        if (commandName === 'unban') {
            const target = interaction.options.getString('user');
            await interaction.deferReply();
            try {
                const userinfo = await getRobloxUser(target);
                const banstatus = await getBanStatus(userinfo.userid);
                const isbanned = banstatus?.gameJoinRestriction?.active === true;
                if (!isbanned) {
                    return interaction.editReply({
                        embeds: [errembed(`\`${userinfo.username}\` is not currently banned.`)],
                    });
                }
                const id = `${interaction.id}`;
                pendingactions.set(id, {
                    action: 'unban',
                    userinfo
                });
                setTimeout(() => pendingactions.delete(id), 60_000);
                await interaction.editReply({
                    embeds: [confirmembed('unban', userinfo, null, null)],
                    components: [confirmrow(id)],
                });
            } catch (err) {
                await interaction.editReply({
                    embeds: [errembed(friendlyerror(err.message))]
                });
            }
        }

        if (commandName === 'check') {
            const target = interaction.options.getString('user');
            await interaction.deferReply();
            try {
                const userinfo = await getRobloxUser(target);
                const banstatus = await getBanStatus(userinfo.userid);
                const isbanned = banstatus?.gameJoinRestriction?.active === true;
                if (isbanned) {
                    const restriction = banstatus.gameJoinRestriction;
                    const expiry = restriction.endTime ? `<t:${Math.floor(new Date(restriction.endTime).getTime() / 1000)}:R>` : 'Never (Permanent)';
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder().setColor(red).setTitle('Ban Status').setThumbnail(userinfo.avatar).addFields(...userfields(userinfo), {
                                name: 'Status',
                                value: 'Banned',
                                inline: true
                            }, {
                                name: 'Expires',
                                value: expiry,
                                inline: true
                            }, {
                                name: 'Reason',
                                value: restriction.privateReason || restriction.displayReason || 'N/A',
                                inline: false
                            }, ).setTimestamp(),
                        ],
                    });
                } else {
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder().setColor(green).setTitle('Ban Status').setThumbnail(userinfo.avatar).addFields(...userfields(userinfo), {
                                name: 'Status',
                                value: 'Not Banned',
                                inline: true
                            }, ).setTimestamp(),
                        ],
                    });
                }
            } catch (err) {
                await interaction.editReply({
                    embeds: [errembed(friendlyerror(err.message))]
                });
            }
        }
    }

    if (interaction.isButton()) {
        const parts = interaction.customId.split('_');
        const action = parts[0];
        const id = parts[1];
        const pending = pendingactions.get(id);
        if (!pending) {
            return interaction.reply({
                embeds: [errembed('This confirmation has expired. Please run the command again.')],
                ephemeral: true,
            });
        }
        if (action === 'cancel') {
            pendingactions.delete(id);
            return interaction.update({
                embeds: [
                    new EmbedBuilder().setColor(grey).setTitle('Cancelled').setDescription('No action was taken.').setTimestamp(),
                ],
                components: [],
            });
        }
        if (action === 'confirm') {
            pendingactions.delete(id);
            await interaction.deferUpdate();
            try {
                if (pending.action === 'unban') {
                    await unbanPlayer(pending.userinfo.userid);
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder().setColor(green).setTitle('Player Unbanned').setThumbnail(pending.userinfo.avatar).addFields(...userfields(pending.userinfo)).setTimestamp(),
                        ],
                        components: [],
                    });
                } else {
                    await banPlayer(pending.userinfo.userid, pending.reason, pending.action === 'permban' ? null : pending.durationsecs, );
                    const durationtext = pending.durationsecs === null ? 'Permanent' : formatseconds(pending.durationsecs);
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder().setColor(red).setTitle('Player Banned').setThumbnail(pending.userinfo.avatar).addFields(...userfields(pending.userinfo), {
                                name: 'Duration',
                                value: durationtext,
                                inline: true
                            }, {
                                name: 'Reason',
                                value: pending.reason,
                                inline: true
                            }, ).setTimestamp(),
                        ],
                        components: [],
                    });
                }
            } catch (err) {
                await interaction.editReply({
                    embeds: [errembed(friendlyerror(err.message))],
                    components: [],
                });
            }
        }
    }
});

client.once('ready', async () => {
    const universeid = process.env.universeId;
    const gamename = await getGameName(universeid);
    const guilds = client.guilds.cache.size;
    const line = '─'.repeat(42);
    console.log(line);
    console.log(`  Bot       ${client.user.tag}`);
    console.log(`  Bot ID    ${client.user.id}`);
    console.log(`  Servers   ${guilds}`);
    console.log(`  Game      ${gamename || 'Unknown'}`);
    console.log(`  Universe  ${universeid}`);
    console.log(line);

    await registercmds();

    console.log(`  Commands  registered`);
    console.log(line);

    client.user.setActivity(`Managing ${gamename}`, {
        type: 1
    });
});

client.login(process.env.token);