const {Client} = require('discord.js');
// const { Client } = require('discord.js');
// const client = new Client({ ws: { intents: ['GUILDS', 'GUILD_MESSAGES'] } });
const Keyv = require('keyv');
const config = require('./params.json');
const fs = require('fs')
const regexDiscord = "(?:https?:\\/\\/)?(?:www\\.)?discord(?:\\.gg|(?:app)?\\.com\\/invite)\\/(\\S+)"
let globalPrefix = '!';
let connectionURL = "";
let token = "";
let keyv;
let channelList = [];
const client = new Client({ws: {intents: ['GUILDS', 'GUILD_MESSAGES']}});


fs.readFile('./params.json', 'utf8', async (err, jsonString) => {
    if (err) {
        console.log("Error reading file from disk:", err);
        return
    }
    try {
        const config = JSON.parse(jsonString)
        globalPrefix = config.prefix;
        connectionURL = config.connectionUrl;
        token = config.token;
        client.login(token);
        keyv = new Keyv(connectionURL);
        if (await keyv.get('channels') == null) {
            channelList = [];
        } else {

            channelList = await keyv.get('channels')
        }
        keyv.on('error', err => console.error('Keyv connection error:', err));
    } catch (err) {
        console.error('Error parsing JSON string:', err)

    }
});


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

function getFirstGroup(regexp, str) {
    return Array.from(str.matchAll(regexp), m => m[1]);
}

async function getServerOptions(guildId) {
    let serverOptions = await keyv.get(guildId);
    if (serverOptions === undefined) {
        serverOptions = {owner: -1, allowOthers: true, grantedPeople: [], lastTimePostedInChannels: []};

        let cooldownList;
        cooldownList = [];
        for (var k in channelList) {
            cooldownList.push([channelList[k], 0]);
        }
        serverOptions.lastTimePostedInChannels = cooldownList;


    }
    if (serverOptions.lastTimePostedInChannels.length !== channelList.length) {
        for (var k in channelList) {
            let contains = false;
            for (var i in serverOptions.lastTimePostedInChannels)
                if (channelList[k] === serverOptions.lastTimePostedInChannels[i][0]) {
                    contains = true;
                }
            if (!contains) {
                serverOptions.lastTimePostedInChannels.push([channelList[k], 0]);
            }
        }
    }
    return serverOptions
}

async function checkCooldown(invite, message) {

    let serverOptions = await getServerOptions(invite.guild.id);
    let isAllowedToPost = false;
    if (serverOptions.allowOthers) {
        isAllowedToPost = true;
    } else {
        if (serverOptions.owner === message.member.id) {
            isAllowedToPost = true
        } else {
            for (let i in serverOptions.allowOthers) {
                isAllowedToPost = (serverOptions.allowOthers[i] === message.member.id) || isAllowedToPost;
            }
        }
    }

    if (!isAllowedToPost) {
        message.reply("some response to be changed 2 <@136770866393513984>").then(msg => {
            msg.delete({timeout: 60000})
        });
        return;
    }
    let list = serverOptions.grantedPeople.concat(message.member.id)
    var guild = client.guilds.resolve(message.member);
    let minimumTime = Number.MAX_SAFE_INTEGER;

    for (let x in list) {
        let idUser = list[x]
        for (var channel in serverOptions.lastTimePostedInChannels) {
            if (serverOptions.lastTimePostedInChannels[channel][0] === message.channel.id) {

                let roleList = await keyv.get(message.channel.id);
                let roleMatch = false;
                for (var roleListKey in roleList) {
                    if (guild.members.cache.get(idUser)._roles.includes(roleList[roleListKey][0]) || roleList[roleListKey][0] === "default") {
                        //console.log(roleListKey + " " + cooldownListKey + " " + minimumTime + " " + roleList[roleListKey][1]);
                        if (Number(minimumTime) > Number(roleList[roleListKey][1])) {
                            minimumTime = roleList[roleListKey][1];
                            roleMatch = true;
                        }
                    }
                }

            }
        }
    }
    console.log(Number(serverOptions.lastTimePostedInChannels[channel][1]) + parseInt(minimumTime))
    console.log(parseInt(new Date().getTime()))
    if (Number(serverOptions.lastTimePostedInChannels[channel][1]) + parseInt(minimumTime) > parseInt(new Date().getTime())) {
        message.delete();
        message.reply("some response to be changed 3 <@136770866393513984>").then(msg => {
            msg.delete({timeout: 6000})
        });
    } else {
        serverOptions.lastTimePostedInChannels[channel][1] = parseInt(new Date().getTime())
    }


    await keyv.set(invite.guild.id, serverOptions)

}

client.on('guildCreate', async guild => {

        let serverOptions = await getServerOptions(guild.id);
        serverOptions.owner = guild.ownerID;
        await keyv.set(guild.id, serverOptions)
        if (client.guilds.cache.size > 1) {
            guild.leave();
        }
    }
)

client.on('message', async message => {
    if (message.content.startsWith(globalPrefix)) {
        let args = message.content.split(' ');
        if (args[0].toLowerCase() === (globalPrefix + 'setslowmode')) {
            if (args.length !== 4) {
                message.reply('Please use proper syntax: `' + globalPrefix + 'addslowmode duration(ms) @Role #Channel`');
                return;
            }
            if (args[1] <= 0) {
                message.reply('Don\'t include negative numbers.')
                return;
            }
            //region moderatorcheck
            let moderatorRoles;
            console.log(keyv)
            if (await keyv.get('moderatorRoles') == null) {
                moderatorRoles = [];
            } else {

                moderatorRoles = await keyv.get('moderatorRoles')
            }
            let hasModeratorRole = false;
            for (var k in moderatorRoles) {
                if (message.member._roles.includes(moderatorRoles[k])) {
                    hasModeratorRole = true;
                }
            }
            //endregion
            if (message.member.hasPermission('ADMINISTRATOR') || hasModeratorRole) {
                const role = message.mentions.roles.first();
                const channel = message.mentions.channels.first();
                const everyone = message.mentions.everyone;
                if ((!role && !everyone) || !channel) {
                    message.reply('Please include a channel and/or Role: `' + globalPrefix + 'addslowmode duration(ms) @Role #Channel`');
                    return;
                }
                //region roleList ini
                let roleList;
                if (await keyv.get(channel.id) == null) {
                    roleList = [];
                } else {

                    roleList = await keyv.get(channel.id);
                }
                //endregion

                let update = false;
                for (var k in roleList) {
                    if (roleList[k][0] == (role ? role.id : 'default')) {
                        roleList[k][1] = parseInt(args[1]);
                        update = true;
                    }
                }
                if (!update) {
                    roleList.push([(role ? role.id : 'default'), args[1]])
                }
                if (!channelList.includes(channel.id)) {
                    channelList.push(channel.id);
                    keyv.set('channels', channelList);
                }
                await keyv.set(channel.id, roleList);
                message.reply('Slowmode set for ' + (role ? role.id : '@ everyone') + ' in ' + channel + '. Duration: ' + args[1]);

            } else {
                message.reply('Make sure you have administrator permissions to use this command.');
            }
            return;

        }
        if (args[0].toLowerCase() === (globalPrefix + 'removemoderatorroles')) {
            if (message.member.hasPermission('ADMINISTRATOR')) {
                await keyv.set('moderatorRoles');
                message.reply('All moderatorRoles deleted.')
            } else {
                message.reply('Make sure you have administrator permissions to use this command.');
            }
            return;

        }
        if (args[0].toLowerCase() === (globalPrefix + 'addmoderatorrole')) {
            if (message.member.hasPermission('ADMINISTRATOR')) {
                const role = message.mentions.roles.first();
                if (role) {
                    let moderatorRoles;
                    if (await keyv.get('moderatorRoles') == null) {
                        moderatorRoles = [];
                    } else {

                        moderatorRoles = await keyv.get('moderatorRoles')
                    }
                    if (moderatorRoles.includes(role.id)) {
                        message.reply('Role was already added');
                    } else {
                        moderatorRoles.push(role.id);
                        await keyv.set('moderatorRoles', moderatorRoles);
                        message.reply('Role added');
                    }
                } else {
                    message.reply('Please include a role.')
                }
            } else {
                message.reply('Make sure you have administrator permissions to use this command.');
            }
            return;
        }
        if (args[0].toLowerCase() === (globalPrefix + 'clearmember')) {
            //region moderatorcheck
            let moderatorRoles;
            if (await keyv.get('moderatorRoles') == null) {
                moderatorRoles = [];
            } else {

                moderatorRoles = await keyv.get('moderatorRoles')
            }
            let hasModeratorRole = false;
            for (var k in moderatorRoles) {
                if (message.member._roles.includes(moderatorRoles[k])) {
                    hasModeratorRole = true;
                }
            }
            //endregion
            if (message.member.hasPermission('ADMINISTRATOR') || hasModeratorRole) {
                const user = message.mentions.users.first();
                if (user) {
                    await keyv.set(user.id);
                    message.reply('User cooldownList cleared')
                } else {
                    message.reply('Please mention a user')

                }
            } else {
                message.reply('Make sure you have administrator permissions to use this command.');

            }
            return;
        }
        if (args[0].toLowerCase() === (globalPrefix + 'help')) {
            message.delete();
            message.channel.send('`!addModeratorRole <@Role> ` Adds a role to the moderator list, this role will bypass the cooldowns, and can edit the cooldowns.\n'
                + '`!removeModeratorRoles` Removes all moderator role.\n'
                + '`!setSlowMode <time> <@Role> <#Channel>` Adds the slowmode, time should be in milliseconds.\n'
                + '`!clearMember <@User` Removes all cooldowns from a person.\n');
        }
        if (args[0].toLowerCase() === (globalPrefix + 'claimserver')) {
            message.delete();
            message.channel.send('Add the bot to your server by inviting it trough this link, it will just check the server owner, then leave again.\n https://discord.com/api/oauth2/authorize?client_id=482971210251108352&permissions=0&scope=bot').then(msg => {
                msg.delete({timeout: 60000})
            });
            return;
        }
        if (args[0].toLowerCase() === (globalPrefix + 'addperson')) {
            if (args.length < 3) {
                message.reply('Please use proper syntax: `' + globalPrefix + 'addPerson <serverId> <@User1> [@User2+...]`');
                return;
            }
            let serverOptions = await keyv.get(args[1]);
            if (serverOptions === undefined) {
                message.reply('Server not found, please make sure you\'ve posted the correct serverId. If the server hasn\'t been advertised before, make sure to claim ownership of the server first, using `!claimserver`.')
                return;

            }
            if (serverOptions.owner === -1) {
                message.reply('No owner has been set for this server, claim the ownership of the server following the instruction from `!claimserver`')

            } else if (message.member.id === serverOptions.owner) {
                message.mentions.users.forEach(user => serverOptions.grantedPeople.indexOf(user.id) === -1 ? serverOptions.grantedPeople.push(user.id) : 'a');
            } else {
                message.reply('Only the owner of the server can use that command, if the owner of the server has changed, follow the steps in `!claimserver` to update it.')
            }

            await keyv.set(args[1], serverOptions);

            message.delete();
            return;
        }
        if (args[0].toLowerCase() === (globalPrefix + 'togglePermission')) {
            //TODO: change to toggle perms

            let serverOptions = await keyv.get(args[1]);
            if (serverOptions === undefined) {
                message.reply('Server not found, please make sure you\'ve posted the correct serverId. If the server hasn\'t been advertised before, make sure to claim ownership of the server first, using `!claimserver`.')
                return;

            }
            if (serverOptions.owner === -1) {
                message.reply('No owner has been set for this server, claim the ownership of the server following the instruction from `!claimserver`')

            } else if (message.member.id === serverOptions.owner) {
                message.mentions.users.forEach(user => serverOptions.grantedPeople.indexOf(user.id) === -1 ? serverOptions.grantedPeople.push(user.id) : 'a');
            } else {
                message.reply('Only the owner of the server can use that command, if the owner of the server has changed, follow the steps in `!claimserver` to update it.')
            }

            await keyv.set(args[1], serverOptions);

            message.delete();
            return;
        }



        }
    // if (!('/'+globalPrefix + 'allowOtherPeople/')i.test) {
    //     message.delete();
    //     message.channel.send('Add the bot to your server by inviting it trough this link, it will just check the server owner, then leave again.\n https://discord.com/api/oauth2/authorize?client_id=482971210251108352&permissions=0&scope=bot').then(msg => {
    //         msg.delete({timeout: 60000})
    //     });
    //     return;
    // }
    //todo: channels without need toggle between needing server link or default
    if (channelList.includes(message.channel.id)) {
        let moderatorRoles;

        if (await keyv.get('moderatorRoles') == null) {
            moderatorRoles = [];
        } else {
            moderatorRoles = await keyv.get('moderatorRoles')
        }
        let hasModeratorRole = false;
        for (var k in moderatorRoles) {
            if (message.member._roles.includes(moderatorRoles[k])) {
                hasModeratorRole = true;
            }
        }
        if (message.member.hasPermission('ADMINISTRATOR') || hasModeratorRole) {
            return;
        }
        var match = getFirstGroup(regexDiscord, message.content);
        if (match.length != 1) {
            message.reply("some response to be changed <@136770866393513984>").then(msg => {
                msg.delete({timeout: 60000})
            });
            return;
        }
        client.fetchInvite(match[0])
            .then(invite => checkCooldown(invite, message))
            .catch(console.error);
        return;
//todo same as above
        let cooldownList;
        if (await keyv.get(message.member.id) == null) {
            cooldownList = [];
            for (var k in channelList) {
                cooldownList.push([channelList[k], 0]);
            }
        } else {
            cooldownList = await keyv.get(message.member.id);
            if (cooldownList.length !== channelList.length) {
                for (var k in channelList) {
                    let contains = false;
                    for (var i in cooldownList)
                        if (channelList[k] === cooldownList[i][0]) {
                            contains = true;
                        }
                    if (!contains) {
                        cooldownList.push([channelList[k], 0]);
                    }
                }
            }
            await keyv.set(message.member.id, cooldownList);
        }
        for (var cooldownListKey in cooldownList) {

            if (cooldownList[cooldownListKey][0] == message.channel.id) {
                if (Number(cooldownList[cooldownListKey][1]) < Number(new Date().getTime())) {
                    let roleList = await keyv.get(message.channel.id);
                    let minimumTime = Number.MAX_SAFE_INTEGER;
                    let roleMatch = false;
                    for (var roleListKey in roleList) {
                        if (message.member._roles.includes(roleList[roleListKey][0]) || roleList[roleListKey][0] === "default") {
                            console.log(roleListKey + " " + cooldownListKey + " " + minimumTime + " " + roleList[roleListKey][1]);
                            if (Number(minimumTime) > Number(roleList[roleListKey][1])) {
                                minimumTime = roleList[roleListKey][1];
                                roleMatch = true;
                            }
                        }
                    }
                    if (roleMatch) {
                        cooldownList[cooldownListKey][1] = parseInt(minimumTime) + parseInt(new Date().getTime());
                        await keyv.set(message.member.id, cooldownList);
                    }
                } else {
                    message.delete();
                    let time = Math.floor((cooldownList[cooldownListKey][1] - new Date().getTime()) / 60000);
                    message.reply('The next time you can post is in ' + ((time == 0) ? (Math.floor((cooldownList[cooldownListKey][1] - new Date().getTime()) / 1000) + 1) + ' seconds' : Math.floor(time / 60) + ' hours, ' + time % 60 + ' minutes.')).then(msg => {
                        msg.delete(60000)
                    });
                }
            }
        }


    }
});

