const assert = require('assert')

let path = require('path')

let chai = require('chai')
// let should = chai.should()
let expect = chai.expect

let Logger = require('./PinoLogger')

let Harcon = require('harcon')
let Amqp = require('../lib/Amqp')

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, ' .... reason:', reason)
})

let Clerobee = require('clerobee')
let clerobee = new Clerobee(16)

let Proback = require('proback.js')

let harconNode1 = 'HarconSys'
let harconNode2 = 'HarconSys'
describe('harcon', function () {
	let inflicter1, inflicter2

	before( async function () {
		this.timeout(5000)

		let logger = Logger.createPinoLogger( { file: 'mochatest.log', level: 'debug' } )
		try {
			let harcon1 = new Harcon( {
				name: harconNode1,
				nodeID: 'Node1',
				Barrel: Amqp.Barrel,
				logger: logger, idLength: 32,
				mortar: { enabled: true, folder: path.join( __dirname, 'bus1' ) },
				blower: { commTimeout: 1500, tolerates: [ ] }
			} )
			inflicter1 = await harcon1.init()

			let harcon2 = new Harcon( {
				name: harconNode2,
				nodeID: 'Node2',
				Barrel: Amqp.Barrel,
				logger: logger, idLength: 32,
				mortar: { enabled: true, folder: path.join( __dirname, 'bus2' ) },
				blower: { commTimeout: 1500, tolerates: [ ] }
			} )
			inflicter2 = await harcon2.init()

			await Proback.timeout(2000)

			console.log('\n\n-----------------------\n\n')
			assert.ok( 'Harcon initiated...' )
		} catch (err) {
			console.error(err)
			assert.fail( err )
		}
	})

	describe('simple messages', function () {
		it('Phil dormir', async function () {
			let res = await inflicter2.ignite( clerobee.generate(), null, '', 'Phil.dormir' )
			expect( res ).to.eql( 'Oui!' )
		})
	})

	after(async function () {
		if (inflicter1)
			await inflicter1.close( )
		if (inflicter2)
			await inflicter2.close( )
	})
})
