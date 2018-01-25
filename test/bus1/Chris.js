module.exports = {
	name: 'Chris',
	dormir: async function ( terms, ignite ) {
		let self = this
		setTimeout( async () => { console.log( '>>>>>>>>>', JSON.stringify( await self.harconEntities() ) ) }, 3000 )
		return 'Oui!'
	}
}
