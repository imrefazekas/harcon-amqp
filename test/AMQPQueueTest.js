'use strict'

let rabbit = require('rabbit.js')

let ctx = rabbit.createContext( 'amqp://localhost' )


let julie = {}
function createJulie ( division, name ) {
	julie.pub = ctx.socket('PUB', {routing: 'topic'})
	julie.sub = ctx.socket('SUB', {routing: 'topic'})
	julie.sub.setEncoding('utf8')
	julie.sub.on('data', function ( message ) {
		console.log('Julie received:::', message)
	} )
	julie.sub.connect( division, 'julie.*', function (err) {
		if (err) console.error(err)
		julie.pub.connect( division, function (err) {
			if (err) console.error(err)
			console.log('Julie pub connected')
			julie.connected = true
		} )
		console.log('Julie sub connected')
	} )
}

let marie = {}
function createMarie ( division, name ) {
	marie.sub = ctx.socket( 'SUB', { routing: 'topic' } )
	marie.sub.setEncoding('utf8')
	marie.sub.on('data', function ( message ) {
		console.log('Marie received:::', message)
	} )
	marie.sub.connect( division, 'marie.*', function ( ) {
		console.log('Marie sub connected')
		marie.connected = true
	} )
}

function sendMessages () {
	if ( !julie.connected || !marie.connected ) return setTimeout( sendMessages, 1000 )
	julie.pub.publish( 'marie.1', JSON.stringify('Bonjour!'), 'utf8')
}

function connected () {
	createJulie( 'demoAppTopic', 'Julie' )
	createMarie( 'demoAppTopic', 'Marie' )
	sendMessages()
}

ctx.on('ready', function () {
	console.log('Connected')
	connected()
} )
ctx.on('error', console.error )
