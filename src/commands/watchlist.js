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
        if(interaction.options._hoistedOptions[0].value.match(re) == null) return interaction.reply("Not a valid steam 64ID");
        db.run(`update player_info set watchlist = ? where steam_id = ?;`, [interaction.options._hoistedOptions[1].value, interaction.options._hoistedOptions[0].value]);
        interaction.reply("Users watchlist status has successfully been changed");
    }
 };
