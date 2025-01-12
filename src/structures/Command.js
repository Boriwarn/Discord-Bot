// Dependencies
const path = require('path');

/**
 * Command structure
 * @abstract
 */
module.exports = class Command {
	constructor(bot, {
		name = null,
		guildOnly = false,
		dirname = false,
		aliases = new Array(),
		botPermissions = new Array(),
		userPermissions = new Array(),
		examples = new Array(),
		nsfw = false,
		ownerOnly = false,
		cooldown = 3000,
		description = '',
		usage = '',
		slash = false,
		options = new Array(),
		defaultPermission = true,
	}) {
		const category = (dirname ? dirname.split(path.sep)[parseInt(dirname.split(path.sep).length - 1, 10)] : 'Other');
		this.conf = { guildOnly, userPermissions, botPermissions, nsfw, ownerOnly, cooldown, slash, options, defaultPermission };
		this.help = { name, category, aliases, description, usage, examples };
	}

	// eslint-disable-next-line no-unused-vars
	async run(...args) {
		throw new Error(`Command: ${this.help.name} does not have a run method`);
	}
};
