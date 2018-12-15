module.exports = {
	name: 'Phil',
	init: async function (config) {
		let self = this
		self.config = config
	},
	echo: async function ( message, terms ) {
		return message
	},
	dormir: async function ( terms ) {
		return terms.request( 'Chris.dormir' )
	}
}
