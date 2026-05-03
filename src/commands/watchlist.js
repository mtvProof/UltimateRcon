const { SlashCommandBuilder } = require("@discordjs/builders");
const sqlite3 = require('sqlite3');
let db = new sqlite3.Database('./src/database/database.sqlite3', (err) => {
    if(err) return console.log(err);
});
const { globalConfig: config } = require('../utils/configLoader');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("watchlist")
    .setDescription("Add a watch to a player")
    .addStringOption(Option => Option.setName('steam-64-id').setDescription("The users steam 64ID").setRequired(true))
    .addBooleanOption(Option => Option.setName('watch').setDescription("If the user should be added or removed from the watchlist").setRequired(true)),
    run: async (client, interaction) => {
    
    if(!config.PLAYER_PROFILER.WATCHLIST.ENABLED) return interaction.reply("This command has been disabled in the config.");
    if(config.PLAYER_PROFILER.WATCHLIST.REQUIRE_ROLES && !config.PLAYER_PROFILER.WATCHLIST.REQUIRED_ROLES.find(id => interaction.member.roles.cache.has(id))) return interaction.reply("You do not have permission to use this command");
    let re = /7656119([0-9]{10})/gm;
      const steamId = interaction.options.getString('steam-64-id');
      const watch = interaction.options.getBoolean('watch');

      if(!steamId || steamId.match(re) == null) return interaction.reply("Not a valid steam 64ID");

      db.run(`update player_info set watchlist = ? where steam_id = ?;`, [watch ? 1 : 0, steamId], function(err) {
        if(err) {
          console.log(err);
          return interaction.reply("Failed to update watchlist status.");
        }

        if(this.changes === 0) {
          db.run(`insert into player_info (steam_id, watchlist, lastUpdated) values (?, ?, ?);`, [steamId, watch ? 1 : 0, Date.now() / 1000], function(insertErr) {
            if(insertErr) {
              console.log(insertErr);
              return interaction.reply("Failed to update watchlist status.");
            }

            interaction.reply("Users watchlist status has successfully been changed");
          });
          return;
        }

        interaction.reply("Users watchlist status has successfully been changed");
      });
    }
 };
