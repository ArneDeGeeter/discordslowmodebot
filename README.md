#Slow mode bot
This is a small bot that allows you to setup slowmodes longer than the discord cooldown allows. The cooldowns can be rolebased aswell.

##Setup
1. Install Node.js 6.0.0 or newer
2. Dependencies:
   - discord.js: `npm install discord.js`
   - Keyv: `npm install keyv`
   depending on what database you'll be using, you'll need on of the additional packages below. If you'll keep everything in memory, skip this and leave the connectionURL empty;
   ```
   npm install --save @keyv/redis
   npm install --save @keyv/mongo
   npm install --save @keyv/sqlite
   npm install --save @keyv/postgres
   npm install --save @keyv/mysql```
3. Download [the bot](./bot.js), or clone the whole git `git clone https://github.com/Dark-Xiphles/discordslowmodebot`
4. Make/change the [params.json](./params.json) file, change the token, connectionURL and prefix if wanted.
4. Run the bot `node bot.js`
5. Set up all cooldowns/administrators

##Commands
You can set your own prefix in [the config](./params.json) aswell.

`!addModeratorRole <@Role> ` Adds a role to the moderator list, this role will bypass the cooldowns, and can edit the cooldowns.

`!removeModeratorRoles` Removes all moderator role.

`!setSlowMode <time> <@Role> <#Channel>` Adds the slowmode, time should be in milliseconds.

`!clearMember <@User` Removes all cooldowns from a person.