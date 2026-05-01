const discord = require('discord.js');
const { SlashCommandBuilder } = require("@discordjs/builders");
const fetch = require('node-fetch');
const { loadImage, createCanvas, registerFont } = require('canvas');
registerFont('OpenSans-ExtraBold.ttf', { family: 'Sans' , weight: 'bold' });
const fs = require('fs');
const sqlite3 = require('sqlite3');
let db = new sqlite3.Database('./src/database/database.sqlite3', (err) => {
    if(err) return console.log(err);
});
const { globalConfig: config } = require('../utils/configLoader');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("player-profiler")
    .setDescription("Checks a players Ultimate RCON profile.")
    .addStringOption(Option => Option.setName('steam-64-id').setDescription("The users steam 64ID").setRequired(true)),
    run: async (client, interaction) => {
    
      if(!config.PLAYER_PROFILER.PROFILE_VIEW.ENABLED) return interaction.reply("This command has been disabled in the config.");
      if(config.PLAYER_PROFILER.PROFILE_VIEW.REQUIRE_ROLES && !config.PLAYER_PROFILER.PROFILE_VIEW.REQUIRED_ROLES.find(id => interaction.member.roles.cache.has(id))) return interaction.reply("You do not have permission to use this command");
      db.get("select * from player_info where steam_id = ?;", [interaction.options._hoistedOptions[0].value], async function(err, row) {
        if(err) reject(err);
        if(row) {
          fetch(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${config.STEAM_API_KEY}&steamids=${interaction.options._hoistedOptions[0].value}`).then(res => res.json()).then(async result => {
            if(!result.response.players[0]) {
              await interaction.deferReply({ ephemeral: true });
              interaction.reply({
                  embeds: [embed.setDescription("Please enter a valid steam64 ID only!")], ephemeral: true
              });
            } else {
              let { personaname, avatarfull, profileurl, steamid, timecreated } = result.response.players[0];

              const canvas = createCanvas(1920, 1080);
              const context = canvas.getContext('2d');
              context.fillRect(0, 0, 1920, 1080);
              context.textBaseline = 'top';
              context.textAlign = 'left';
              context.fillStyle = '#f0f0f0';

              let backgroundImage = await loadImage('./src/images/playerprofiler/PlayerProfiler.png');
              let profileImage = await loadImage(avatarfull);
              context.drawImage(backgroundImage, 0, 0, 1920, 1080);
              context.drawImage(profileImage, 84, 380, 646, 646);

              context.font = 'bold 55pt Sans';
              context.drawImage(profileImage, 84, 380, 646, 646);
              context.fillText(personaname, 84, 75);
              context.fillText(steamid, 84, 155);

              context.font = 'bold 36pt Sans';;
              context.textBaseline = 'middle';
              context.textAlign = 'center';

              context.fillText((row.kills).toLocaleString('en-US'), 975, 423);
              context.fillText((row.deaths).toLocaleString('en-US'), 1352, 423);
              context.fillText((row.kills / row.deaths).toFixed(2), 1731, 423);
              context.fillText((row.report_count).toLocaleString('en-US'), 975, 667);
              context.fillText((row.chat_messages).toLocaleString('en-US'), 1352, 667);
              context.fillText((row.connections).toLocaleString('en-US'), 1731, 667);

              context.fillText(row.watchlist == 0 ? "FALSE" : "TRUE", 975, 914);
              context.fillText(row.ignore_f7_from == 0 ? "FALSE" : "TRUE", 1352, 914);
              context.fillText(row.ignore_f7_against == 0 ? "FALSE" : "TRUE", 1731, 914);

              const embed = new discord.EmbedBuilder();
              const imgBuffer = canvas.toBuffer('image/png')
              fs.writeFileSync(`./src/images/imagestorage/${steamid}.png`, imgBuffer)
              const attachment = new discord.AttachmentBuilder(`./src/images/imagestorage/${steamid}.png`);
              embed.setImage(`attachment://${steamid}.png`)
              interaction.reply({ embeds: [embed.setImage(`attachment://${steamid}.png`).setTimestamp().setFooter({text:"Requested"}).setAuthor({name:`${personaname}'s stats`, url: profileurl, iconURL: avatarfull})], files: [attachment] });  
            }
          });
        }
      });
    }
 };
