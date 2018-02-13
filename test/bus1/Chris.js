module.exports = {
	name: 'Chris',
	auditor: true,
	init: async function (config) {
		let self = this
		self.config = config
	},
	echo: async function ( message, terms, ignite ) {
		return message
	},
	dormir: async function ( terms, ignite ) {
		let self = this
		setTimeout( async () => { console.log( '>>>>>>>>>', JSON.stringify( await self.harconEntities() ) ) }, 3000 )
		return 'Oui!'
	}
}
