module.exports = {
	name: 'Phil',
	dormir: async function ( terms, ignite ) {
		return await ignite( 'Chris.dormir' )
	}
}
