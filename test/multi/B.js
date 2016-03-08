'use strict'

let Harcon = require('harcon')
let Amqp = require('../../lib/Amqp')

let Logger = require('../WinstonLogger')
let logger = Logger.createWinstonLogger( { console: true, level: 'debug' } )

let harcon = new Harcon( { Barrel: Amqp.Barrel, barrel: { }, logger: logger }, function (err) {
	if ( err ) return console.error( err )

	let Claire = {
		name: 'Claire',
		simple: function (greetings1, ignite, callback) {
			console.log('Claire is simple...')
			ignite( 'Marie.whiny', greetings1, 'Bon matin!', 'Bon jour!', 'Bon soleil!', callback )
		}
	}
	harcon.addicts( Claire, {}, function () { } )

	setTimeout( function () {
		console.log('>>>>>> Sending ...')
		harcon.simpleIgnite( 'Claire.simple', 'Hallo!', function (err, res) {
			console.log('::::::', err, res)
		} )
	}, 5000 )
} )
