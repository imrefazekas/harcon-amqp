let path = require('path')

let Harcon = require('harcon')
let Amqp = require('../lib/Amqp')

let Logger = require('./PinoLogger')
let logger = Logger.createPinoLogger( { file: 'mochatest.log', level: 'debug' } )

let Proback = require('proback.js')

async function newHarcon ( subDivision, nodeID, busFolder ) {
	let harcon = new Harcon( {
		name: 'HarconSys',
		subDivision: subDivision,
		Barrel: Amqp.Barrel,
		barrel: { nodeID: nodeID },
		logger: logger, idLength: 32,
		mortar: { enabled: true, folder: path.join( __dirname, busFolder ) },
		blower: { commTimeout: 1500, tolerates: [ ] }
	} )
	let inflicter = await harcon.init()

	await Proback.timeout(2000)

	return inflicter
}

newHarcon( 'bank', 'Node1', 'bus1' )
	.then( (inflicter) => {
		return newHarcon( 'factory', 'Node1', 'bus2' )
	} )
	.then( (inflicter) => {
		console.log('Started...')
	} )
