const Discord = require('discord.js');
const Keyv = require('keyv');
const config = require('./params.json');
const fs = require('fs')
let globalPrefix = '!';
let connectionURL = "";
let token = "";
let keyv;
const client = new Discord.Client();
fs.readFile('./params.json', 'utf8', (err, jsonString) => {
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
        keyv.on('error', err => console.error('Keyv connection error:', err));
    } catch (err) {
        console.error('Error parsing JSON string:', err)

    }
})


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async message => {
    if (message.content.startsWith('clear')) {
        await keyv.clear();
    }
    if(message.contetn.startsWith('!clearModeratorRole')){
        if (message.member.hasPermission('ADMINISTRATOR')) {
            keyv.set('moderatorRoles');
            message.reply('All moderatorRoles deleted.')
        } else {
            message.reply('Make sure you have administrator permissions to use this command.');
        }
        return;
    }
    if (message.content.startsWith('!addModeratorRole')) {
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
            }
        } else {
            message.reply('Make sure you have administrator permissions to use this command.');
        }
        return;
    }


    if (message.content === 'ping') {
        message.channel.send("pong");
    }
});

