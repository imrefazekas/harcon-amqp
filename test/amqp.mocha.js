'use strict'

let chai = require('chai')
let should = chai.should()
let expect = chai.expect

let async = require('async')

let path = require('path')

// Requires harcon. In your app the form 'require('harcon')' should be used
let Harcon = require('harcon')
let Amqp = require('../lib/Amqp')

let Logger = require('./WinstonLogger')

let Clerobee = require('clerobee')
let clerobee = new Clerobee(16)

let harconName = 'HarconSys'
describe('harcon', function () {
	let inflicter

	before(function (done) {
		let logger = Logger.createWinstonLogger( { console: true } )
		// let logger = Logger.createWinstonLogger( { file: 'mochatest.log' } )

		// Initializes the Harcon system
		// also initialize the deployer component which will automaticall publish every component found in folder './test/components'
		new Harcon( {
			name: harconName,
			Barrel: Amqp.Barrel,
			logger: logger, idLength: 32,
			blower: { commTimeout: 1500, tolerates: ['Alizee.superFlegme'] },
			mortar: { enabled: true, folder: path.join( __dirname, 'components' ) },
			Marie: {greetings: 'Hi!'}
		} )
		.then( function (_inflicter) {
			inflicter = _inflicter
			return inflicter
		} )
		.then( () => {
			// Publishes an event listener function: Peter. It just sends a simple greetings in return
			return inflicter.inflicterEntity.addict( null, 'peter', 'greet.*', function (greetings1, greetings2, callback) {
				callback(null, 'Hi there!')
			} )
		} )
		.then( () => {
			// Publishes another function listening all messages which name starts with 'greet'. It just sends a simple greetings in return
			return inflicter.inflicterEntity.addict( null, 'walter', 'greet.*', function (greetings1, greetings2, callback) {
				callback(null, 'My pleasure!')
			} )
		} )
		.then( function () {
			console.log('\n\n-----------------------\n\n')
			done()
		} )
		.catch(function (reason) {
			return done(reason)
		} )
	})

	describe('Test Harcon status calls', function () {
		it('Retrieve divisions...', function (done) {
			setTimeout( function () {
				inflicter.divisions().then( function (divisions) {
					expect( divisions ).to.eql( [ harconName, harconName + '.click' ] )
					done()
				} ).catch(function (error) {
					done(error)
				})
			}, 500 )
		})
		it('Retrieve entities...', function (done) {
			inflicter.entities( function (err, entities) {
				let names = entities.map( function (entity) { return entity.name } )
				console.log( '...', err, entities, names )
				expect( names ).to.eql( [ 'Inflicter', 'peter', 'Mortar', 'Alizee', 'Bandit', 'Charlotte', 'Claire', 'Domina', 'Julie', 'Lina', 'Marie', 'Marion', 'walter' ] )
				done(err)
			} )
		})

		it('Send for divisions...', function (done) {
			inflicter.ignite( clerobee.generate(), null, '', 'Inflicter.divisions', function (err, res) {
				console.log( err, res )
				done()
			} )
		})

		it('Clean internals', function (done) {
			inflicter.pendingComms( function (err, comms) {
				comms.forEach( function (comm) {
					expect( Object.keys(comm) ).to.have.lengthOf( 0 )
				} )
				done(err)
			} )
		})
	})

	describe('Error handling', function () {
		it('Throw error', function (done) {
			inflicter.ignite( clerobee.generate(), null, '', 'Bandit.delay', function (err) {
				should.exist(err)
				done()
			} )
		})
	})

	describe('State shifting', function () {
		it('Simple case', function (done) {
			let Lina = inflicter.barrel.firestarter('Lina').object
			inflicter.ignite( clerobee.generate(), null, '', 'Marie.notify', 'data', 'Lina.marieChanged', function (err) {
				if (err) return done(err)

				inflicter.ignite( clerobee.generate(), null, '', 'Marie.simple', 'Bonjour', 'Salut', function (err) {
					if (err) return done(err)

					let pingInterval = setInterval( function () {
						if ( Lina.hasMarieChanged ) {
							clearInterval( pingInterval )
							done()
						}
					}, 500 )
				} )
			} )
		})
	})

	describe('Harcon distinguish', function () {
		it('Access distinguished entity', function (done) {
			inflicter.ignite( '0', null, '', 'Charlotte.access', function (err, res) {
				should.not.exist(err)
				should.exist(res)
				expect( res ).to.include( 'D\'accord?' )
				done( )
			} )
		})
		it('Access distinguished unique entity', function (done) {
			inflicter.ignite( '0', null, '', 'Charlotte-Unique.access', function (err, res) {
				should.not.exist(err)
				should.exist(res)
				expect( res ).to.include( 'D\'accord?' )
				done( )
			} )
		})
	})

	describe('Erupt flow', function () {
		it('Simple greetings by name is', function (done) {
			async.series([
				inflicter.erupt( '0', null, '', 'Marie.simple', 'whatsup?', 'how do you do?'),
				inflicter.erupt( '0', null, '', 'greet.simple', 'whatsup?', 'how do you do?')
			], done)
		})
		it('Marion', function (done) {
			// Sending a morning message and waiting for the proper answer
			inflicter.simpleIgnite( 'Marion.force', function (err, res) {
				should.not.exist(err)
				should.exist(res)

				expect( res[0][0] ).to.eql( [ 'Hi there!', 'My pleasure!' ] )
				expect( res[0][1] ).to.eql( [ 'Pas du tout!' ] )

				done( )
			} )
		})
	} )


	describe('Harcon workflow', function () {
		it('Simple greetings by name is', function (done) {
			// Sending a greetings message with 2 parameters and waiting for the proper answer
			inflicter.ignite( '0', null, '', 'Marie.simple', 'whatsup?', 'how do you do?', function (err, res) {
				should.not.exist(err)
				should.exist(res)
				expect( res ).to.include( 'Bonjour!' )
				done( )
			} )
		})

		it('Simple greetings is', function (done) {
			// Sending a greetings message with 2 parameters and waiting for the proper answer
			inflicter.ignite( '0', null, '', 'greet.simple', 'whatsup?', 'how do you do?', function (err, res) {
				// console.log( err, res )
				should.not.exist(err)
				should.exist(res)

				expect( res ).to.include( 'Hi there!' )
				expect( res ).to.include( 'My pleasure!' )
				expect( res ).to.include( 'Bonjour!' )

				done( )
			} )
		})

		it('Morning greetings is', function (done) {
			// Sending a morning message and waiting for the proper answer
			inflicter.ignite( '0', null, '', 'morning.wakeup', function (err, res) {
				// console.log( err, res )

				expect(err).to.be.a('null')
				expect(res[0]).to.eql( [ 'Hi there!', 'My pleasure!' ] )
				done( )
			} )
		})

		it('General dormir', function (done) {
			inflicter.ignite( '0', null, '', 'morning.dormir', function (err, res) {
				// console.log( err, res )

				expect(err).to.be.a('null')
				expect(res).to.eql( [ 'Non, non, non!', 'Non, Mais non!' ] )
				done( )
			} )
		})

		it('Specific dormir', function (done) {
			inflicter.ignite( '0', null, '', 'morning.girls.dormir', function (err, res) {
				// console.log( err, res )

				expect(err).to.be.a('null')
				expect(res).to.eql( [ 'Non, non, non!', 'Non, Mais non!' ] )
				done( )
			} )
		})

		it('No answer', function (done) {
			// Sending a morning message and waiting for the proper answer
			inflicter.ignite( '0', null, '', 'cave.echo', function (err, res) {
				// console.log( '?????', err, res )

				expect(err).to.be.an.instanceof( Error )
				expect(res).to.be.a('null')

				done( )
			} )
		})

		it('Timeout test', function (done) {
			this.timeout(5000)
			inflicter.simpleIgnite( 'Alizee.flegme', function (err, res) {
				expect(err).to.be.an.instanceof( Error )
				expect(res).to.be.a('null')

				done( )
			} )
		})

		it('Tolerated messages test', function (done) {
			this.timeout(5000)
			inflicter.simpleIgnite( 'Alizee.superFlegme', function (err, res) {
				expect(err).to.be.a('null')
				expect(res).to.eql( [ 'Quoi???' ] )

				done( err )
			} )
		})

		it('Division Promise test', function (done) {
			inflicter.ignite( '0', null, harconName + '.click', 'greet.simple', 'Hi', 'Ca vas?' )
			.then( function ( res ) {
				should.exist(res)

				expect( res ).to.include( 'Hi there!' )
				expect( res ).to.include( 'My pleasure!' )
				expect( res ).to.include( 'Bonjour!' )
				expect( res ).to.include( 'Pas du tout!' )

				done()
			})
			.catch( function ( reason ) {
				done( reason )
			} )
		})

		it('Division test', function (done) {
			// Sending a morning message and waiting for the proper answer
			inflicter.ignite( '0', null, harconName + '.click', 'greet.simple', 'Hi', 'Ca vas?', function (err, res) {
				// console.log( err, res )

				should.not.exist(err)
				should.exist(res)

				expect( res ).to.include( 'Hi there!' )
				expect( res ).to.include( 'My pleasure!' )
				expect( res ).to.include( 'Bonjour!' )
				expect( res ).to.include( 'Pas du tout!' )

				done( )
			} )
		})

		it('Domina', function (done) {
			// Sending a morning message and waiting for the proper answer
			inflicter.simpleIgnite( 'Domina.force', function (err, res) {
				should.not.exist(err)
				should.exist(res)

				expect( res[0][0] ).to.eql( [ 'Hi there!', 'My pleasure!' ] )
				expect( res[0][1] ).to.eql( [ 'Pas du tout!' ] )

				done( )
			} )
		})

		it('Deactivate', function (done) {
			// Sending a morning message and waiting for the proper answer
			inflicter.deactivate('Claire')
			inflicter.ignite( '0', null, harconName + '.click', 'greet.simple', 'Hi', 'Ca vas?', function (err, res) {
				// console.log( err, res )

				should.not.exist(err)
				should.exist(res)

				expect( res ).to.not.include( 'Pas du tout!' )

				done( )
			} )
		})

	})

	describe('Post health tests', function () {
		it('Clean internals', function (done) {
			setTimeout( () => {
				inflicter.pendingComms( function (err, comms) {
					comms.forEach( function (comm) {
						expect( Object.keys(comm) ).to.have.lengthOf( 0 )
					} )
					done(err)
				} )
			}, 1500 )
		})
	})

	after(function (done) {
		// Shuts down Harcon when it is not needed anymore
		inflicter.close()
		done()
	})
})
