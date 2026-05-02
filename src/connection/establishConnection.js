const rustrcon = require('rustrcon');
const { globalConfig: config, loadServerConfigs } = require('../utils/configLoader');
const discord = require('discord.js');
const chalk = require('chalk');
const fs = require('fs');
const canvas = require('canvas');
canvas.registerFont('OpenSans-ExtraBold.ttf', { family: 'Sans' , weight: 'bold' });
const fetch = require('node-fetch');
const sqlite3 = require('sqlite3');
const moment = require('moment');
const { REST } = require('@discordjs/rest');
const { readdirSync } = require("fs");
const { Routes } = require('discord-api-types/v10');
let db = new sqlite3.Database('./src/database/database.sqlite3', (err) => {
    if(err) return console.log(err);
});

let servers = [];
let specialIdArray = [];
let botTokenArray = [];
let globalStatus = [];
let awaitingResponses = [];

//#region Player profiler
if(config.PLAYER_PROFILER.ENABLED) {
    const profilerClient = new discord.Client({intents: [discord.GatewayIntentBits.Guilds, discord.GatewayIntentBits.GuildMembers, discord.GatewayIntentBits.GuildEmojisAndStickers, discord.GatewayIntentBits.GuildIntegrations, discord.GatewayIntentBits.GuildWebhooks, discord.GatewayIntentBits.GuildInvites, discord.GatewayIntentBits.GuildVoiceStates, discord.GatewayIntentBits.GuildPresences, discord.GatewayIntentBits.GuildMessages, discord.GatewayIntentBits.GuildMessageReactions, discord.GatewayIntentBits.GuildMessageTyping, discord.GatewayIntentBits.DirectMessages, discord.GatewayIntentBits.DirectMessageReactions, discord.GatewayIntentBits.DirectMessageTyping, discord.GatewayIntentBits.MessageContent], shards: "auto", partials: [discord.Partials.Message, discord.Partials.Channel, discord.Partials.GuildMember, discord.Partials.Reaction, discord.Partials.GuildScheduledEvent, discord.Partials.User, discord.Partials.ThreadMember]});
    profilerClient.commands = new discord.Collection()
    const rest = new REST({ version: '10' }).setToken(config.PLAYER_PROFILER.BOT_TOKEN);
    
    const commands = [];
    readdirSync('./src/commands').forEach(async file => {        
        const command = require(`../commands/${file}`);
        commands.push(command.data.toJSON());
        profilerClient.commands.set(command.data.name, command);
    });
    
    profilerClient.on('ready', async () => {
        try {
            await rest.put(
                Routes.applicationGuildCommands(profilerClient.user.id, config.DISCORD_SERVER_ID),
                { body: commands },
            );
        } catch (error) {
            console.error(error);
        }
    
        console.log(`(${chalk.magenta("PLAYER PROFILER")}) => 💚 [ ${chalk.green(profilerClient.user.tag)} ] has successfully linked with the player profiler`);
    
        if(config.PLAYER_PROFILER.GLOBAL_LEADERBOARD.ENABLED) {
            globalLeaderboard(profilerClient);
        }
    });

    profilerClient.on('interactionCreate', async (interaction) => {
        let client = interaction.client;
   	    if(interaction.type != 2) return;
   	    if(interaction.user.bot) return;
	    try {
            const command = client.commands.get(interaction.commandName)
            command.run(client, interaction)
	    } catch {
	        interaction.reply({content: "There was an error while processing the command.", ephemeral: true})
	    }
    });
    
    profilerClient.login(config.PLAYER_PROFILER.BOT_TOKEN);
}
//#endregion

//#region Server Array Creation
loadServerConfigs().forEach(serverContents => {
    if(!serverContents.SERVER_ENABLED) return console.log(`Not loading ${serverContents.SERVER_SHORTNAME} because it is disabled`);
    if(!serverContents.BOT_TOKEN) return console.log(`You have not provided a bot token for me to use for server (${serverContents.SERVER_SHORTNAME})`);
    if(!serverContents.SERVER_IP) return console.log(`You have not provided a server IP for me to use for server (${serverContents.SERVER_SHORTNAME})`);
    if(!serverContents.RCON_PASS) return console.log(`You have not provided a server Password for me to use for server (${serverContents.SERVER_SHORTNAME})`);
    if(!serverContents.RCON_PORT) return console.log(`You have not provided a server Port for me to use for server (${serverContents.SERVER_SHORTNAME})`);
    if(specialIdArray.find(x => x == serverContents.SERVER_SPECIAL_ID)) return console.log(`Not loading ${serverContents.SERVER_SHORTNAME} because it shares the same server special ID's as another one of your servers`);
    if(botTokenArray.find(x => x == serverContents.BOT_TOKEN)) return console.log(`Not loading ${serverContents.SERVER_SHORTNAME} because it shares the same bot token as another one of your servers`);
    specialIdArray.push(serverContents.SERVER_SPECIAL_ID);
    botTokenArray.push(serverContents.BOT_TOKEN);
    servers.push(serverContents);
});
//#endregion

if(servers.length > 0 && config.GLOBAL_POP_BOT.ENABLED) runGlobalBot();

//#region Create Servers
servers.forEach((server, index) => {
    db.serialize(() => {
        db.get(`select * from server_logs where server_id = ?;`, [server.SERVER_SPECIAL_ID], function(err, row) {
            if(err) {
                console.log(err);
                return;
            }
            if(row) return;
            db.run(`insert into server_logs(server_id, current_players, peak_players, last_wipe) values (?,?,?,?);`, [server.SERVER_SPECIAL_ID, 0, 0, 0], function(err) {
                if(err) console.log(err);
            });
        });
    });

    let rconIp = server.SERVER_IP;
    if(server.SERVER_IP.includes(":")) rconIp = rconIp.slice(":")[0];

    const client = new discord.Client({intents: [discord.GatewayIntentBits.Guilds, discord.GatewayIntentBits.GuildMembers, discord.GatewayIntentBits.GuildEmojisAndStickers, discord.GatewayIntentBits.GuildIntegrations, discord.GatewayIntentBits.GuildWebhooks, discord.GatewayIntentBits.GuildInvites, discord.GatewayIntentBits.GuildVoiceStates, discord.GatewayIntentBits.GuildPresences, discord.GatewayIntentBits.GuildMessages, discord.GatewayIntentBits.GuildMessageReactions, discord.GatewayIntentBits.GuildMessageTyping, discord.GatewayIntentBits.DirectMessages, discord.GatewayIntentBits.DirectMessageReactions, discord.GatewayIntentBits.DirectMessageTyping, discord.GatewayIntentBits.MessageContent], shards: "auto", partials: [discord.Partials.Message, discord.Partials.Channel, discord.Partials.GuildMember, discord.Partials.Reaction, discord.Partials.GuildScheduledEvent, discord.Partials.User, discord.Partials.ThreadMember]});

    let rcon = new rustrcon.Client({
        ip: rconIp,
        port: server.RCON_PORT,
        password: server.RCON_PASS
    });

    server.connected = false;
    server.checkServerStatus = null;
    let wipeObject = { serverSeed: "", serverSize: "", wipeDate: "" };
    let messagesArray = [];

    //#region Rcon hooks
    rcon.on('connected', () => {
        console.log(`💚 Successfully connected to ${chalk.green(server.SERVER_SHORTNAME)}`);

        server.checkServerStatus = setInterval(() => {
            try {
                rcon.send("serverinfo", "advrcon", 101);
            } catch(err) {
                console.log(err);
            }
        }, 10000);

        checkForWipeInfo()
        function checkForWipeInfo() {
            try {
                rcon.send("worldsize", "advrcon", 103);
                rcon.send("seed", "advrcon", 104);
                rcon.send("serverinfo", "advrcon", 105);
            } catch (err) {
                setTimeout(() => 5000);
                checkForWipeInfo();
            }
        }
    });

    rcon.on('disconnect', () => {
        if(server.checkServerStatus != undefined && server.checkServerStatus != null) clearInterval(server.checkServerStatus);
        if(server.connected) {
            server.connected = false;
            if(server.SERVER_ONLINE_OFFLINE.ENABLED) handleOfflineMessage(server);
            console.log(`❤️ Dropped connection to ${chalk.red(server.SERVER_SHORTNAME)}`)
        } else {
            console.log(`💛 Failed to connect to ${chalk.yellow(server.SERVER_SHORTNAME)}`);
        }

        client.user.setPresence({ activities: [{ name: `${server.USE_POP_AS_A_BOT_STATUS.OPTIONS.SERVER_OFFLINE_MESSAGE}`, type: discord.ActivityType.Watching }], status: "dnd" });

        setTimeout(() => {
            runConnection();
        }, 30000);
    });

    rcon.on('error', err => {
        console.log(`❤️ Encountered an error while tring to connect to ${chalk.red(`${rcon.ws.ip}:${rcon.ws.port}`)}\n--------- [ ${chalk.red("ERROR")} ] ---------\n${err.message}\n-----------------------------`);
    });

    let re = /7656119([0-9]{10})/gm;
    let lastMessage;
     rcon.on('message', async(message) => {
        let messageContent = message.content;
        let messageIdentifier = message.Identifier;
        let messageChannel = messageContent.Channel;    

        if(lastMessage == messageContent) return;
        else lastMessage = messageContent;

        if(messageIdentifier == 101) {
            if(server.connected == false) {
                server.connected = true;
                rcon.send("status", "advrcon", 102);
                if(server.SERVER_ONLINE_OFFLINE.ENABLED) handleOnlineMessage(server);
            } else {
                let popObject = { playersOnline: message.content.Players, maxPlayers: message.content.MaxPlayers, queuedPlayers: message.content.Queued, joiningPlayers: message.content.Joining, wipedAt: message.content.SaveCreatedTime, fps: message.content.Framerate, lastWipe: message.content.SaveCreatedTime};

                globalStatus[index] = { playersOnline: message.content.Players, playersQueued: message.content.Queued, playersJoining: message.content.Joining, maxPlayers: message.content.MaxPlayers };
                updateServerStatus(popObject, server);
                if(server.USE_POP_AS_A_BOT_STATUS.ENABLED) handlePopDisplay(popObject, server, servers, index).then(res => client.user.setPresence(res));
                if(server.DYNAMIC_MAXPLAYERS_CHANGER.ENABLED) handlePopChanged(popObject, server).then(res => {
                    if(!res.commandNeeded) return;
                    rcon.send(`server.maxplayers ${res.newPop}`);
    
                    if(server.DYNAMIC_MAXPLAYERS_CHANGER.LOGGING.ENABLED) {
                        let hook = new discord.WebhookClient({ url: server.DYNAMIC_MAXPLAYERS_CHANGER.LOGGING.LOG_WEBHOOK });
                        let newPopText = `🌟 **POP CHANGER**: Max players has been changed from **${message.content.MaxPlayers} -> ${res.newPop}**`;
                        if(server.DYNAMIC_MAXPLAYERS_CHANGER.LOGGING.SIMPLE_FORMATTING) sendSimpleMessage(newPopText, hook);
                        else sendFancyMessage(newPopText, server.DYNAMIC_MAXPLAYERS_CHANGER.LOGGING.EMBED_COLOR, "POP CHANGED", hook);
                    }
                });
            }
        } else if(messageIdentifier == 102) {
            let steamIds = messageContent.match(re);
            if(steamIds == null) return;

            steamIds.forEach((player, index) => {
                setTimeout(async () => {
                    addPlayerData(player, server);
                }, 2000 * index);
            });
        } else if(messageIdentifier == 103) {
            wipeObject.serverSize = messageContent.split(": ")[1];
            var didWipe = await checkWipe(wipeObject, server);
            if(didWipe) wipeObject = { serverSeed: "", serverSize: "", wipeDate: "" };
        } else if(messageIdentifier == 104) {
            wipeObject.serverSeed = messageContent.split(": ")[1];
            var didWipe = await checkWipe(wipeObject, server);
            if(didWipe) wipeObject = { serverSeed: "", serverSize: "", wipeDate: "" };
        } else if(messageIdentifier == 105) {
              const wipedAt = messageContent.SaveCreatedTime;
              wipeObject.wipeDate = false;
              console.log(`${Date.parse(wipedAt + 'Z') + (Number(".10") * 3600000)}` + ` ${Date.now()}`);
              if (Date.parse(wipedAt + 'Z') + (Number(".10") * 3600000) > Date.now()) wipeObject.wipeDate = true;
              var didWipe = await checkWipe(wipeObject, server);
              if(didWipe) wipeObject = { serverSeed: "", serverSize: "", wipeDate: "" };
        } else {
            if(messageIdentifier > 1000) {
                
                let awaitedReply = awaitingResponses.find(x => x.specialid == messageIdentifier);
                if (awaitedReply == undefined) return;
            
                let channel = client.channels.cache.get(awaitedReply.channelid);
            
                try {
                    let discordMessage = await channel.messages.fetch(awaitedReply.messageid);
            
                    if (typeof messageContent == "object") {
                        messageContent = JSON.stringify(messageContent);
                    }
                        
                    if (discordMessage != undefined) {
                        discordMessage.reply(messageContent);
                    }
                } catch (error) {
                    console.error("Error fetching message:", error);
                }
                
                awaitingResponses.splice(awaitingResponses.indexOf(x => x.specialIdArray == messageIdentifier));
            } else {
                switch(message.Type) {
                    case "Chat":
                        handleChatMessage(messageContent, messageChannel, server, rcon);
                        break;
                    case "Report":
                        if(server.SERVER_LOGGING.F7_REPORT_LOGGING.ENABLED) handleF7Report(messageContent, server);
                        break;
                }
        
                if(typeof messageContent != 'object') {
                    // Yes, I realize a switch statement could be used here, but for checking identifier etc* it's more logical for else if's
                    let lowercaseMessageContent = messageContent.toLowerCase();
                    if(messageIdentifier == 0) {
                        if(messageContent.includes("[ServerVar] giving") && server.SERVER_LOGGING.F1_SPAWN_ITEM_LOGS.ENABLED) handleF1Logs(messageContent, server);
        
                        else if (!server.SERVER_LOGGING.SERVER_JOIN_LOGS.USE_PLUGIN_JOIN_LOGS && (lowercaseMessageContent.includes("joined") || lowercaseMessageContent.includes("has connected to the server") || lowercaseMessageContent.includes("with steamid"))) {
                            let steamId = messageContent.match(re);
                            if(steamId != null) {
                                await addPlayerData(steamId[0], server).then(response => {
                                    if(response) {
                                        handlePlayerJoining(response, server);
                                        if(config.PLAYER_PROFILER.ENABLED && config.PLAYER_PROFILER.WATCHLIST.ENABLED) checkWatchlist(response);
                                        if(!response.checker_whitelisted) handleBanCheck(response, server);
                                    }
                                });
                            }
        
                        } else if (!server.SERVER_LOGGING.SERVER_LEAVE_LOGS.USE_PLUGIN_LEAVE_LOGS && lowercaseMessageContent.includes("disconnecting:")) {
                            let steamId = messageContent.match(re);
                            if(steamId != null) {
                                await addPlayerData(steamId[0], server).then(response => {
                                    if(response) {
                                        handlePlayerLeaving(response, server);
                                    }
                                });
                            }
        
                        } else 
                        
                            
                        if(messageContent.includes("[PrivateMessages]") && server.SERVER_LOGGING.PRIVATE_MESSAGES.ENABLED) {
        
                            let hook = new discord.WebhookClient({ url: server.SERVER_LOGGING.PRIVATE_MESSAGES.LOG_WEBHOOK });
                            let matches = messageContent.replace("[PrivateMessages] ","").match(/^(.*?) messaged (.*?): (.*)/);
                            var message = "";
                            if (matches != null && matches.length == 4) {
                                message = `🤫 **${matches[1]}** messaged **${matches[2]}**: ${matches[3]}`;
                            } else {
                                message = `🤫 ${messageContent.replace("[PrivateMessages] ","")}`;
                            }
                                                     
                            if(server.SERVER_LOGGING.PRIVATE_MESSAGES.SIMPLE_FORMATTING) sendSimpleMessage(message, hook);
                            else sendFancyMessage(message, server.SERVER_LOGGING.PRIVATE_MESSAGES.EMBED_COLOR, "Private Message", hook);
        
                        } else if(messageContent.toLowerCase().includes("was killed by") && (!messageContent.toLowerCase().includes("was killed by suicide") || server.SERVER_LOGGING.KILL_LOGS.INCLUDE_SUICIDES)  && !server.SERVER_LOGGING.KILL_LOGS.USE_PLUGIN_KILL_LOGS) {
                            let steamIds = messageContent.match(re);
                            if(steamIds != undefined && steamIds != null && steamIds.length == 2) addKill(steamIds[1], steamIds[0], server);
                            if(server.SERVER_LOGGING.KILL_LOGS.ENABLED) {
                                if((steamIds.length < 2 && !server.SERVER_LOGGING.KILL_LOGS.INCLUDE_NPCS) || (steamIds.length == 2 && (!steamIds[1].includes("765611") || !steamIds[0].includes("765611")) && !server.SERVER_LOGGING.KILL_LOGS.INCLUDE_NPCS)) return; 
                                let sortItOut2 = /\[(.*?)\]\s*([\w\s'’`~!@#$%^&*()-+=\\|{}\[\];:'",<.>/?]+?)\[(\d+)\/(\d+)\]\s+(?:no team|was killed by)?\s+\[(.*?)\]\s*([\w\s'’`~!@#$%^&*()-+=\\|{}\[\];:'",<.>/?]+?)\[(\d+)\/(\d+)\]\s+at\s+\((-?\d+\.\d+),\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\)/;
                                const match = messageContent.match(sortItOut2);
                                if (match) {
                                  const result = [    
                                    match[1],
                                    match[2], 
                                    match[3] ? match[3] : 'No ID Found', 
                                    match[4],
                                    match[5],
                                    match[6], 
                                    match[7] ? match[7] : 'No ID Found',
                                    match[8],
                                    match[9],
                                    match[10], 
                                    match[11], 
                                  ];
                                    handleKillLogs(true, result, server);
                                } else {
                                     handleKillLogs(false, messageContent, server);
                                };
                            }
                        } else if(messageContent.includes("[UltimateRconPlus]") && server["USING UR PLUS PLUGIN"]) {
        
                            let splitContent = messageContent.split("[UltimateRconPlus] ")[1];
                            let index = splitContent.indexOf(':');
                            let [logType, logJson] = [splitContent.slice(0, index), splitContent.slice(index + 1)];
                            switch(logType) {
                                case "DEATHMESSAGE":
                                    if(server.SERVER_LOGGING.KILL_LOGS.ENABLED && server.SERVER_LOGGING.KILL_LOGS.USE_PLUGIN_KILL_LOGS) handleKillMessage(JSON.parse(logJson), server);
                                    break;
                                case "ENTITYSPAWNED":
                                    if(server.PLUGIN_ONLY_LOGGING.EVENT_SPAWNS.ENABLED) handleEventMessage(JSON.parse(logJson), server);
                                    break;
                                case "PERMCHANGED":
                                    if(server.PLUGIN_ONLY_LOGGING.PERM_CHANGES.ENABLED) handlePermMessage(JSON.parse(logJson), server);
                                    break;
                                case "FEEDBACK":
                                    if(server.PLUGIN_ONLY_LOGGING.FEEDBACK_LOGGING.ENABLED) handleFeedback(JSON.parse(logJson), server);
                                    break;
                                case "CONNECT":
                                    if(server.SERVER_LOGGING.SERVER_JOIN_LOGS.USE_PLUGIN_JOIN_LOGS) {
                                        logJson = JSON.parse(logJson);
                                        await addPlayerData(logJson.SteamId, server).then(response => {
                                            if(response) {
                                                handlePlayerJoining(response, server);
                                                if(config.PLAYER_PROFILER.ENABLED && config.PLAYER_PROFILER.WATCHLIST.ENABLED) checkWatchlist(response);
                                                if(!response.checker_whitelisted) handleBanCheck(response, server);
                                            }
                                        });
                                    }
                                    break;
                                case "DISCONNECT":
                                    if(server.SERVER_LOGGING.SERVER_LEAVE_LOGS.USE_PLUGIN_LEAVE_LOGS) {
                                        logJson = JSON.parse(logJson);
                                        await addPlayerData(logJson.SteamId, server).then(response => {
                                            if(response) {
                                                handlePlayerLeaving(response, server, logJson.Reason);
                                            }
                                        });
                                    }
                                    break;
                            }
        
                        }
                    }
                }

                if(server.RCON_SETTINGS.RCON_MESSAGE_LOGS.ENABLED) {
                    let newMessage = messageContent;
                    let messageLength = server.RCON_SETTINGS.RCON_MESSAGE_LOGS.SIMPLE_FORMATTING ? 1950 : 3950 / server.RCON_SETTINGS.RCON_MESSAGE_LOGS.MESSAGE_CHUNKING_COUNT;
                    let totalMessageLength = server.RCON_SETTINGS.RCON_MESSAGE_LOGS.SIMPLE_FORMATTING ? 1950 : 3950;
    
                    if(typeof newMessage == "object") newMessage = JSON.stringify(newMessage);
    
                    if(!server.RCON_SETTINGS.RCON_MESSAGE_LOGS.DONT_SEND_RCON_MESSAGES_THAT_INCLUDE.find(x => newMessage.includes(x))) {
                        if(newMessage.length > messageLength) messagesArray.push("```" + newMessage.slice(messageLength) + "```");
                        else messagesArray.push("```" + newMessage + "```");
    
                        let combinedMessages = messagesArray.join("");
                        if(messagesArray.length >= server.RCON_SETTINGS.RCON_MESSAGE_LOGS.MESSAGE_CHUNKING_COUNT) {
                            if(combinedMessages.length > totalMessageLength) combinedMessages.slice(totalMessageLength);
    
                            let hook = new discord.WebhookClient({ url: server.RCON_SETTINGS.RCON_MESSAGE_LOGS.LOG_WEBHOOK });
                            if(server.RCON_SETTINGS.RCON_MESSAGE_LOGS.SIMPLE_FORMATTING) sendSimpleMessage(combinedMessages, hook);
                            else sendFancyMessage(combinedMessages, server.RCON_SETTINGS.RCON_MESSAGE_LOGS.EMBED_COLOR, "RCON MESSAGE", hook);
    
                            messagesArray = [];
                        }
                    }
                }
            }
        }
    });

    function runConnection() {
        console.log(`💜 Attempting a connection to ${chalk.magenta(server.SERVER_SHORTNAME)}`);
        rcon.login();
    }
    //#endregion

    //#region Bot Hooks
    client.once('ready', async () => {
        console.log(`(${chalk.magenta(index+1)}/${chalk.blue(servers.length)} | BOT) => 💛 [ ${chalk.yellow(client.user.tag)} ] is online!`);
        runConnection();
        if(server.LEADERBOARD.ENABLED) leaderboard(server, client);
        if(server.SERVER_STATUS_PAGE.ENABLED) serverStatusPage(server, client);

        // Clear all guild slash commands for this server bot (removes any previously registered commands)
        try {
            const serverBotRest = new REST({ version: '10' }).setToken(server.BOT_TOKEN);
            await serverBotRest.put(
                Routes.applicationGuildCommands(client.user.id, config.DISCORD_SERVER_ID),
                { body: [] }
            );
        } catch (err) {
            console.error(`Failed to clear slash commands for ${server.SERVER_SHORTNAME}:`, err);
        }
    });

    client.on('messageCreate', message => {
        if(message.author.bot) return;
        let isCommand = message.content.split(server.RCON_SETTINGS.RCON_COMMANDS.COMMAND_PREFIX)[1];
        
        if(server.RCON_SETTINGS.RCON_COMMANDS.ENABLED && isCommand) {
            if(server.RCON_SETTINGS.RCON_COMMANDS.STAFF_ROLES.find(x => message.member.roles.cache.has(x)) && server.RCON_SETTINGS.RCON_COMMANDS.COMMAND_CHANNEL_IDS.find(x => message.channel.id == x)) {
                try {
                    let randomNumber = Math.trunc(getRandomInt(1001, 1000000));
                    rcon.send(`${isCommand}`, "urplus", randomNumber); 
                    message.react('✅');

                    awaitingResponses.push({ channelid: message.channel.id, messageid: message.id, specialid: randomNumber });
                } catch(err) { message.react('❌'); };
            } else {
                let commandName = isCommand.split(" ")[0];
                if(commandName == undefined) return;
    
                let foundCommand = server.RCON_SETTINGS.RCON_COMMANDS.CUSTOM_COMMANDS.COMMANDS.find(x => x.COMMAND_NAME == commandName);
                if(foundCommand && foundCommand != undefined) {
                    if((!foundCommand.REQUIRE_ROLE || (foundCommand.REQUIRE_ROLE && foundCommand.COMMAND_ROLE_PERMS.find(x => message.member.roles.cache.has(x)))) && foundCommand.COMMAND_CHANNEL_IDS.find(x => message.channel.id == x)) {
                        try {
                            let randomNumber = Math.trunc(getRandomInt(1001, 1000000));
                            rcon.send(`${isCommand}`, "urplus", randomNumber); 
                            message.react('✅');
    
                            awaitingResponses.push({ channelid: message.channel.id, messageid: message.id, specialid: randomNumber });
                        } catch(err) { message.react('❌'); };
                    } else message.react('❌');
                }
            }
        } else if(isCommand == undefined && server.CHAT_LOGS.DISCORD_TO_INGAME_MESSAGES.ENABLED && server.CHAT_LOGS.DISCORD_TO_INGAME_MESSAGES.CHAT_CHANNEL_IDS.find(x => message.channel.id == x)) {
            if(!server.CHAT_LOGS.DISCORD_TO_INGAME_MESSAGES.REQUIRE_ROLES_TO_SEND_MESSAGES || (server.CHAT_LOGS.DISCORD_TO_INGAME_MESSAGES.REQUIRE_ROLES_TO_SEND_MESSAGES && server.CHAT_LOGS.DISCORD_TO_INGAME_MESSAGES.REQUIRED_ROLES.find(x => message.member.roles.cache.has(x)))) {
                let messageFormat = server.CHAT_LOGS.DISCORD_TO_INGAME_MESSAGES.MESSAGE_FORMAT;
                console.log(message.author.displayName);
                console.log(message.member.nickname);
                messageFormat = messageFormat.replace(/{user}/gi, message.member.nickname != null ? message.member.nickname : message.member.displayName);
                try {
                    rcon.send(`say ${messageFormat} ${message.content}`);
                    message.react('✅');
                } catch(err) {
                    message.react('❌');
                }
            }
        }
    });

    client.on('interactionCreate', interaction => {
        if(!interaction.isButton()) return;
        if(interaction.user.bot) return;

        switch(interaction.customId) {
            case "kdr":
                buttonLeaderboard(interaction.customId, server, interaction)
                break;
            case "deaths":
                buttonLeaderboard(interaction.customId, server, interaction)
                break;
            case "lifetime":
                buttonLeaderboard(interaction.customId, server, interaction)
                break;
            case "wipe":
                buttonLeaderboard(interaction.customId, server, interaction)
                break;
        }
    });

    client.login(server.BOT_TOKEN);
    //#endregion
});
//#endregion

//#region Methods
function handleKillLogs(regexed, killArray, server) {
    const hook = new discord.WebhookClient({ url: server.SERVER_LOGGING.KILL_LOGS.LOG_WEBHOOK });
    let description;

    if(regexed) description = `💀 &&${killArray[1]} ( ${killArray[2]} / [${killArray[3]}](<https://steamcommunity.com/profiles/${killArray[3]}/>) ) has been killed by  ${killArray[5]} ( ${killArray[6]} / [${killArray[7]}](<https://steamcommunity.com/profiles/${killArray[7]}/>) )`;
    else {
        if(killArray.includes("at (")) {
            killArray = killArray.split("at (");
            killArray = killArray[0];
        }
        description = `💀 ${killArray}`;
    }

    if(server.SERVER_LOGGING.KILL_LOGS.SIMPLE_FORMATTING) sendSimpleMessage(description, hook);
    else sendFancyMessage(description, server.SERVER_LOGGING.KILL_LOGS.EMBED_COLOR, "PLAYER KILLED", hook);
}

async function handleF7Report(f7Object, server) {
    let reportedPlayer = await addReport(f7Object.TargetId, server);
    let reporterPlayer = await addPlayerData(f7Object.PlayerId, server);

    console.log(f7Object);

    if(reportedPlayer.ignore_f7_against || reporterPlayer.ignore_f7_from || !server.SERVER_LOGGING.F7_REPORT_LOGGING.ENABLED) return;
    let hook = new discord.WebhookClient({ url: server.SERVER_LOGGING.F7_REPORT_LOGGING.LOG_WEBHOOK });

    let simpleMessage = `🚨 **[${f7Object.PlayerName}](<${reporterPlayer.profile_url}>)** has reported **[${f7Object.TargetName}](<https://steamcommunity.com/profiles/${f7Object.TargetId}>)**`+" ``"+`(${reportedPlayer == undefined ? "??" : reportedPlayer.report_count+1} total reports)`+"`` for ``"+ `${f7Object.Subject}: ${f7Object.Message}` +"``";
    let fancyMessage = `**Reporter:** [${f7Object.PlayerName}](<${reporterPlayer.profile_url}>)\n**Reported:** [${f7Object.TargetName}](<https://steamcommunity.com/profiles/${f7Object.TargetId}>)\n**Reason**: ${f7Object.Type}\n\n**${f7Object.Subject}**`+"```"+f7Object.Message+"```";

    if(server.SERVER_LOGGING.F7_REPORT_LOGGING.SIMPLE_FORMATTING) sendSimpleMessage(simpleMessage, hook);
    sendFancyMessage(fancyMessage, server.SERVER_LOGGING.F7_REPORT_LOGGING.EMBED_COLOR, "PLAYER REPORTED", hook, { name: `${f7Object.TargetName} has been reported` });
}

function checkWatchlist(playerObject) {
    if(playerObject.watchlist) {
        let hook = new discord.WebhookClient({ url: config.PLAYER_PROFILER.WATCHLIST.ALERT_WEBHOOK });
        const roles = [];
        for(let role of config.PLAYER_PROFILER.WATCHLIST.ALERT_ROLES) if(!role.length > 8) roles.push(`<@&${role}>`);

        let simpleMessage = `⚠️ **[${playerObject.name}](<${playerObject.profile_url}>)** has joined and is on the **watchlist**!`;
        let fancyMessage = `**User:** [${playerObject.name}](${playerObject.profile_url})\n**SteamID:** [${playerObject.steam_id}](${playerObject.profile_url}) / [BM](https://www.battlemetrics.com/rcon/players?filter%5Bsearch%5D=${playerObject.steam_id})`;
        if(config.PLAYER_PROFILER.WATCHLIST.SIMPLE_FORMATTING) sendSimpleMessage(simpleMessage, hook);
        else sendFancyMessage(fancyMessage, config.PLAYER_PROFILER.WATCHLIST.EMBED_COLOR, "Watchlisted player joined", hook, { name: `${playerObject.name} | WATCHLIST ALERT`, iconURL: playerObject.picture, url: playerObject.profile_url }, playerObject.picture);
    }
}

function addReport(reported, server) {
    return new Promise((resolve, reject) => {
        db.get("select * from player_info where steam_id = ? and server_id = ?;", [reported, server.SERVER_SPECIAL_ID], async function(err, row) {
            if(row == undefined) resolve(false);
            else {
                db.run("update player_info set report_count = ? where steam_id = ? and server_id = ?;", [row.report_count+1, reported, server.SERVER_SPECIAL_ID]);
                resolve(row);
            }
        });
    });
}

function addKill(attacker, victim, server) {
    if(!attacker.includes("765611") || !victim.includes("765611") || attacker == victim) return;
    db.get("select * from player_info where steam_id = ? and server_id = ?;", [attacker, server.SERVER_SPECIAL_ID], async function(err, row) {
        if(!row) return;
        db.run("update player_info set kills = ?, wipe_kills = ? where steam_id = ? and server_id = ?;", [row.deaths+1, row.wipe_deaths+1, attacker, server.SERVER_SPECIAL_ID]);
    });

    db.get("select * from player_info where steam_id = ? and server_id = ?;", [victim, server.SERVER_SPECIAL_ID], async function(err, row) {
        if(!row) return;
        db.run("update player_info set deaths = ?, wipe_deaths = ? where steam_id = ? and server_id = ?;", [row.deaths+1, row.wipe_deaths+1, victim, server.SERVER_SPECIAL_ID]);
    });
}

function checkWipe(wipeObject, server) {
    return new Promise((resolve, reject) => {
        console.log(wipeObject);
        if(wipeObject.wipeDate && wipeObject.serverSeed && wipeObject.serverSize) {
            handleWipeMessage(wipeObject, server);
            resolve(true);
        } else resolve(false);
    });
}

function getPlayerInfo(steamId, serverId) {
    return new Promise((resolve, reject) => {
        db.get(
            "select * from player_info where steam_id = ? and server_id = ?;",
            [steamId, serverId],
            function (err, row) {
                if (err) {
                    console.log(err);
                    return resolve(false); // or use reject(err) if you want to handle errors differently
                }

                resolve(row);
            }
        );
    });
}


async function addPlayerData(steamId, server) {
    try {
        let playerInfo = await getPlayerInfo(steamId, server.SERVER_SPECIAL_ID);

        if (playerInfo == undefined) {
            let steamInfo = await getSteamData(steamId);

            if(!steamInfo) {
                console.log("Could not gather users Steam Info");
                return;
            }

            db.run("insert into player_info (steam_id, server_id, picture, name, profile_url, lastUpdated) values (?,?,?,?,?,?)", [ steamId, server.SERVER_SPECIAL_ID, steamInfo.avatarfull, steamInfo.personaname, steamInfo.profileurl, Date.now() / 1000 ]);
            playerInfo = await getPlayerInfo(steamId, server.SERVER_SPECIAL_ID);
            }   else if(playerInfo?.lastUpdated + (config.PLAYER_PROFILER['Update player steam info every x hours (Will update a users steam data once a user joins the server after this threshold)'] * 3600) <= Date.now() / 1000) {
            let steamInfo = await getSteamData(steamId);

            if(!steamInfo) {
                console.log("Could not gather users Steam Info");
                return;
            }

            db.run("update player_info set picture = ?, name = ?, profile_url = ?, lastUpdated = ? where steam_id = ?;", [ steamInfo.avatarfull, steamInfo.personaname, steamInfo.profileurl, Date.now() / 1000, steamId ]);
            playerInfo = await getPlayerInfo(steamId, server.SERVER_SPECIAL_ID);
        }

        console.log(playerInfo);
        return playerInfo;
    } catch (error) {
        console.error("An error occurred when adding player data to DB:", error);
        return false;
    }
}


function getSteamData(steamId) {
    return new Promise((resolve, reject) => {
        fetch(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${config.STEAM_API_KEY}&steamids=${steamId}`).then(res => res.text()).then(response => {
            try {
                let steam = JSON.parse(response);
                if(!steam.response.players[0]) return;

                const { personaname, avatarfull, profileurl, steamid, communityvisibilitystate } = steam.response.players[0];
                resolve({ 'personaname': personaname, 'avatarfull': avatarfull, 'profileurl': profileurl, 'steamid': steamid, 'profilestatus': communityvisibilitystate });
            } catch(err) {
                reject("Error while checking steam profile!\n" + err);
            }
        });
    });
}

function handleWipeMessage(wipedObject, server) {
    if(wipedObject.wipeDate) {
        db.run("update player_info set wipe_kills = 0, wipe_deaths = 0 where server_id = ?;", [server.SERVER_SPECIAL_ID]);

        if(server.WIPE_ANNOUNCEMENTS.ENABLED) {
            let content = ` `;
            let embed = new discord.EmbedBuilder();
            wipedObject.serverSeed = wipedObject.serverSeed.replace(/"/g, '');
            wipedObject.serverSize = wipedObject.serverSize.replace(/"/g, '');
            server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.DESCRIPTION = server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.DESCRIPTION.replace(/{seed}/g, wipedObject.serverSeed);
            server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.DESCRIPTION = server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.DESCRIPTION.replace(/{size}/g, wipedObject.serverSize);
            server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.DESCRIPTION = server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.DESCRIPTION.replace(/{SERVER_PORT}/g, server.SERVER_PORT);
            server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.DESCRIPTION = server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.DESCRIPTION.replace(/{SERVER_IP}/g, server.SERVER_IP);
            server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.TITLE = server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.TITLE.replace(/{seed}/g, wipedObject.serverSeed);
            server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.TITLE = server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.TITLE.replace(/{SERVER_SHORTNAME}/g, server.SERVER_SHORTNAME);
            server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.TITLE = server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.TITLE.replace(/{size}/g, wipedObject.serverSize);
            server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.FOOTER = server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.FOOTER.replace(/{seed}/g, wipedObject.serverSeed);
            server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.FOOTER = server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.FOOTER.replace(/{size}/g, wipedObject.serverSize);
            if (server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.DESCRIPTION) embed.setDescription(server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.DESCRIPTION)
            if (server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.EMBED_COLOR) embed.setColor(server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.EMBED_COLOR)
            if (server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.SMALL_IMAGE) embed.setThumbnail(server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.SMALL_IMAGE)
            if (server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.TITLE) embed.setTitle(server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.TITLE)
            if (server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.FOOTER) embed.setFooter({ text: server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.FOOTER })
            embed.setTimestamp();

            if (server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.EXTERNAL_CONTENT) {
                content = server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.EXTERNAL_CONTENT;
              }
      
              if (server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.LARGE_IMAGE.RUSTMAPS_API_KEY) {
                fetch(`https://api.rustmaps.com/v4/maps/${wipedObject.serverSize}/${wipedObject.serverSeed}?barren=false&staging=false`, { headers: { "X-API-Key": server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.LARGE_IMAGE.RUSTMAPS_API_KEY } }).then(res => res.text()).then(response => {
                  try {
                    response = JSON.parse(response);
                  } catch (err) {
      
                  }
      
                  if (!response || response.meta.errors !== undefined) {
                    if (server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.LARGE_IMAGE.LARGE_IMAGE) embed.setImage(server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.LARGE_IMAGE.LARGE_IMAGE);
                    const hook = new discord.WebhookClient({ url: server.WIPE_ANNOUNCEMENTS.WEBHOOK });
                    hook.send({ embeds: [embed], content: content });
                  } else {
      
                    embed.setImage(response.data.imageIconUrl);
      
                    const hook = new discord.WebhookClient({ url: server.WIPE_ANNOUNCEMENTS.WEBHOOK });
                    hook.send({ embeds: [embed], content: content });
                    wipedObject = { serverSeed: "", serverSize: "", wipeDate: "" };
                  }
                });
              } else {
                if (server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.LARGE_IMAGE.LARGE_IMAGE) embed.setImage(server.WIPE_ANNOUNCEMENTS.EMBED_SETTINGS.LARGE_IMAGE.LARGE_IMAGE);
                const hook = new discord.WebhookClient({ url: server.WIPE_ANNOUNCEMENTS.WEBHOOK });
                hook.send({ embeds: [embed], content: content });
                wipedObject = { serverSeed: "", serverSize: "", wipeDate: "" };
              }
        }
    }
}

function handleOnlineMessage(server) {
    const hook = new discord.WebhookClient({ url: server.SERVER_ONLINE_OFFLINE.ONLINE_EMBED_SETTINGS.WEBHOOK});
    let embed = new discord.EmbedBuilder();
    let newMessage = server.SERVER_ONLINE_OFFLINE.ONLINE_EMBED_SETTINGS;
    newMessage.TITLE = newMessage.TITLE.replace(/{SERVER_SHORTNAME}/gi, server.SERVER_SHORTNAME);

    if(server.SERVER_ONLINE_OFFLINE.ONLINE_EMBED_SETTINGS.TITLE) embed.setTitle(server.SERVER_ONLINE_OFFLINE.ONLINE_EMBED_SETTINGS.TITLE);
    if(server.SERVER_ONLINE_OFFLINE.ONLINE_EMBED_SETTINGS.LARGE_IMAGE) embed.setImage(server.SERVER_ONLINE_OFFLINE.ONLINE_EMBED_SETTINGS.LARGE_IMAGE);
    if(server.SERVER_ONLINE_OFFLINE.ONLINE_EMBED_SETTINGS.SMALL_IMAGE) embed.setThumbnail(server.SERVER_ONLINE_OFFLINE.ONLINE_EMBED_SETTINGS.SMALL_IMAGE);
    if(server.SERVER_ONLINE_OFFLINE.ONLINE_EMBED_SETTINGS.DESCRIPTION) embed.setDescription(server.SERVER_ONLINE_OFFLINE.ONLINE_EMBED_SETTINGS.DESCRIPTION);
    if(server.SERVER_ONLINE_OFFLINE.ONLINE_EMBED_SETTINGS.FOOTER) embed.setFooter({ text: server.SERVER_ONLINE_OFFLINE.ONLINE_EMBED_SETTINGS.FOOTER });
    if(server.SERVER_ONLINE_OFFLINE.ONLINE_EMBED_SETTINGS.COLOR) embed.setColor(server.SERVER_ONLINE_OFFLINE.ONLINE_EMBED_SETTINGS.COLOR);
    embed.setTimestamp();

    if(server.SERVER_ONLINE_OFFLINE.SIMPLE_FORMATTING) sendSimpleMessage(`🖥️✅ **${server.SERVER_SHORTNAME}** has gone **online!**`, hook);
    else hook.send({ embeds: [embed] });
}

function handleOfflineMessage(server) {
    const hook = new discord.WebhookClient({ url: server.SERVER_ONLINE_OFFLINE.OFFLINE_EMBED_SETTINGS.WEBHOOK});
    let embed = new discord.EmbedBuilder();
    let newMessage = server.SERVER_ONLINE_OFFLINE.OFFLINE_EMBED_SETTINGS;
    newMessage.TITLE = newMessage.TITLE.replace(/{SERVER_SHORTNAME}/gi, server.SERVER_SHORTNAME);

    if(server.SERVER_ONLINE_OFFLINE.OFFLINE_EMBED_SETTINGS.TITLE) embed.setTitle(server.SERVER_ONLINE_OFFLINE.OFFLINE_EMBED_SETTINGS.TITLE);
    if(server.SERVER_ONLINE_OFFLINE.OFFLINE_EMBED_SETTINGS.LARGE_IMAGE) embed.setImage(server.SERVER_ONLINE_OFFLINE.OFFLINE_EMBED_SETTINGS.LARGE_IMAGE);
    if(server.SERVER_ONLINE_OFFLINE.OFFLINE_EMBED_SETTINGS.SMALL_IMAGE) embed.setThumbnail(server.SERVER_ONLINE_OFFLINE.OFFLINE_EMBED_SETTINGS.SMALL_IMAGE);
    if(server.SERVER_ONLINE_OFFLINE.OFFLINE_EMBED_SETTINGS.DESCRIPTION) embed.setDescription(server.SERVER_ONLINE_OFFLINE.OFFLINE_EMBED_SETTINGS.DESCRIPTION);
    if(server.SERVER_ONLINE_OFFLINE.OFFLINE_EMBED_SETTINGS.FOOTER) embed.setFooter({ text: server.SERVER_ONLINE_OFFLINE.OFFLINE_EMBED_SETTINGS.FOOTER });
    if(server.SERVER_ONLINE_OFFLINE.OFFLINE_EMBED_SETTINGS.COLOR) embed.setColor(server.SERVER_ONLINE_OFFLINE.OFFLINE_EMBED_SETTINGS.COLOR);
    embed.setTimestamp();

    if(server.SERVER_ONLINE_OFFLINE.SIMPLE_FORMATTING) sendSimpleMessage(`🖥️❌ **${server.SERVER_SHORTNAME}** has gone **offline!**`, hook);
    else hook.send({ embeds: [embed] });
}

function handlePopDisplay(playerObject, server, servers, index) {
    return new Promise((resolve, reject) => {
        let wipedTodaySettings = server.USE_POP_AS_A_BOT_STATUS.OPTIONS.WIPED_TODAY;
        let didntWipeTodaySettings = server.USE_POP_AS_A_BOT_STATUS.OPTIONS.DIDNT_WIPE_TODAY;
        let threshold;
        let wipedToday = false;
    
        if (Date.parse(playerObject.wipedAt + 'Z') + (wipedTodaySettings.MAX_HOURS_SINCE_LAST_WIPE * 3600000) > Date.now()) wipedToday = true;
        if(wipedTodaySettings.ENABLED && wipedToday) {
            if(wipedTodaySettings.WIPED_TODAY_STATUS.ENABLE_THRESHOLD_MESSAGE) threshold = playerObject.maxPlayers * `0.${wipedTodaySettings.WIPED_TODAY_STATUS.THRESHOLD_PERCENT}`;
            if(wipedTodaySettings.WIPED_TODAY_STATUS.ENABLE_THRESHOLD_MESSAGE && playerObject.playersOnline < threshold) {
                console.log(`(${chalk.magenta(index+1)}/${chalk.blue(servers.length)}) => 👉 [ ${chalk.cyan(server.SERVER_SHORTNAME)} ] status: ${chalk.cyan(wipedTodaySettings.WIPED_TODAY_STATUS.THRESHOLD_MESSAGE)}`);
            } else if(playerObject.queuedPlayers > 0) {
                resolve(getPopMessage(wipedTodaySettings.WIPED_TODAY_STATUS.PLAYERS_QUEUED_MESSAGE, playerObject, server, index, servers));
            } else if(playerObject.joiningPlayers > 0) {
                resolve(getPopMessage(wipedTodaySettings.WIPED_TODAY_STATUS.PLAYERS_JOINING_MESSAGE, playerObject, server, index, servers));
            } else {
                resolve(getPopMessage(wipedTodaySettings.WIPED_TODAY_STATUS.PLAYER_COUNT_MESSAGE, playerObject, server, index, servers));
            }
        } else {
            if(didntWipeTodaySettings.ENABLE_THRESHOLD_MESSAGE) threshold = playerObject.maxPlayers * `0.${didntWipeTodaySettings.THRESHOLD_PERCENT}`;
    
            if(didntWipeTodaySettings.ENABLE_THRESHOLD_MESSAGE && playerObject.playersOnline < threshold) {
                resolve({ activities: [{ name: `${didntWipeTodaySettings.THRESHOLD_MESSAGE}`, type: discord.ActivityType.Watching }], status: "online" });
                console.log(`(${chalk.magenta(index+1)}/${chalk.blue(servers.length)}) => 👉 [ ${chalk.cyan(server.SERVER_SHORTNAME)} ] status: ${chalk.cyan(didntWipeTodaySettings.THRESHOLD_MESSAGE)}`);
            } else if(playerObject.queuedPlayers > 0) {
                resolve(getPopMessage(didntWipeTodaySettings.PLAYERS_QUEUED_MESSAGE, playerObject, server, index, servers));
            } else if(playerObject.joiningPlayers > 0) {
                resolve(getPopMessage(didntWipeTodaySettings.PLAYERS_JOINING_MESSAGE, playerObject, server, index, servers));
            } else {
                resolve(getPopMessage(didntWipeTodaySettings.PLAYER_COUNT_MESSAGE, playerObject, server, index, servers)); 
            }
        }
    });
}

function getPopMessage(popMessage, playerObject, server, index, servers) {
    return new Promise((resolve, reject) => {
        popMessage = popMessage.replace(/{playersOnline}/gi, playerObject.playersOnline)
        popMessage = popMessage.replace(/{maxPlayers}/gi, playerObject.maxPlayers);
        popMessage = popMessage.replace(/{joiningPlayers}/gi, playerObject.joiningPlayers);
        popMessage = popMessage.replace(/{queuedPlayers}/gi, playerObject.queuedPlayers);
        
        console.log(`(${chalk.magenta(index+1)}/${chalk.blue(servers.length)}) => 👉 [ ${chalk.cyan(server.SERVER_SHORTNAME)} ] status: ${chalk.cyan(popMessage)}`);
        resolve({ activities: [{ name: `${popMessage}`, type: discord.ActivityType.Watching }], status: "online" });
    });
}

function handlePopChanged(popObject, server) {
    return new Promise((resolve, reject) => {
        if(server.DYNAMIC_MAXPLAYERS_CHANGER.OPTIONS.BASIC.ENABLED && !server.DYNAMIC_MAXPLAYERS_CHANGER.OPTIONS.QUEUEING.ENABLED) {
            const currentArray = [...server.DYNAMIC_MAXPLAYERS_CHANGER.OPTIONS.BASIC.CONDITIONALS].reverse();
            currentInfo = currentArray.find(theObj => popObject.playersOnline >= theObj.POP_IS_GREATER_THAN);
    
            if(currentInfo !== undefined && currentInfo.INCREASE_MAX_PLAYERS_TO > popObject.maxPlayers && server.DYNAMIC_MAXPLAYERS_CHANGER.OPTIONS.DONT_CHANGE_POP_IF_FPS_IS_LESS_THAN < popObject.fps) {
                popObject.maxPlayers = currentInfo.INCREASE_MAX_PLAYERS_TO;
                resolve({ commandNeeded: true, newPop: popObject.maxPlayers });
            } else if(currentInfo !== undefined && currentInfo.INCREASE_MAX_PLAYERS_TO < popObject.maxPlayers && !server.DYNAMIC_MAXPLAYERS_CHANGER.OPTIONS.QUEUEING.ENABLED) {
                popObject.maxPlayers = currentInfo.INCREASE_MAX_PLAYERS_TO;
                resolve({ commandNeeded: true, newPop: popObject.maxPlayers });
            }
        }
    
        if(server.DYNAMIC_MAXPLAYERS_CHANGER.OPTIONS.QUEUEING.ENABLED) {
            if(popObject.queue >= server.DYNAMIC_MAXPLAYERS_CHANGER.OPTIONS.QUEUEING.QUEUE_COUNT_TO_INCREASE) {
                const currentArray = [...server.DYNAMIC_MAXPLAYERS_CHANGER.OPTIONS.QUEUEING.CONDITIONALS].reverse();
                queueInfo = currentArray.find(theObj => theObj.POP_IS_GREATER_THAN < popObject.playersOnline);
                if(queueInfo !== undefined && queueInfo.INCREASE_MAX_PLAYERS_TO > popObject.maxPlayers && server.DYNAMIC_MAXPLAYERS_CHANGER.OPTIONS.DONT_CHANGE_POP_IF_FPS_IS_LESS_THAN < popObject.fps) {
                    popObject.maxPlayers = queueInfo.INCREASE_MAX_PLAYERS_TO;
                    resolve({ commandNeeded: true, newPop: popObject.maxPlayers });
                }
        
            } else if(popObject.queue == 0) {
                const queueChange = server.DYNAMIC_MAXPLAYERS_CHANGER.OPTIONS.QUEUEING.CONDITIONALS.find(check => check.POP_IS_GREATER_THAN < popObject.playersOnline);
                const currentArray = [...server.DYNAMIC_MAXPLAYERS_CHANGER.OPTIONS.BASIC.CONDITIONALS].reverse();
                const popChange = currentArray.find(check => check.POP_IS_GREATER_THAN < popObject.playersOnline);
                if(queueChange !== undefined && server.DYNAMIC_MAXPLAYERS_CHANGER.OPTIONS.QUEUEING.ENABLED && queueChange.INCREASE_MAX_PLAYERS_TO < popObject.maxPlayers) {
                    popObject.maxPlayers = queueChange.INCREASE_MAX_PLAYERS_TO;
                    resolve({ commandNeeded: true, newPop: popObject.maxPlayers });
                }
        
                if(popChange !== undefined && server.DYNAMIC_MAXPLAYERS_CHANGER.OPTIONS.BASIC.ENABLED && popChange.INCREASE_MAX_PLAYERS_TO < popObject.maxPlayers) {
                    popObject.maxPlayers = popChange.INCREASE_MAX_PLAYERS_TO;
                    resolve({ commandNeeded: true, newPop: popObject.maxPlayers });
                } else if(popChange !== undefined && server.DYNAMIC_MAXPLAYERS_CHANGER.OPTIONS.BASIC.ENABLED && popChange.INCREASE_MAX_PLAYERS_TO > popObject.maxPlayers) {
                    popObject.maxPlayers = popChange.INCREASE_MAX_PLAYERS_TO;
                    resolve({ commandNeeded: true, newPop: popObject.maxPlayers });
                }
        
                resolve({ commandNeeded: false, newPop: "Done" });
            }
        }
    })
}

function handleKillMessage(killObject, server) {
    const hook = new discord.WebhookClient({ url: server.SERVER_LOGGING.KILL_LOGS.LOG_WEBHOOK });
    if(server.SERVER_LOGGING.KILL_LOGS.USE_PLUGIN_KILL_LOGS) {
        addKill(killObject.AttackerID, killObject.VictimID, server);
        if(server.SERVER_LOGGING.KILL_LOGS.SIMPLE_FORMATTING) sendSimpleMessage(`💀 **${(killObject.AttackerID.includes("765611") ? `[${killObject.AttackerName}](<https://steamcommunity.com/profiles/${killObject.AttackerID}>)` : killObject.AttackerName)}** killed${killObject.VictimID == null ? " a " : " "}**${(killObject.VictimID?.includes("765611") ? `[${killObject.VictimName}](<https://steamcommunity.com/profiles/${killObject.VictimID}>)` : killObject.VictimName)}** with a **${killObject.Weapon}** from **${killObject.KillDistance.toFixed(2)}m**`, hook);
        else sendFancyMessage(`💀 **${(killObject.AttackerID.includes("765611") ? `[${killObject.AttackerName}](<https://steamcommunity.com/profiles/${killObject.AttackerID}>)` : killObject.AttackerName)}** killed${killObject.VictimID == null ? " a " : " "}**${(killObject.VictimID?.includes("765611") ? `[${killObject.VictimName}](<https://steamcommunity.com/profiles/${killObject.VictimID}>)` : killObject.VictimName)}** with a **${killObject.Weapon}** from **${killObject.KillDistance.toFixed(2)}m**`, server.SERVER_LOGGING.KILL_LOGS.EMBED_COLOR, "PLAYER KILLED", hook);
    }
}

function handleEventMessage(eventObject, server) {
    const hook = new discord.WebhookClient({ url: server.PLUGIN_ONLY_LOGGING.EVENT_SPAWNS.LOG_WEBHOOK });
    if(server.PLUGIN_ONLY_LOGGING.EVENT_SPAWNS.SIMPLE_FORMATTING) sendSimpleMessage(`${eventObject.EntityName} has spawned!`, hook);
    else sendFancyMessage(`${eventObject.EntityName} has spawned!`, server.PLUGIN_ONLY_LOGGING.EVENT_SPAWNS.EMBED_COLOR, "EVENT SPAWNED", hook);
}

async function handleFeedback(feedbackObject, server) {
    const hook = new discord.WebhookClient({ url: server.PLUGIN_ONLY_LOGGING.FEEDBACK_LOGGING.LOG_WEBHOOK });
    var playerObject = await addPlayerData(feedbackObject.SteamID, server);
    if(server.PLUGIN_ONLY_LOGGING.FEEDBACK_LOGGING.SIMPLE_FORMATTING) sendSimpleMessage(`✉️ **[${playerObject.name}](<${playerObject.profile_url}>)** submitted **${feedbackObject.Category} ->** ` + "``" + feedbackObject.Title + ": " + feedbackObject.Message + "``", hook);
    else sendFancyMessage(`**${feedbackObject.Title}**` + "```" + feedbackObject.Message + "```", server.PLUGIN_ONLY_LOGGING.FEEDBACK_LOGGING.EMBED_COLOR, `${feedbackObject.Category} SUBMITTED`, hook, { iconURL: playerObject.picture, name: `${playerObject.name} submitted ${feedbackObject.Category}`, URL: playerObject.profile_url }, playerObject.picture);
}

async function handlePermMessage(permObject, server) {
    const hook = new discord.WebhookClient({ url: server.PLUGIN_ONLY_LOGGING.PERM_CHANGES.LOG_WEBHOOK });
    await addPlayerData(permObject.UserID, server).then(response => {
        if(response) {
            let permSection;
            if(permObject.IsGroup) permSection = `**${permObject.Perm}** group`;
            else permSection = `**${permObject.Perm}** perm`;
            if(server.PLUGIN_ONLY_LOGGING.PERM_CHANGES.SIMPLE_FORMATTING) sendSimpleMessage(`🔑 **[${response.name}](<${response.profile_url})>** has been ${permObject.Added ? "**added** to" : "**removed** from"} ${permSection}`, hook);
            sendFancyMessage(`🔑 **[${response.name}](${response.profile_url})** has been ${permObject.Added ? "**added** to" : "**removed** from"} ${permSection}`, server.PLUGIN_ONLY_LOGGING.PERM_CHANGES.EMBED_COLOR, "PERMS CHANGED", hook);
        }
    });
}

async function handleBanCheck(playerInfo, server) {
    if(playerInfo) {
        if(server.PLAYER_ACCOUNT_CHECKS.BAN_CHECKER.ENABLED && !playerInfo.checker_whitelisted) {
            const hook = new discord.WebhookClient({ url: server.PLAYER_ACCOUNT_CHECKS.BAN_CHECKER.LOG_WEBHOOK });
            let steamBans = null;
            let bansArray = [];

            await fetch(`http://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${config.STEAM_API_KEY}&steamids=${playerInfo.steam_id}`).then(res => res.text()).then(response => {
                try {
                    response = JSON.parse(response);
                    steamBans = { NumberOfVACBans: response.players[0].NumberOfVACBans, NumberOfGameBans: response.players[0].NumberOfGameBans, DaysSinceLastBan: response.players[0].DaysSinceLastBan };
                } catch(err) {
                    console.log(err);
                }
            });

            await fetch(`https://rustbans.com/api/${playerInfo.steam_id}`).then(res => res.json()).then(response => {
                response.forEach(ban => {
                    if(ban.Banned) {
                      let banTime = response[0].BanDateMilliseconds / 1000;
                      bansArray.push(`**Temp banned:** <t:${banTime}:R>\n**Tweet:** ${ban.TweetLink}`);
                    }
                  });
            });

            if(steamBans == null) return;

            if(bansArray.length > server.PLAYER_ACCOUNT_CHECKS.BAN_CHECKER.THRESHOLDS.RUST_TEMP_BANS || steamBans.NumberOfVACBans >= server.PLAYER_ACCOUNT_CHECKS.BAN_CHECKER.THRESHOLDS.VAC_BANS || steamBans.NumberOfGameBans >= server.PLAYER_ACCOUNT_CHECKS.BAN_CHECKER.THRESHOLDS.EAC_BANS || ((steamBans.NumberOfVACBans > 0 || steamBans.NumberOfGameBans > 0) && steamBans.DaysSinceLastBan < server.PLAYER_ACCOUNT_CHECKS.BAN_CHECKER.THRESHOLDS.DAYS_SINCE_LAST_BAN)) {
                let rolesArray = [];
                server.PLAYER_ACCOUNT_CHECKS.BAN_CHECKER.MENTION_STAFF_ROLES.forEach(roleID => {
                    if(roleID && roleID.length < 10) return;
                    rolesArray.push(`<@&${roleID}>`)
                });

                let messageString = `⚠️ **ACCOUNT ALERT: [${playerInfo.name}](<${playerInfo.profile_url}>)**. **Temp bans:** ${bansArray.length} | **EAC:** ${steamBans.NumberOfGameBans} | **VAC:** ${steamBans.NumberOfVACBans} | **Days since last ban:** ${steamBans.DaysSinceLastBan}`;
                let account = { name: `Account Alert! ${playerInfo.name}`, iconURL: playerInfo.picture, url: playerInfo.profile_url };
                if(server.PLAYER_ACCOUNT_CHECKS.BAN_CHECKER.SIMPLE_FORMATTING) sendSimpleMessage(messageString, hook);
                else sendFancyMessage(`**User:** [${playerInfo.name} / ${playerInfo.steam_id}](${playerInfo.profile_url})\n**VAC Bans:** ${steamBans.NumberOfVACBans}\n**EAC Bans:** ${steamBans.NumberOfGameBans}\n**Days Since last ban:** ${steamBans.DaysSinceLastBan}\n\n**RUST TEMP BANS:**\n${bansArray.join("\n\n")}`, server.PLAYER_ACCOUNT_CHECKS.BAN_CHECKER.EMBED_COLOR, "Account Alert", hook, account, playerInfo.picture);
            }
        }
    }
}

function handlePlayerLeaving(playerInfo, server, reason = undefined) {
    if(server.SERVER_LOGGING.SERVER_LEAVE_LOGS.ENABLED) {
        const hook = new discord.WebhookClient({ url: server.SERVER_LOGGING.SERVER_LEAVE_LOGS.LOG_WEBHOOK });
        if(server.SERVER_LOGGING.SERVER_LEAVE_LOGS.SIMPLE_FORMATTING) sendSimpleMessage(`❌ **[${playerInfo.name}](<${playerInfo.profile_url}>)** has disconnected from the server${reason == undefined ? "" : `: ${reason}`}`, hook);
        else {
            let desc = `**User:** [${playerInfo.name}](${playerInfo.profile_url})\n**SteamID:** [${playerInfo.steam_id}](${playerInfo.profile_url}) / [BM](https://www.battlemetrics.com/rcon/players?filter%5Bsearch%5D=${playerInfo.steam_id})\n**Reason:** ${reason == undefined ? "No reason..." : ` ${reason}`}`;
            let author = { name: `${playerInfo.name} has disconnected`, iconURL: playerInfo.picture, url: playerInfo.profile_url };
            sendFancyMessage(desc, server.SERVER_LOGGING.SERVER_LEAVE_LOGS.EMBED_COLOR, "Player Disconnected", hook, author, playerInfo.picture);
        }
    }
}

function handlePlayerJoining(playerInfo, server) {
    if(playerInfo) {
        db.run("update player_info set connections = ? where server_id = ? and steam_id = ?;", [playerInfo.connections+1, server.SERVER_SPECIAL_ID, playerInfo.steam_id]);
    }

    if(server.SERVER_LOGGING.SERVER_JOIN_LOGS.ENABLED) {
        const hook = new discord.WebhookClient({ url: server.SERVER_LOGGING.SERVER_JOIN_LOGS.LOG_WEBHOOK });
        if(server.SERVER_LOGGING.SERVER_JOIN_LOGS.SIMPLE_FORMATTING) sendSimpleMessage(`✅ **[${playerInfo.name}](<${playerInfo.profile_url}>)** has connected to the server!`, hook);
        else {
            let desc = `**User:** [${playerInfo.name}](${playerInfo.profile_url})\n**SteamID:** [${playerInfo.steam_id}](${playerInfo.profile_url}) / [BM](https://www.battlemetrics.com/rcon/players?filter%5Bsearch%5D=${playerInfo.steam_id})`;
            let author = { name: `${playerInfo.name} has joined!`, iconURL: playerInfo.picture, url: playerInfo.profile_url };
            sendFancyMessage(desc, server.SERVER_LOGGING.SERVER_JOIN_LOGS.EMBED_COLOR, "Player Joined", hook, author, playerInfo.picture);
        }
    }
}

function handleF1Logs(messageContent, server) {
    const hook = new discord.WebhookClient({ url: server.SERVER_LOGGING.F1_SPAWN_ITEM_LOGS.LOG_WEBHOOK });
    let spawnString = `**[F1 SPAWN]** ${messageContent.split("giving ")[1]}`;
    if(server.SERVER_LOGGING.F1_SPAWN_ITEM_LOGS.SIMPLE_FORMATTING) sendSimpleMessage(spawnString, hook);
    else sendFancyMessage(spawnString, server.SERVER_LOGGING.F1_SPAWN_ITEM_LOGS.EMBED_COLOR, "", hook);
}

async function handleChatMessage(messageContent, messageChannel, server, rcon) {
    if(messageChannel == 2) {

    } else {
        db.get("select * from player_info where steam_id = ? and server_id = ?", [ messageContent.UserId, server.SERVER_SPECIAL_ID ], async function(err, row) {
            if(err) console.log(err);
            row = !row ? await addPlayerData(messageContent.UserId, server) : row;
            db.run("update player_info set chat_messages = ? where server_id = ? and steam_id = ?;", [row.chat_messages+1, server.SERVER_SPECIAL_ID, row.steam_id]);
    
            if(messageChannel == 0 && server.CHAT_LOGS.GLOBAL_CHAT_LOGS.ENABLED) {
                const hook = new discord.WebhookClient({ url: server.CHAT_LOGS.GLOBAL_CHAT_LOGS.GLOBAL_CHAT_WEBHOOK });
                if(server.CHAT_LOGS.DO_YOU_USE_BETTER_CHAT) handleBetterChatMessage(messageContent, hook, server, server.CHAT_LOGS.GLOBAL_CHAT_LOGS.EMBED_COLOR, messageChannel, row);
                else handleNormalMessage(messageContent, hook, server, server.CHAT_LOGS.GLOBAL_CHAT_LOGS.EMBED_COLOR, messageChannel, row);
            } else if(messageChannel == 1 && server.CHAT_LOGS.TEAM_CHAT_LOGS.ENABLED) {
                const hook = new discord.WebhookClient({ url: server.CHAT_LOGS.TEAM_CHAT_LOGS.TEAM_CHAT_WEBHOOK });
                if(server.CHAT_LOGS.DO_YOU_USE_BETTER_CHAT) handleBetterChatMessage(messageContent, hook, server, server.CHAT_LOGS.TEAM_CHAT_LOGS.EMBED_COLOR, messageChannel, row);
                else handleNormalMessage(messageContent, hook, server, server.CHAT_LOGS.TEAM_CHAT_LOGS.EMBED_COLOR, messageChannel, row);
            } else if(messageChannel == 4 && server.CHAT_LOGS.LOCAL_CHAT_LOGS.ENABLED) {
                const hook = new discord.WebhookClient({ url: server.CHAT_LOGS.LOCAL_CHAT_LOGS.LOCAL_CHAT_WEBHOOK });
                if(server.CHAT_LOGS.DO_YOU_USE_BETTER_CHAT) handleBetterChatMessage(messageContent, hook, server, server.CHAT_LOGS.LOCAL_CHAT_LOGS.EMBED_COLOR, messageChannel);
                else handleNormalMessage(messageContent, hook, server, server.CHAT_LOGS.LOCAL_CHAT_LOGS.EMBED_COLOR, messageChannel);
            }
    
            if(server.USER_MUTING.AUTOMATED_MUTING.ENABLED) {
                if(messageChannel == 0 || (messageChannel == 1 && server.USER_MUTING.AUTOMATED_MUTING.WATCH_TEAM_CHAT)) {
                    handleAutoMute(messageContent, server, row, rcon);
                }
            }
        });
    }
}

function handleAutoMute(messageContent, server, row, rcon) {
    let messageWords = messageContent.Message.toLowerCase().split(/\s+/);

    let ruleForExactMatch = server.USER_MUTING.AUTOMATED_MUTING.MUTE_WORDS_AND_REASONS.find(rule => {
        return rule.BLOCKED_WORDS.EXACT_WORD_MATCHES.some(word => {
            return messageWords.includes(word.toLowerCase());
        });
    });

    let ruleForPartialMatch = server.USER_MUTING.AUTOMATED_MUTING.MUTE_WORDS_AND_REASONS.find(rule => {
        return rule.BLOCKED_WORDS.PARTIAL_WORD_MATCHES.some(word => {
            return messageContent.Message.toLowerCase().includes(word.toLowerCase());
        });
    });

    let foundRule = ruleForExactMatch || ruleForPartialMatch;
    if (foundRule) {
        rcon.send(`mute ${messageContent.UserId} ${foundRule["MUTE_TIME (s/m/h/d)"]} ${foundRule.MUTE_REASON}`);

        if(server.USER_MUTING.AUTOMATED_MUTING.LOG_AUTO_MUTES) {
            let hook = new discord.WebhookClient({ url: server.USER_MUTING.AUTOMATED_MUTING.LOG_WEBHOOK })
            if(server.USER_MUTING.AUTOMATED_MUTING.SIMPLE_FORMATTING) sendSimpleMessage(`🤫 **${row.name}** has been auto muted for **${foundRule.MUTE_REASON}** for **${foundRule["MUTE_TIME (s/m/h/d)"]}**: `+ "``" +`${messageContent.Message}`+ "``", hook);
            else sendFancyMessage(`🤫 **${row.name}** has been auto muted for **${foundRule.MUTE_REASON}** for **${foundRule["MUTE_TIME (s/m/h/d)"]}**\n${messageContent.Message}`, server.USER_MUTING.AUTOMATED_MUTING.EMBED_COLOR, "USER MUTED", hook);
        }
    }
}

function handleBetterChatMessage(messageContent, hook, server, embedColor, messageChannel, playerInfo) {
    messageContent.Message = messageContent.Message.replace(/@everyone/gi, "@ everyone");
    messageContent.Message = messageContent.Message.replace(/@here/gi, "@ here");
    const stringText = `${getChatType(messageChannel)} ${messageContent.Message}`;
    
    if(server.CHAT_LOGS.SIMPLE_FORMATTING) sendSimpleMessage(stringText, hook);
    else sendFancyMessage(`${getChatType(messageChannel)} [STEAM](https://steamcommunity.com/profiles/${messageContent.UserId}) / [BM](https://www.battlemetrics.com/rcon/players?filter%5Bsearch%5D=${messageContent.UserId}) ${messageContent.Message}`, embedColor, messageContent.UserId, hook, { name: `${playerInfo.name}`, iconURL: playerInfo.picture, url: playerInfo.profile_url });
}

function handleNormalMessage(messageContent, hook, server, embedColor, messageChannel, playerInfo) {
    messageContent.Username = messageContent.Username.replace(/@everyone/gi, "@ everyone");
    messageContent.Message = messageContent.Message.replace(/@everyone/gi, "@ everyone");
    messageContent.Message = messageContent.Message.replace(/@here/gi, "@ here");
    messageContent.Username = messageContent.Username.replace(/@here/gi, "@ here");
    const stringText = `${getChatType(messageChannel)} **[${messageContent.Username}](<https://steamcommunity.com/profiles/${playerInfo.steam_id}>):** ${messageContent.Message}`;

    let fancyName = `${playerInfo.name}: ${messageContent.Message}`;
    if(fancyName.length > 250) fancyName.split(250)[0];

    if(server.CHAT_LOGS.SIMPLE_FORMATTING) sendSimpleMessage(stringText, hook);
    else sendFancyMessage(`${getChatType(messageChannel)} [STEAM](https://steamcommunity.com/profiles/${playerInfo.steam_id}) / [BM](https://www.battlemetrics.com/rcon/players?filter%5Bsearch%5D=${messageContent.UserId}) **${messageContent.Username}**: ${messageContent.Message}`, embedColor, messageContent.UserId, hook, { name: `${playerInfo.name}`, iconURL: playerInfo.picture, url: playerInfo.profile_url });}

function getChatType(messageChannel) {
    switch(messageChannel) {
        case 0:
            return "**💬 [GLOBAL]**";
        case 1:
            return "**💬 [TEAM]**";
        case 2:
            return "**💬 [SERVER]**";
        case 4:
            return "**💬 [LOCAL]**";
    }
}

function updateServerStatus(popObject, server) {
    db.get("select * from server_logs where server_id = ?;", [server.SERVER_SPECIAL_ID], async function(err, row) {
        if(err) return console.log(err);
        if(row) {
            let newMax = row.peak_players;
            let lastWipe = Date.parse(popObject.lastWipe + 'Z') / 1000;
            let totalPlayers = parseInt(popObject.playersOnline + popObject.queuedPlayers + popObject.joiningPlayers);
            if(totalPlayers > row.peak_players) newMax = totalPlayers;
            db.run("update server_logs set current_players = ?, peak_players = ?, last_wipe = ?, joining_players = ?, queued_players = ? where server_id = ?;", [popObject.playersOnline, newMax, lastWipe, popObject.joiningPlayers, popObject.queuedPlayers, server.SERVER_SPECIAL_ID], async function(err, row) {
                if(err) console.log(err);
            });
        }
    });
}

function sendSimpleMessage(stringText, hook) {
    hook.send({ content: stringText });
}

function sendFancyMessage(description = false, color = false, footer = false, hook, author = false, thumbnail = false) {
    const embed = new discord.EmbedBuilder();
    
    if(footer) embed.setFooter({ text: footer }).setTimestamp();
    if(color) embed.setColor(color);
    if(description) embed.setDescription(description);
    if(thumbnail) embed.setThumbnail(thumbnail);
    if(author) embed.setAuthor(author);

    hook.send({ embeds: [embed] });
}

function serverStatusPage(server, client) {
    return new Promise((resolve, reject) => {
        if(!server) {
            reject("Error while reciving server details...");
        }

        const channel = client.channels.cache.get(server.SERVER_STATUS_PAGE.CHANNEL_ID);
        if(!channel || channel == null) {
            reject("Server status channel is not valid");
        }

        if(server.SERVER_STATUS_PAGE.ENABLED) {
            setInterval(() => {
                db.serialize(() => {
                    db.get("select * from server_status where channel_id = ? and server_id = ?;", [ server.SERVER_STATUS_PAGE.CHANNEL_ID, server.SERVER_SPECIAL_ID ], async function(err, row) {
                        if(err) console.log(err);
                        if(row) {
                            channel.messages.fetch(row.message_id).then(messageId => {
                                const embed = new discord.EmbedBuilder();
                                getServerStatusColor(embed, server);
    
                                db.get("select * from server_logs where server_id = ?;", [ server.SERVER_SPECIAL_ID ], async function(err, row) {
                                    if(err) console.log("Got error from server status call 1\n" + err);
                                
                                    if(row) {
                                        const statusCanvas = canvas.createCanvas(900, 341);
                                        const statusContext = statusCanvas.getContext('2d');
                                        statusContext.fillRect(0, 0, 900, 341)
                                        statusContext.fillStyle = '#f0f0f0'
                                        statusContext.font = 'bold 30pt Sans';
                                        statusContext.textBaseline = 'middle'
                                        statusContext.textAlign = 'center'
                                        let statusImage = await canvas.loadImage(`./src/images/serverstatus/serverstatus_${server.SERVER_STATUS_PAGE["COLOR(original, green, blue, black, yellow, orange, pink, red, purple, custom)"].toLowerCase()}.png`);
                                        
                                        statusContext.drawImage(statusImage, 0, 0, 900, 341);
                                        statusContext.fillText(server.SERVER_SHORTNAME, 450, 35);

                                        statusContext.font = 'bold 47pt Sans';
                                        statusContext.fillText(row.current_players, 156, 179);
                                        statusContext.fillText(row.joining_players, 450, 179);
                                        statusContext.fillText(row.queued_players, 750, 179);

                                        statusContext.font = 'bold 30pt Sans';
                                        statusContext.fillText(`Last wipe: ${moment.unix(row.last_wipe).format("MM/DD/YYYY")}`, 450, 304);

                                        const imgBuffer = statusCanvas.toBuffer('image/png')
                                        fs.writeFileSync(`./src/images/imagestorage/serverstatus_${server.SERVER_SPECIAL_ID}.png`, imgBuffer)
                                        const attachment = new discord.AttachmentBuilder(`./src/images/imagestorage/serverstatus_${server.SERVER_SPECIAL_ID}.png`);
                                        embed.setImage(`attachment://serverstatus_${server.SERVER_SPECIAL_ID}.png`)
                                        messageId.edit({ embeds: [embed.setImage(`attachment://serverstatus_${server.SERVER_SPECIAL_ID}.png`)], files: [attachment] }); 
                                    }
                                });
                            }).catch(err => {
                                db.run("delete from server_status where server_id = ?;", [server.SERVER_SPECIAL_ID]);
                                createNewServerStatus(server, channel); 
                            });
                        } else createNewServerStatus(server, channel);
                    });
                });
            }, 10000);
        }
    });
}

function globalLeaderboard(client) { 
    return new Promise((resolve, reject) => {
        const channel = client.channels.cache.get(config.PLAYER_PROFILER.GLOBAL_LEADERBOARD.CHANNEL_ID);
        if(!channel || channel == null) {
            reject("Leaderboard channel is not valid");
        }

        if(config.PLAYER_PROFILER.GLOBAL_LEADERBOARD.ENABLED) {
            setInterval(() => {
                db.serialize(() => {
                    db.get("select * from leaderboard where channel_id = ? and server_id = 'global';", [ config.PLAYER_PROFILER.GLOBAL_LEADERBOARD.CHANNEL_ID ], async function(err, row) {
                        if(err) console.log(err);
                        if(row) {
                            channel.messages.fetch(row.message_id).then(messageId => {
                                const embed = new discord.EmbedBuilder();
                                getGlobalLeaderboardColor(embed);
                                db.all("select * from player_info order by wipe_kills desc limit 5;", async function(err, table) {
                                    if(err) console.log("Got error from leaderboard call 1\n" + err);
                                    if(table != undefined && table.length > 0) {
                                        let serverLeaderboardInfo;

                                        db.all("select count(*) as CNT, sum(wipe_kills) as total_kills, sum(wipe_deaths) as total_deaths from player_info;", async function(err, allInfo) {
                                            if(err) return console.log(err);
                                            if(allInfo != undefined && allInfo.length > 0) serverLeaderboardInfo = allInfo[0];

                                            const leaderboardCanvas = canvas.createCanvas(1920, 1080);
                                            const leaderboardContext = leaderboardCanvas.getContext('2d');
                                            leaderboardContext.fillStyle = "#ffffff";
                                            leaderboardContext.fillRect(0, 0, 1920, 1080);
                                            let index = 0;

                                            let imageData = await canvas.loadImage(`./src/images/leaderboard/leaderboard_${config.PLAYER_PROFILER.GLOBAL_LEADERBOARD['COLOR(original, green, blue, black, yellow, orange, pink, red, purple, custom)']}.png`);
                                            leaderboardContext.drawImage(imageData, 0, 0, 1920, 1080);    
                                            leaderboardContext.font = 'bold 44pt "Sans"'
                                            leaderboardContext.textBaseline = 'middle'
                                            leaderboardContext.textAlign = 'center'

                                            leaderboardContext.fillText(`${(serverLeaderboardInfo.total_kills).toLocaleString('en-US')}`, 1584, 355);
                                            leaderboardContext.fillText(`${(serverLeaderboardInfo.total_deaths).toLocaleString('en-US')}`, 1584, 562);
                                            leaderboardContext.fillText(`${(serverLeaderboardInfo.CNT).toLocaleString('en-US')}`, 1584, 769);
    
                                            for(let player of table) {    
                                                player.name = player.name.replace(/:/gi, "-");
                                                player.name = player.name.replace("(", "-");
                                                player.name = player.name.replace(")", "-");
    
                                                let profileImage;
                                                try {
                                                    profileImage = await canvas.loadImage(player.picture);
                                                } catch(err) {
                                                    profileImage = await canvas.loadImage('./src/images/questionmark.png');
                                                }
    
                                                let kills = parseInt(player["kills"]);
                                                let deaths = parseInt(player["deaths"]);
                                                if(kills > 0 && deaths == 0) kdr = kills;
                                                if(kills == 0 && deaths == 0) kdr = 0;
                                                if(kills > 0 && deaths > 0) kdr = kills / deaths;
    
                                                leaderboardContext.font = 'bold 36pt "Sans"';
                                                leaderboardContext.textAlign = 'left'
    
                                                leaderboardContext.drawImage(profileImage, 136, (51 + (index * 206)), 155, 155);
                                                leaderboardContext.fillText(player.name, 340, (80 + (index * 206)));
                                                leaderboardContext.fillText(`KILLS: ${kills} | DEATHS: ${deaths} | KDR: ${kdr.toFixed(2)}`, 340, (171 + (index * 206)));
                                                index++; 
                                            }
    
                                            const imgBuffer = leaderboardCanvas.toBuffer('image/png')
                                            fs.writeFileSync(`./src/images/imagestorage/leaderboard_global.png`, imgBuffer)
                                            const attachment = new discord.AttachmentBuilder(`./src/images/imagestorage/leaderboard_global.png`);
                                            embed.setImage(`attachment://leaderboard_global.png`)
                                            messageId.edit({ embeds: [embed.setTitle(`GLOBAL LEADERBOARD`).setImage(`attachment://leaderboard_global.png`).setTimestamp().setFooter({text:"Leaderboard / last updated"})], files: [attachment] });  
                                        });
                                    }
                                });
                            }).catch(err => {
                                db.run("delete from leaderboard where server_id = 'global';");
                                createNewGlobalLeaderboard(channel); 
                            });
                        } else createNewGlobalLeaderboard(channel);
                    });
                });
            }, 10000);
        }
    });
}

function createNewGlobalLeaderboard(channel) {
    const embed = new discord.EmbedBuilder();
    const attachment = new discord.AttachmentBuilder(`./src/images/leaderboard/leaderboard_custom.png`);
    embed.setImage(`attachment://leaderboard_global.png`)
    channel.send({ embeds: [embed.setTitle("GLOBAL LEADERBOARD").setImage(`attachment://leaderboard_custom.png`).setTimestamp().setFooter({text:"Leaderboard / last updated"})], files: [attachment] }).then(theMsg => {
        db.all(`insert into leaderboard (channel_id, message_id, server_id) values (?,?,?);`, [config.PLAYER_PROFILER.GLOBAL_LEADERBOARD.CHANNEL_ID, theMsg.id, "global"], async function(err, table) {
            if(err) console.log(err);
        });
    }); 
}

function getGlobalLeaderboardColor(embed) {
    switch(config.PLAYER_PROFILER.GLOBAL_LEADERBOARD['COLOR(original, green, blue, black, yellow, orange, pink, red, purple, custom)']) {
        case "original":
            embed.setColor("#3e1c1f");
            break;
        case "green":
            embed.setColor("#37b302");
            break;
        case "blue":
            embed.setColor("#00aace");
            break;
        case "black":
            embed.setColor("#000000");
            break;
        case "yellow":
            embed.setColor("#db9207");
            break;
        case "orange":
            embed.setColor("#ce6b00");
            break;
        case "pink":
            embed.setColor("#d300e2");
            break;
        case "red":
            embed.setColor("#c70000");
            break;
        case "purple":
            embed.setColor("#66006e");
            break;
        case "custom":
            embed.setColor(config.PLAYER_PROFILER.GLOBAL_LEADERBOARD.CUSTOM_COLOR);
            break;
    }
}

function buttonLeaderboard(theOption, server, interaction) {
    let sqlCall;
    let leaderboardType = server.LEADERBOARD["DEFAULT_DISPLAY(wipe, lifetime)"];
    let deathsType = (leaderboardType == "wipe" ? "wipe_deaths" : "deaths");
    let killsType = (leaderboardType == "wipe" ? "wipe_kills" : "kills");
    switch(theOption) {
        case "kdr":
            sqlCall = `select * from player_info where server_id = ? order by ${killsType} / ${deathsType} desc limit 5;`;
            break;
        case "deaths":
            sqlCall = `select * from player_info where server_id = ? order by ${deathsType} desc limit 5;`;
            break;
        case "lifetime":
            killsType = "kills";
            deathsType = "deaths";
            sqlCall = "select * from player_info where server_id = ? order by kills desc limit 5;";
            break;
        case "wipe":
            killsType = "wipe_kills";
            deathsType = "wipe_deaths";
            sqlCall = "select * from player_info where server_id = ? order by wipe_kills desc limit 5;";
            break;
    }

    const embed = new discord.EmbedBuilder();
    getLeaderboardColor(embed, server);

    db.all(sqlCall, [ server.SERVER_SPECIAL_ID ], async function(err, rows) {
        if(err) return console.log("An error has occured in the leaderboard\n" + err);
        if(rows.length > 0) {
            const leaderboardCanvas = canvas.createCanvas(1920, 1080);
            const leaderboardContext = leaderboardCanvas.getContext('2d');
            leaderboardContext.fillStyle = '#ffffff';
            leaderboardContext.fillRect(0, 0, 1920, 1080);

            const leaderboardImage = await canvas.loadImage(`./src/images/leaderboard/leaderboard_${server.LEADERBOARD["COLOR(original, green, blue, black, yellow, orange, pink, red, purple, custom)"]}.png`);
            leaderboardContext.drawImage(leaderboardImage, 0, 0, 1920, 1080);
            let index = 0;

            for(let player of rows) {
                player.name = player.name.replace(/:/gi, "-");
                player.name = player.name.replace("(", "-");
                player.name = player.name.replace(")", "-");
                
                let profileImage;
                try {
                    profileImage = await canvas.loadImage(player.picture);
                } catch(err) {
                    profileImage = await canvas.loadImage('./src/images/questionmark.png');
                }

                let kdr = 0;
                let kills = parseInt(player[killsType]);
                let deaths = parseInt(player[deathsType]);
                if(kills > 0 && deaths == 0) kdr = kills;
                if(kills == 0 && deaths == 0) kdr = 0;
                if(kills > 0 && deaths > 0) kdr = kills / deaths;

                leaderboardContext.font = 'bold 36pt "Sans"';
                leaderboardContext.textBaseline = 'center';
                leaderboardContext.textAlign = 'left';

                leaderboardContext.drawImage(profileImage, 136, (51 + (index * 206)), 155, 155);
                leaderboardContext.fillText(player.name, 340, (80 + (index * 206)));
                leaderboardContext.fillText(`KILLS: ${kills} | DEATHS: ${deaths} | KDR: ${kdr.toFixed(2)}`, 340, (171 + (index * 206)));

                index++;
            }

            const imgBuffer = leaderboardCanvas.toBuffer('image/png')
            fs.writeFileSync(`./src/images/imagestorage/leaderboard_${server.SERVER_SPECIAL_ID}.png`, imgBuffer)
            const attachment = new discord.AttachmentBuilder(`./src/images/imagestorage/leaderboard_${server.SERVER_SPECIAL_ID}.png`);
            embed.setImage(`attachment://leaderboard_${server.SERVER_SPECIAL_ID}.png`)
            interaction.reply({ ephemeral: true, embeds: [embed.setTitle(server.SERVER_SHORTNAME).setImage(`attachment://leaderboard_${server.SERVER_SPECIAL_ID}.png`).setTimestamp().setFooter({text:"Leaderboard / last updated"})], files: [attachment] });    
        }
    });
}

function leaderboard(server, client) { 
    return new Promise((resolve, reject) => {
        if(!server) {
            reject("Error while reciving server details...");
        }

        const channel = client.channels.cache.get(server.LEADERBOARD.CHANNEL_ID);
        if(!channel || channel == null) {
            reject("Leaderboard channel is not valid");
        }

        if(server.LEADERBOARD.ENABLED) {
            let leaderboardCall1;
            let leaderboardCall2
            let deathsPlaceholder;
            let killsPlaceholder;
            let addedButton;
            let buttonList = new discord.ActionRowBuilder();

            switch(server.LEADERBOARD["DEFAULT_DISPLAY(wipe, lifetime)"]) {
                case "wipe":
                    leaderboardCall1 = "select * from player_info where server_id = ? order by wipe_kills desc limit 5;";
                    leaderboardCall2 = "select count(*) as CNT, sum(wipe_kills) as total_kills, sum(wipe_deaths) as total_deaths from player_info where server_id = ?;";
                    killsPlaceholder = "wipe_kills";
                    deathsPlaceholder = "wipe_deaths";
                    addedButton = new discord.ButtonBuilder().setCustomId(`lifetime`).setLabel('LIFETIME STATS').setStyle(discord.ButtonStyle.Primary)
                    break;
                    case "lifetime":
                        leaderboardCall1 = "select * from player_info where server_id = ? order by kills desc limit 5;";
                        leaderboardCall2 = "select count(*) as CNT, sum(kills) as total_kills, sum(deaths) as total_deaths from player_info where server_id = ?;";
                        killsPlaceholder = "kills";
                        deathsPlaceholder = "deaths";
                        addedButton = new discord.ButtonBuilder().setCustomId(`wipe`).setLabel('WIPE STATS').setStyle(discord.ButtonStyle.Primary)
                        break; 
            }

            buttonList.addComponents(new discord.ButtonBuilder().setCustomId(`kdr`).setLabel('KDR').setStyle(discord.ButtonStyle.Secondary));
            buttonList.addComponents(new discord.ButtonBuilder().setCustomId(`deaths`).setLabel('DEATHS').setStyle(discord.ButtonStyle.Secondary));
            buttonList.addComponents(addedButton);

            setInterval(() => {
                db.serialize(() => {
                    db.get("select DISTINCT * from leaderboard where channel_id = ? and server_id = ?;", [ server.LEADERBOARD.CHANNEL_ID, server.SERVER_SPECIAL_ID ], function(err, row) {
                        if(err) console.log(err);
                        if(row) {
                            channel.messages.fetch(row.message_id).then(messageId => {
                                const embed = new discord.EmbedBuilder();
                                getLeaderboardColor(embed, server);
    
                                db.all(leaderboardCall1, [ server.SERVER_SPECIAL_ID ], function(err, table) {
                                    if(err) console.log("Got error from leaderboard call 1\n" + err);
                                    if(table != undefined && table.length > 0) {
                                        let serverLeaderboardInfo;

                                        db.all(leaderboardCall2, [server.SERVER_SPECIAL_ID], async function(err, allInfo) {
                                            if(err) return console.log(err);
                                            if(allInfo != undefined && allInfo.length > 0) serverLeaderboardInfo = allInfo[0];

                                            const leaderboardCanvas = canvas.createCanvas(1920, 1080);
                                            const leaderboardContext = leaderboardCanvas.getContext('2d');
                                            leaderboardContext.fillStyle = "#ffffff";
                                            leaderboardContext.fillRect(0, 0, 1920, 1080);
                                            let index = 0;

                                            let imageData = await canvas.loadImage(`./src/images/leaderboard/leaderboard_${server.LEADERBOARD["COLOR(original, green, blue, black, yellow, orange, pink, red, purple, custom)"]}.png`);
                                            leaderboardContext.drawImage(imageData, 0, 0, 1920, 1080);    
                                            leaderboardContext.font = 'bold 44pt "Sans"'
                                            leaderboardContext.textBaseline = 'middle'
                                            leaderboardContext.textAlign = 'center'

                                            leaderboardContext.fillText(`${(serverLeaderboardInfo.total_kills).toLocaleString('en-US')}`, 1584, 355);
                                            leaderboardContext.fillText(`${(serverLeaderboardInfo.total_deaths).toLocaleString('en-US')}`, 1584, 562);
                                            leaderboardContext.fillText(`${(serverLeaderboardInfo.CNT).toLocaleString('en-US')}`, 1584, 769);
    
                                            for(let player of table) {

                                                player.name = player.name.replace(/:/gi, "-");
                                                player.name = player.name.replace("(", "-");
                                                player.name = player.name.replace(")", "-");
    
                                                let profileImage;
                                                try {
                                                    profileImage = await canvas.loadImage(player.picture);
                                                } catch(err) {
                                                    profileImage = await canvas.loadImage('./src/images/questionmark.png');
                                                }
    
                                                let kdr = 0;
                                                let kills = parseInt(player[killsPlaceholder]);
                                                let deaths = parseInt(player[deathsPlaceholder]);
                                                if(kills > 0 && deaths == 0) kdr = kills;
                                                if(kills == 0 && deaths == 0) kdr = 0;
                                                if(kills > 0 && deaths > 0) kdr = kills / deaths;
    
                                                leaderboardContext.font = 'bold 36pt "Sans"';
                                                leaderboardContext.textAlign = 'left'
    
                                                leaderboardContext.drawImage(profileImage, 136, (51 + (index * 206)), 155, 155);
                                                leaderboardContext.fillText(player.name, 340, (80 + (index * 206)));
                                                leaderboardContext.fillText(`KILLS: ${kills} | DEATHS: ${deaths} | KDR: ${kdr.toFixed(2)}`, 340, (171 + (index * 206)));
                                                index++; 
                                            }
    
                                            const imgBuffer = leaderboardCanvas.toBuffer('image/png')
                                            fs.writeFileSync(`./src/images/imagestorage/leaderboard_${server.SERVER_SPECIAL_ID}.png`, imgBuffer)
                                            const attachment = new discord.AttachmentBuilder(`./src/images/imagestorage/leaderboard_${server.SERVER_SPECIAL_ID}.png`);
                                            embed.setImage(`attachment://leaderboard_${server.SERVER_SPECIAL_ID}.png`)
                                            try {
                                                messageId.edit({ components: [buttonList], embeds: [embed.setTitle(`${server.SERVER_SHORTNAME} ${(server.LEADERBOARD["DEFAULT_DISPLAY(wipe, lifetime)"] = "wipe" ? "WIPE STATS" : "LIFETIME STATS")}`).setImage(`attachment://leaderboard_${server.SERVER_SPECIAL_ID}.png`).setTimestamp().setFooter({ text: "Leaderboard / last updated" })], files: [attachment] }).then(err => {
                                                    console.log(err)});
                                            } catch (e) {
                                                console.log(e);
                                            }
                                        });
                                    }
                                });
                            }).catch(err => {
                                db.run("delete from leaderboard where server_id = ?;", [server.SERVER_SPECIAL_ID]);
                                createNewLeaderboard(server, channel, buttonList); 
                            });
                        } else createNewLeaderboard(server, channel, buttonList);
                    });
                });
            }, 60000);
        }
    });
}

function getLeaderboardColor(embed, server) {
    switch(server.LEADERBOARD["COLOR(original, green, blue, black, yellow, orange, pink, red, purple, custom)"]) {
        case "original":
            embed.setColor("#3e1c1f");
            break;
        case "green":
            embed.setColor("#37b302");
            break;
        case "blue":
            embed.setColor("#00aace");
            break;
        case "black":
            embed.setColor("#000000");
            break;
        case "yellow":
            embed.setColor("#db9207");
            break;
        case "orange":
            embed.setColor("#ce6b00");
            break;
        case "pink":
            embed.setColor("#d300e2");
            break;
        case "red":
            embed.setColor("#c70000");
            break;
        case "purple":
            embed.setColor("#66006e");
            break;
        case "custom":
            embed.setColor(server.LEADERBOARD.CUSTOM_COLOR);
            break;
    }
}

function getServerStatusColor(embed, server) {
    switch(server.SERVER_STATUS_PAGE["COLOR(original, green, blue, black, yellow, orange, pink, red, purple, custom)"]) {
        case "original":
            embed.setColor("#3e1c1f");
            break;
        case "green":
            embed.setColor("#37b302");
            break;
        case "blue":
            embed.setColor("#00aace");
            break;
        case "black":
            embed.setColor("#000000");
            break;
        case "yellow":
            embed.setColor("#db9207");
            break;
        case "orange":
            embed.setColor("#ce6b00");
            break;
        case "pink":
            embed.setColor("#d300e2");
            break;
        case "red":
            embed.setColor("#c70000");
            break;
        case "purple":
            embed.setColor("#66006e");
            break;
        case "custom":
            embed.setColor(server.SERVER_STATUS_PAGE.CUSTOM_COLOR);
            break;
    }
}

function createNewLeaderboard(server, channel, buttonList) {
    const embed = new discord.EmbedBuilder();
    const attachment = new discord.AttachmentBuilder(`./src/images/leaderboard/leaderboard_${server.LEADERBOARD["COLOR(original, green, blue, black, yellow, orange, pink, red, purple, custom)"]}.png`);
    embed.setImage(`attachment://leaderboard_${server.LEADERBOARD["COLOR(original, green, blue, black, yellow, orange, pink, red, purple, custom)"]}.png`)
    channel.send({ components: [buttonList], embeds: [embed.setTitle(server.SERVER_SHORTNAME).setImage(`attachment://leaderboard_${server.LEADERBOARD["COLOR(original, green, blue, black, yellow, orange, pink, red, purple, custom)"]}.png`).setTimestamp().setFooter({text:"Leaderboard / last updated"})], files: [attachment] }).then(theMsg => {
        db.all(`insert into leaderboard (channel_id, message_id, server_id) values (?,?,?);`, [server.LEADERBOARD.CHANNEL_ID, theMsg.id, server.SERVER_SPECIAL_ID], async function(err, table) {
            if(err) console.log(err);
        });
    }); 
}

function createNewServerStatus(server, channel) {
    const embed = new discord.EmbedBuilder();
    const attachment = new discord.AttachmentBuilder(`./src/images/serverstatus/serverstatus_${server.SERVER_STATUS_PAGE["COLOR(original, green, blue, black, yellow, orange, pink, red, purple, custom)"].toLowerCase()}.png`);
    channel.send({ embeds: [embed.setTitle(server.SERVER_SHORTNAME).setImage(`attachment://ServerStatus.png`)], files: [attachment] }).then(theMsg => {
        db.run(`insert into server_status (channel_id, message_id, server_id) values (?,?,?);`, [server.SERVER_STATUS_PAGE.CHANNEL_ID, theMsg.id, server.SERVER_SPECIAL_ID ]);
    });
}

function runGlobalBot() {
    const totalPopulationBot = new discord.Client({intents: [discord.GatewayIntentBits.Guilds, discord.GatewayIntentBits.GuildMembers, discord.GatewayIntentBits.GuildEmojisAndStickers, discord.GatewayIntentBits.GuildIntegrations, discord.GatewayIntentBits.GuildWebhooks, discord.GatewayIntentBits.GuildInvites, discord.GatewayIntentBits.GuildVoiceStates, discord.GatewayIntentBits.GuildPresences, discord.GatewayIntentBits.GuildMessages, discord.GatewayIntentBits.GuildMessageReactions, discord.GatewayIntentBits.GuildMessageTyping, discord.GatewayIntentBits.DirectMessages, discord.GatewayIntentBits.DirectMessageReactions, discord.GatewayIntentBits.DirectMessageTyping, discord.GatewayIntentBits.MessageContent], shards: "auto", partials: [discord.Partials.Message, discord.Partials.Channel, discord.Partials.GuildMember, discord.Partials.Reaction, discord.Partials.GuildScheduledEvent, discord.Partials.User, discord.Partials.ThreadMember]});

    totalPopulationBot.on('ready', () => {
        setInterval(async () => {
            let popMessage;
            let totalPop = await getTotalPop().catch(() => null);

            if(!totalPop || totalPop == null) return;
            if(!config.GLOBAL_POP_BOT.MULTI_MESSAGE.ENABLED) {
                popMessage = config.GLOBAL_POP_BOT.SINGLE_MESSAGE.PLAYER_COUNT_MESSAGE.replace(/{OnlineJoiningQueued}/gi, totalPop.playersOnline+totalPop.playersJoining+totalPop.playersQueued);
                popMessage = popMessage.replace(/{maxPlayers}/gi, totalPop.maxPlayers);
            } else {
                if(totalPop.playersQueued !== 0) {
                    popMessage = config.GLOBAL_POP_BOT.MULTI_MESSAGE.PLAYERS_QUEUED_MESSAGE.replace(/{playersOnline}/gi, totalPop.playersOnline);
                    popMessage = popMessage.replace(/{maxPlayers}/gi, totalPop.maxPlayers);
                    popMessage = popMessage.replace(/{joiningPlayers}/gi, totalPop.playersJoining);
                    popMessage = popMessage.replace(/{queuedPlayers}/gi, totalPop.playersQueued);
                } else if(totalPop.playersJoining !== 0) {
                    popMessage = config.GLOBAL_POP_BOT.MULTI_MESSAGE.PLAYERS_JOINING_MESSAGE.replace(/{playersOnline}/gi, totalPop.playersOnline);
                    popMessage = popMessage.replace(/{maxPlayers}/gi, totalPop.maxPlayers);
                    popMessage = popMessage.replace(/{joiningPlayers}/gi, totalPop.playersJoining);
                    popMessage = popMessage.replace(/{queuedPlayers}/gi, totalPop.playersQueued);
                } else {
                    popMessage = config.GLOBAL_POP_BOT.MULTI_MESSAGE.PLAYER_COUNT_MESSAGE.replace(/{playersOnline}/gi, totalPop.playersOnline);
                    popMessage = popMessage.replace(/{maxPlayers}/gi, totalPop.maxPlayers);
                    popMessage = popMessage.replace(/{joiningPlayers}/gi, totalPop.playersJoining);
                    popMessage = popMessage.replace(/{queuedPlayers}/gi, totalPop.playersQueued);
                }
            }

            console.log(`(${chalk.magenta("GLOBAL")}) => 👉 [ ${chalk.cyan(totalPopulationBot.user.tag)} ] status: ${chalk.cyan(popMessage)}`);  
            totalPopulationBot.user.setPresence({ activities: [{ name: popMessage, type: discord.ActivityType.Watching }], status: "online" });
        }, 10000);
    });

    totalPopulationBot.login(config.GLOBAL_POP_BOT.BOT_TOKEN).then(() => {
        totalPopulationBot.user.setPresence({ activities: [{ name: `Establishing connection...`, type: discord.ActivityType.Watching }], status: 'idle' });
        console.log(`(${chalk.magenta("GLOBAL")}) => 💚 [ ${chalk.green(totalPopulationBot.user.tag)} ] is online... Proceeding...`);
    });
}

async function getTotalPop() {
    return new Promise((res, rej) => {
        if (globalStatus.length === 0) rej("No servers are being found (Total POP bot)...");
        let totalData = { playersOnline: 0, playersQueued: 0, playersJoining: 0, maxPlayers: 0 };

        globalStatus.forEach((pop, index) => {
            totalData.playersOnline += pop.playersOnline;
            totalData.playersQueued += pop.playersQueued;
            totalData.playersJoining += pop.playersJoining;
            totalData.maxPlayers += pop.maxPlayers;
            if (index === globalStatus.length - 1) res(totalData);
        });
    });
}

function getRandomInt(min, max) {
    return Math.random() * (max - min) + min;
}
//#endregion

//#region Process handlers
process.on("unhandledRejection", err => { 
    console.log(err)
});
process.on("uncaughtException", err => { 
    console.log(err)
});
process.on("uncaughtExceptionMonitor", err => { 
    console.log(err)
});
//#endregion