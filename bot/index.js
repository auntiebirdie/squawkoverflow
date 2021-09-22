const secrets = require('../secrets.json');

const {
    Client,
    Intents
} = require('discord.js');
const {
    REST
} = require('@discordjs/rest');
const {
    Routes
} = require('discord-api-types/v9');

const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS]
});

client.on('error', (err) => {
    console.log(err);
});

client.on('ready', () => {
	console.log("BirdyBOT is awake!");
});

client.on('messageCreate', (msg) => {
	if (!msg.author.bot) {
		console.log(msg);
	}
});

client.login(secrets.DISCORD.BOT_TOKEN);

module.exports = client;
