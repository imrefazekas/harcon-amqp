'use strict'

let Harcon = require('harcon')
let Amqp = require('../../lib/Amqp')

let Logger = require('../WinstonLogger')
let logger = Logger.createWinstonLogger( { console: true, level: 'debug' } )

let harcon = new Harcon( { Barrel: Amqp.Barrel, barrel: { }, logger: logger }, function (err) {
	if ( err ) return console.error( err )

	let Marie = {
		name: 'Marie',
		whiny: function (greetings1, greetings2, greetings3, greetings4, callback) {
			console.log( 'Marie is whiny', greetings1, greetings2, greetings3, greetings4 )
			callback( null, 'Pas du tout!' )
		}
	}
	harcon.addicts( Marie, {}, function () { } )
} )
