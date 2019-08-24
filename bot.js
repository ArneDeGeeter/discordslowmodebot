const Discord = require('discord.js');
const Keyv = require('keyv');
const config = require('./params.json');
const fs = require('fs')
let globalPrefix = '!';
let connectionURL = "";
let token = "";
let keyv;
let channelList = [];
const client = new Discord.Client();
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

client.on('message', async message => {

    if (message.content.startsWith(globalPrefix + 'setSlowMode')) {
        const args = message.content.split(' ');
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
            if (!role || !channel) {
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
                if (roleList[k][0] == role.id) {
                    roleList[k][1] = parseInt(args[1]);
                    update = true;
                }
            }
            if (!update) {
                roleList.push([role.id, args[1]])
            }
            if (!channelList.includes(channel.id)) {
                channelList.push(channel.id);
                keyv.set('channels', channelList);
            }
            await keyv.set(channel.id, roleList);
            console.log(await keyv.get(channel.id));
            message.reply('Slowmode set for ' + role + ' in ' + channel + '. Duration: ' + args[1]);

        } else {
            message.reply('Make sure you have administrator permissions to use this command.');
        }
        return;
    }
    if (message.content.startsWith(globalPrefix + 'removeModeratorRoles')) {
        if (message.member.hasPermission('ADMINISTRATOR')) {
            await keyv.set('moderatorRoles');
            message.reply('All moderatorRoles deleted.')
        } else {
            message.reply('Make sure you have administrator permissions to use this command.');
        }
        return;
    }
    if (message.content.startsWith(globalPrefix + 'addModeratorRole')) {
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
    if (message.content.startsWith(globalPrefix + 'clearMember')) {
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
        let cooldownList;
        if (await keyv.get(message.member.id) == null) {
            cooldownList = [];
            for (var k in channelList) {
                cooldownList.push([channelList[k], 0]);
            }
        } else {
            cooldownList = await keyv.get(message.member.id);
        }
        for (var k in cooldownList) {

            if (cooldownList[k][0] == message.channel.id) {
                if (cooldownList[k][1] < new Date().getTime()) {
                    let roleList = await keyv.get(message.channel.id);
                    let minimumTime = Number.MAX_SAFE_INTEGER;
                    for (var i in roleList) {
                        if (message.member._roles.includes(roleList[i][0])) {
                            if (minimumTime > roleList[i][1]) {
                                minimumTime = roleList[i][1];

                            }
                        }
                    }
                    cooldownList[k][1] = parseInt(minimumTime) + parseInt(new Date().getTime());
                    await keyv.set(message.member.id, cooldownList);
                    console.log(parseInt(minimumTime) + parseInt(new Date().getTime()));
                } else {
                    message.delete();
                    let time = Math.floor((cooldownList[k][1] - new Date().getTime()) / 60000);
                    message.reply('The next time you can post is in ' + Math.floor(time / 60) + ' hours, ' + time % 60 + ' minutes.')
                }
            }
        }


    }
});

