const assert = require('assert')

let chai = require('chai')
let should = chai.should()
let expect = chai.expect

let path = require('path')

// Requires harcon. In your app the form 'require('harcon')' should be used
let Harcon = require('harcon')
let Amqp = require('../lib/Amqp')

let fs = require('fs')
let { promisify } = require('util')
let readFile = promisify(fs.readFile)
let writeFile = promisify(fs.writeFile)

let Logger = require('./PinoLogger')

let Clerobee = require('clerobee')
let clerobee = new Clerobee(16)

let Proback = require('proback.js')

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, ' .... reason:', reason)
})

let harconName = 'HarconSys'
describe('harcon', function () {
	let inflicter

	before( async function () {
		this.timeout(5000)

		let logger = Logger.createPinoLogger( { file: 'mochatest.log', level: 'debug' } )
		try {
			let harconPath = path.join( process.cwd(), 'node_modules', 'harcon', 'test' )
			const oldLina = await readFile( path.join( harconPath, 'livereload', 'Lina_orig.js'), { encoding: 'utf8' } )
			await writeFile( path.join( harconPath, 'entities', 'Lina.js'), oldLina, { encoding: 'utf8' } )

			let harcon = new Harcon( {
				name: harconName,
				nodeID: 'Node1',
				Barrel: Amqp.Barrel,
				logger: logger, idLength: 32,
				blower: { commTimeout: 1500, tolerates: ['Alizee.flegme'] },
				mortar: { enabled: true, folder: path.join( harconPath, 'entities' ), liveReload: true, liveReloadTimeout: 2000 },
				Marie: {greetings: 'Hi!'}
			} )

			inflicter = await harcon.init()

			await inflicter.inflicterEntity.addict( null, 'peter', 'greet.*', function (greetings1, greetings2) {
				return Proback.quicker('Hi there!')
			} )
			await inflicter.inflicterEntity.addict( null, 'walter', 'greet.*', function (greetings1, greetings2) {
				return Proback.quicker('My pleasure!')
			} )

			await Proback.timeout(2000)

			console.log('\n\n-----------------------\n\n')
			assert.ok( 'Harcon initiated...' )
		} catch (err) {
			console.error(err)
			assert.fail( err )
		}
	})

	describe('Test Harcon system calls', function () {
		it('Retrieve divisions...', async function () {
			let divisions = await inflicter.divisions()
			expect( divisions.sort() ).to.eql( [ harconName, harconName + '.click', 'HarconSys.maison.cache' ] )
		})
		it('Retrieve entities...', async function () {
			let entities = await inflicter.entities( )
			let names = entities.map( function (entity) { return entity.name } ).sort()
			expect( names ).to.eql( [ 'Alizee', 'Bandit', 'Boss', 'Charlotte', 'Claire', 'Domina', 'Inflicter', 'Julie', 'Lina', 'Margot', 'Marie', 'Marion', 'Mortar', 'peter', 'walter' ] )
		})
		it('Send for divisions...', async function () {
			let res = await inflicter.ignite( clerobee.generate(), null, '', 'Inflicter.divisions')
			expect( res.sort() ).to.eql( [ 'HarconSys', 'HarconSys.click', 'HarconSys.maison.cache' ] )
		})
		it('Clean internals', async function () {
			let comms = await inflicter.pendingComms( )
			comms.forEach( function (comm) {
				expect( Object.keys(comm) ).to.have.lengthOf( 0 )
			} )
		})
		it('Walter check', async function () {
			let res = await inflicter.ignite( clerobee.generate(), null, '', 'greet.hello', 'Bonjour!', 'Salut!')
			expect( res ).to.eql( [ 'Hi there!', 'My pleasure!' ] )
		})
	})

	describe('simple messages', function () {
		it('Alize dormir', async function () {
			this.timeout(30000)

			console.log(' ------ Waiting for rabbit to stop for 5000ms ')

			await Proback.timeout( 20000 )

			let res = await inflicter.ignite( clerobee.generate(), null, '', 'Alizee.dormir' )
			expect(res).to.eql( 'Non, non, non!' )
		})
	})

	after(async function () {
		if (inflicter)
			await inflicter.close( )
	})
})
