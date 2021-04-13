// Dependencies
const { timeEventSchema } = require('../database/models'),
	ms = require('ms'),
	{ MessageEmbed, MessageAttachment } = require('discord.js');

module.exports = async (bot) => {
	const events = await timeEventSchema.find({});

	// loop every 3 seconds checking each item
	setInterval(async () => {
		if (events.length == 0) return;
		// check each event
		for (let i = 0; i < events.length; i++) {
			// get settings for the guild
			const settings = bot.guilds.cache.get(events[i].guildID).settings;

			// check if current time is 'older' then event time.
			if (new Date() >= new Date(events[i].time)) {
				// if event type was reminder
				if (events[i].type == 'reminder') {
					bot.logger.debug(`Reminding ${bot.users.cache.get(events[i].userID).tag}`);
					// Message user about reminder
					const attachment = new MessageAttachment('./src/assets/imgs/Timer.png', 'Timer.png');
					const embed = new MessageEmbed()
						.setTitle(translate(settings.Language, 'FUN/REMINDER_TITLE'))
						.setColor('RANDOM')
						.attachFiles(attachment)
						.setThumbnail('attachment://Timer.png')
						.setDescription(`${events[i].message}\n[${translate(settings.Language, 'FUN/REMINDER_DESCRIPTION')}](https://discord.com/channels/${events[i].guildID}/${events[i].channelID})`)
						.setFooter(translate(settings.Language, 'FUN/REMINDER_FOOTER', ms(events[i].time, { long: true })));
					try {
						await bot.users.cache.get(events[i].userID).send(embed);
					} catch (e) {
						const channel = bot.channels.cache.get(events[i].channelID);
						if (channel) channel.send(translate(settings.Language, 'FUN/REMINDER_RESPONSE', [`\n**REMINDER:**\n ${bot.users.cache.get(events[i].userID)}`, `${events[i].message}`]));
					}
				} else if (events[i].type == 'ban') {
					// if event type was mute
					bot.logger.debug(`Unbanning ${bot.users.cache.get(events[i].userID).tag} in guild: ${bot.guilds.cache.get(events[i].guildID).id}.`);

					const bans = await bot.guilds.cache.get(events[i].guildID).fetchBans();
					if (bans.size == 0) return;
					const bUser = bans.find(ban => ban.user.id == events[i].userID);
					if (!bUser) return;
					bot.guilds.cache.get(events[i].guildID).members.unban(bUser.user);
					const channel = bot.channels.cache.get(events[i].channelID);
					if (channel) {
						const emoji = channel.permissionsFor(bot.user).has('USE_EXTERNAL_EMOJIS') ? bot.config.emojis.tick : ':white_check_mark:';
						await channel.send({ embed:{ color:3066993, description:`${emoji} ${translate(settings.Language, 'MODERATION/SUCCESSFULL_UNBAN', await bot.getUser(events[i].userID))}` } }).then(m => m.delete({ timeout: 3000 }));
					}
				} else if (events[i].type == 'mute') {
					// if event type was mute
					bot.logger.debug(`Unmuting ${bot.users.cache.get(events[i].userID).tag} in guild: ${bot.guilds.cache.get(events[i].guildID).id}.`);

					// get muted role
					const muteRole = bot.guilds.cache.get(events[i].guildID).roles.cache.get(settings.MutedRole);
					if (!muteRole) return bot.logger.error(`Muted role is missing in guild: ${bot.guilds.cache.get(events[i].guildID).id}.`);

					// get member to unmute
					const member = bot.guilds.cache.get(events[i].guildID).members.cache.get(events[i].userID);
					if (!member) return bot.logger.error(`Member is no longer in guild: ${bot.guilds.cache.get(events[i].guildID).id}.`);

					// update member
					try {
						await member.roles.remove(muteRole);
						// if in a VC unmute them
						if (member.voice.channelID) member.voice.setMute(false);

						const channel = bot.channels.cache.get(events[i].channelID);
						if (channel) {
							const emoji = channel.permissionsFor(bot.user).has('USE_EXTERNAL_EMOJIS') ? bot.config.emojis.tick : ':white_check_mark:';
							await channel.send({ embed:{ color:3066993, description:`${emoji} ${translate(settings.Language, 'MODERATION/SUCCESSFULL_UNMUTE', member.user)}` } }).then(m => m.delete({ timeout: 3000 }));
						}
					} catch (err) {
						bot.logger.error(err.message);
					}
				} else if (events[i].type == 'warning') {
					// remove warning
				}

				// Delete from database as bot didn't crash
				await timeEventSchema.findByIdAndRemove(events[i]._id, (err) => {
					if (err) console.log(err);
				});

				// delete from 'cache'
				events.splice(events.indexOf(events[i]), 1);
			}
		}
	}, 3000);
};

// for translating files as don't have access to message structure
function translate(language, key, args) {
	let languageFile;
	if (key.includes('/')) {
		const word = key.split('/');
		languageFile = require(`../languages/${language}/${word[0]}/translation`);
		return languageFile(word[1], args);
	} else {
		languageFile = require(`../languages/${language}/misc`);
		return languageFile(key, args);
	}
}