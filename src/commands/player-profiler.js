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

      await interaction.deferReply();

      let re = /7656119([0-9]{10})/gm;
      let steamId = interaction.options._hoistedOptions[0].value;
      if(steamId.match(re) == null) return interaction.editReply("Please enter a valid steam64 ID only!");

      try {
        const rows = await new Promise((resolve, reject) => {
          db.all("select * from player_info where steam_id = ? order by lastUpdated desc;", [steamId], function(err, result) {
            if(err) return reject(err);
            resolve(result);
          });
        });

        if(!rows || rows.length == 0) return interaction.editReply(`Nobody found in the database with the steam ID ${steamId}`);

        const aggregatedRow = rows.reduce((accumulator, currentRow, index) => {
          if(index === 0) {
            accumulator.picture = currentRow.picture;
            accumulator.name = currentRow.name;
            accumulator.profile_url = currentRow.profile_url;
          }

          accumulator.kills += Number(currentRow.kills || 0);
          accumulator.deaths += Number(currentRow.deaths || 0);
          accumulator.report_count += Number(currentRow.report_count || 0);
          accumulator.chat_messages += Number(currentRow.chat_messages || 0);
          accumulator.connections += Number(currentRow.connections || 0);
          accumulator.watchlist = accumulator.watchlist || Number(currentRow.watchlist || 0);
          accumulator.ignore_f7_from = accumulator.ignore_f7_from || Number(currentRow.ignore_f7_from || 0);
          accumulator.ignore_f7_against = accumulator.ignore_f7_against || Number(currentRow.ignore_f7_against || 0);

          return accumulator;
        }, {
          kills: 0,
          deaths: 0,
          report_count: 0,
          chat_messages: 0,
          connections: 0,
          watchlist: 0,
          ignore_f7_from: 0,
          ignore_f7_against: 0,
          picture: null,
          name: null,
          profile_url: null
        });

        const result = await fetch(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${config.STEAM_API_KEY}&steamids=${steamId}`).then(res => res.json());

        if(!result.response?.players?.[0]) return interaction.editReply("Please enter a valid steam64 ID only!");

        let { personaname, avatarfull, profileurl, steamid } = result.response.players[0];

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

        context.font = 'bold 36pt Sans';
        context.textBaseline = 'middle';
        context.textAlign = 'center';

        context.fillText((aggregatedRow.kills).toLocaleString('en-US'), 975, 423);
        context.fillText((aggregatedRow.deaths).toLocaleString('en-US'), 1352, 423);
        context.fillText((aggregatedRow.deaths > 0 ? aggregatedRow.kills / aggregatedRow.deaths : aggregatedRow.kills).toFixed(2), 1731, 423);
        context.fillText((aggregatedRow.report_count).toLocaleString('en-US'), 975, 667);
        context.fillText((aggregatedRow.chat_messages).toLocaleString('en-US'), 1352, 667);
        context.fillText((aggregatedRow.connections).toLocaleString('en-US'), 1731, 667);

        context.fillText(aggregatedRow.watchlist == 0 ? "FALSE" : "TRUE", 975, 914);
        context.fillText(aggregatedRow.ignore_f7_from == 0 ? "FALSE" : "TRUE", 1352, 914);
        context.fillText(aggregatedRow.ignore_f7_against == 0 ? "FALSE" : "TRUE", 1731, 914);

        const embed = new discord.EmbedBuilder();
        const imgBuffer = canvas.toBuffer('image/png');
        fs.writeFileSync(`./src/images/imagestorage/${steamid}.png`, imgBuffer);
        const attachment = new discord.AttachmentBuilder(`./src/images/imagestorage/${steamid}.png`);
        embed.setImage(`attachment://${steamid}.png`);

        return interaction.editReply({ embeds: [embed.setImage(`attachment://${steamid}.png`).setTimestamp().setFooter({text:`Requested • ${rows.length} server${rows.length === 1 ? '' : 's'}`}).setAuthor({name:`${personaname}'s global stats`, url: profileurl, iconURL: avatarfull})], files: [attachment] });
      } catch(err) {
        console.log(err);
        return interaction.editReply("There was an error while building this player profile.");
      }
    }
 };
