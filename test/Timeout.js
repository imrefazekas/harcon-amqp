'use strict'

let Harcon = require('harcon')
let Amqp = require('../lib/Amqp')

let Logger = require('./WinstonLogger')
let logger = Logger.createWinstonLogger( { console: true, level: 'debug' } )

let harcon = new Harcon( { Barrel: Amqp.Barrel, barrel: { timeout: 1000 }, logger: logger }, function (err) {
	if ( err ) return console.error( err )

	let Marie = {
		name: 'Marie',
		greet: function ( cb ) {
			cb( null, 'Hello!' )
		}
	}
	harcon.addicts( Marie, {}, function () { } )

	setTimeout( function () {
		harcon.simpleIgnite( 'Vivian.greet', function (err, res) {
			console.log('::::::', err, res)
		} )
	}, 3000 )
} )
