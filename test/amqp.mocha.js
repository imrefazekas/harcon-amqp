'use strict'

var chai = require('chai')
var should = chai.should()
var expect = chai.expect

var path = require('path')

// Requires harcon. In your app the form 'require('harcon')' should be used
var Harcon = require('harcon')
let Amqp = require('../lib/Amqp')

var Logger = require('./WinstonLogger')

var Publisher = require('./Publisher')

var Clerobee = require('clerobee')
var clerobee = new Clerobee(16)

var harconName = 'HarconTopic'
describe('harcon', function () {
	var inflicter

	before(function (done) {
		var logger = Logger.createWinstonLogger( { console: true, /* file: 'mochatest.log', */ level: 'debug' } )

		// Initializes the Harcon system
		// also initialize the deployer component which will automaticall publish every component found in folder './test/components'
		inflicter = new Harcon( {
			name: harconName,
			Barrel: Amqp.Barrel,
			logger: logger, idLength: 32,
			blower: { commTimeout: 2000, tolerates: ['Alizee.superFlegme'] },
			Marie: {greetings: 'Hi!'}
		}, function (err) {
			if (err) return done(err)

			inflicter.addicts( Publisher, function (err, res) {
				if (err) return done(err)

				Publisher.watch( path.join( process.cwd(), 'test', 'components' ) )

				// Publishes an event listener function: Peter. It just sends a simple greetings in return
				inflicter.addict( null, 'peter', 'greet.*', function (greetings1, greetings2, callback) {
					callback(null, 'Hi there!')
				} )

				// Publishes another function listening all messages which name starts with 'greet'. It just sends a simple greetings in return
				inflicter.addict( null, 'walter', 'greet.*', function (greetings1, greetings2, callback) {
					callback(null, 'My pleasure!')
				} )

				done()
			} )
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
		/* it('test network failure', function (done) {
			console.log('test network failure...')
			this.timeout(20000)
			setTimeout( function () {
				inflicter.ignite( clerobee.generate(), null, '', 'Marie.simple', 'whatsup?', 'how do you do?', function (err, res) {
					console.log('????????', err, res)
				})
			}, 7000)
			setTimeout( function () {
				console.log('SENDING!!!!!!!')
				inflicter.ignite( clerobee.generate(), null, '', 'Marie.simple', 'whatsup?', 'how do you do?', function (err, res) {
					console.log('>>>>>', err, res)
					should.not.exist(err)
					should.exist(res)

					expect( res ).to.include( 'Bonjour!' )

					done()
				})
			}, 15000)
		})*/

		it('Retrieve listeners...', function (done) {
			inflicter.listeners( function (err, listeners) {
				expect( listeners ).to.eql( [ 'Inflicter', 'Publisher', 'peter', 'walter', 'Alizee', 'Domina', 'Julie', 'Claire', 'Marie' ] )
				done(err)
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

	describe('Harcon workflow', function () {

		it('Simple greetings by name is', function (done) {
			// Sending a greetings message with 2 parameters and waiting for the proper answer
			inflicter.ignite( clerobee.generate(), null, '', 'Marie.simple', 'whatsup?', 'how do you do?', function (err, res) {
				should.not.exist(err)
				should.exist(res)
				expect( res ).to.include( 'Bonjour!' )
				done( )
			} )
		})

		it('Simple greetings is', function (done) {
			// Sending a greetings message with 2 parameters and waiting for the proper answer
			inflicter.ignite( clerobee.generate(), null, '', 'greet.simple', 'whatsup?', 'how do you do?', function (err, res) {
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
			inflicter.ignite( clerobee.generate(), null, '', 'morning.wakeup', function (err, res) {
				// console.log( err, res )

				expect(err).to.be.a('null')
				expect(res[0]).to.eql( [ 'Hi there!', 'My pleasure!' ] )
				done( )
			} )
		})

		it('General dormir', function (done) {
			inflicter.ignite( clerobee.generate(), null, '', 'morning.dormir', function (err, res) {
				// console.log( err, res )

				expect(err).to.be.a('null')
				expect(res).to.eql( [ 'Non, non, non!', 'Non, Mais non!' ] )
				done( )
			} )
		})

		it('Specific dormir', function (done) {
			inflicter.ignite( clerobee.generate(), null, '', 'morning.girls.dormir', function (err, res) {
				// console.log( err, res )

				expect(err).to.be.a('null')
				expect(res).to.eql( [ 'Non, non, non!', 'Non, Mais non!' ] )
				done( )
			} )
		})

		it('No answer', function (done) {
			// Sending a morning message and waiting for the proper answer
			this.timeout(5000)
			inflicter.ignite( clerobee.generate(), null, '', 'cave.echo', function (err, res) {
				expect(err).to.be.an.instanceof( Error )
				expect(res).to.be.a('null')
				done()
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
			inflicter.ignite( clerobee.generate(), null, harconName + '.click', 'greet.simple', 'Hi', 'Ca vas?' )
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
			inflicter.ignite( clerobee.generate(), null, harconName + '.click', 'greet.simple', 'Hi', 'Ca vas?', function (err, res) {
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

				expect( res[0][0] ).to.eql( [ 'Non, Mais non!' ] )
				expect( res[0][1] ).to.eql( [ 'Hi there!', 'My pleasure!' ] )
				expect( res[0][2] ).to.eql( [ 'Pas du tout!' ] )

				done( )
			} )
		})

		it('Deactivate', function (done) {
			// Sending a morning message and waiting for the proper answer
			inflicter.deactivate('Claire')
			inflicter.ignite( clerobee.generate(), null, harconName + '.click', 'greet.simple', 'Hi', 'Ca vas?', function (err, res) {
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
			inflicter.pendingComms( function (err, comms) {
				comms.forEach( function (comm) {
					expect( Object.keys(comm) ).to.have.lengthOf( 0 )
				} )
				done(err)
			} )
		})
	})

	after(function (done) {
		// Shuts down Harcon when it is not needed anymore
		inflicter.close()
		done()
	})
})
