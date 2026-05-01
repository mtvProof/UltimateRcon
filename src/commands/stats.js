const discord = require('discord.js');
const { SlashCommandBuilder } = require("@discordjs/builders");
const sqlite3 = require('sqlite3');
const { loadImage, createCanvas, registerFont } = require('canvas');
registerFont('OpenSans-ExtraBold.ttf', { family: 'Sans' , weight: 'bold' });
const fs = require('fs');
let db = new sqlite3.Database('./src/database/database.sqlite3', (err) => {
  if (err) return console.log(err);
});
const { globalConfig: config } = require('../utils/configLoader');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Checks your stats")
    .addStringOption(Option => Option.setName('steam-64-id').setDescription("Your steam 64ID starts with 765611").setRequired(true)),
  run: async (client, interaction) => {

    if (!config.PLAYER_PROFILER.STATS_COMMAND.ENABLED) return interaction.reply("This command has been disabled in the config.");
    if (config.PLAYER_PROFILER.STATS_COMMAND.REQUIRE_ROLES && !config.PLAYER_PROFILER.STATS_COMMAND.REQUIRED_ROLES.find(id => interaction.member.roles.cache.has(id))) return interaction.reply("You do not have permission to use this command");
    db.get("SELECT * from player_info where steam_id = ?;", [interaction.options._hoistedOptions[0].value], async function (err, row) {
      let re = /7656119([0-9]{10})/gm;
      if (interaction.options._hoistedOptions[0].value.match(re) == null) return interaction.reply("Not a valid steam 64ID! Steam 64ID's start with 765611");
      if (err) reject(err);
      if (row) {
        const embed = new discord.EmbedBuilder();
        const canvas = createCanvas(900, 341);
        const context = canvas.getContext('2d');
        context.fillRect(0, 0, 900, 341);
        context.textBaseline = 'middle';
        context.fillStyle = '#f0f0f0';

        let backgroundImage = await loadImage(`./src/images/stats/stats_${config.PLAYER_PROFILER.STATS_COMMAND["COLOR(original, green, blue, black, yellow, orange, pink, red, purple)"]}.png`);
        let profileImage = await loadImage(row.picture);

        context.drawImage(backgroundImage, 0, 0, 900, 341);
        context.drawImage(profileImage, 12, 12, 47, 47)
        context.font = 'bold 26pt Sans'
        context.textAlign = 'left'
        context.fillText(row.name, 75, 34);
        context.textAlign = 'center'
        context.fillText(row.steam_id, 450, 302)
        context.font = 'bold 36pt Sans';
        context.fillText((row.kills).toLocaleString('en-US'), 156, 179);
        context.fillText((row.deaths).toLocaleString('en-US'), 450, 179);
        context.fillText((row.kills / row.deaths).toFixed(2), 750, 179);

        context.fillStyle = '#ffffff'
        const imgBuffer = canvas.toBuffer('image/png')
        fs.writeFileSync(`./src/images/imagestorage/${row.steam_id}.png`, imgBuffer)
        const attachment = new discord.AttachmentBuilder(`./src/images/imagestorage/${row.steam_id}.png`);
        embed.setImage(`attachment://${row.steam_id}.png`)
        interaction.reply({ embeds: [embed.setImage(`attachment://${row.steam_id}.png`).setTimestamp().setFooter({ text: "Requested" }).setAuthor({ name: `${row.name}'s stats`, url: row.profile_url, iconURL: row.picture })], files: [attachment] });
      } else {
        interaction.reply(`Nobody found in the database with the steam ID ${interaction.options._hoistedOptions[0].value}`)
      }
    });
  }
};
