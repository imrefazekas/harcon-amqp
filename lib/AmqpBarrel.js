'use strict'

let async = require('async')
let rabbit = require('rabbit.js')
let Harcon = require('harcon')
let Barrel = Harcon.Barrel
let Communication = Harcon.Communication

function AmqpBarrel ( ) { }
AmqpBarrel.prototype = new Barrel()
let amqpbarrel = AmqpBarrel.prototype

amqpbarrel.createIn = function ( division, entityName, callback ) {
	let self = this

	let socket = self.ctx.socket( 'SUBSCRIBE', { routing: 'topic' } )

	self.ins[division][entityName] = socket

	socket.setEncoding('utf8')
	socket.on('data', function ( message ) {
		let comm = JSON.parse( message )
		let reComm = Communication.importCommunication( comm.comm )
		let reResComm = comm.response ? (comm.responseComms.length > 0 ? Communication.importCommunication( comm.responseComms[0] ) : reComm.twist( self.systemFirestarter.name, comm.err ) ) : null

		let interested = (!reResComm && self.matching( reComm ).length !== 0) || (reResComm && self.matchingResponse( reResComm ).length !== 0)
		if ( !interested ) return false
		self.innerProcessAmqp( comm )
	} )

	socket.connect( division, entityName + '.*', function ( ) {
		self.logger.harconlog( null, 'AMQP SUBSCRIBE socket is made.', { division: division, entity: entityName }, 'info' )

		callback( )
	} )
	socket.on('error', self.logger.error )
}

amqpbarrel.createOut = function ( division, callback ) {
	let self = this

	let socket = self.ctx.socket( 'PUBLISH', { routing: 'topic' } )

	socket.setDefaultEncoding('utf8')
	if ( self.expiration )
		socket.setsockopt('expiration', self.expiration)

	socket.connect( division, function () {
		self.logger.harconlog( null, 'AMQP PUBLISH socket is made.', division, 'info' )

		self.outs[division] = socket

		if ( callback )
			callback()
	} )
	socket.on('error', self.logger.error )
}

amqpbarrel.extendedInit = function ( config, callback ) {
	let self = this

	self.messages = {}

	self.connectURL = config.connectURL || 'amqp://localhost'
	self.socketType = 'PUBSUB' // PUSHWORKER || PUBSUB || PUSHPULL
	self.quiteMode = self.socketType === 'PUBSUB'
	self.timeout = config.timeout || 0
	self.expiration = config.expiration || 0
	self.prefetch = config.prefetch || 0
	self.ctx = rabbit.createContext( self.connectURL )
	self.ctx.on('ready', function () {
		self.logger.harconlog( null, 'AMQP connection is made.', self.connectURL, 'info' )
		self.outs = {}
		self.ins = {}

		if ( callback )
			callback()
	} )
	self.ctx.on('error', self.logger.error )

	if ( self.timeout > 0 ) {
		self.cleaner = setInterval( function () {
			self.cleanupMessages()
		}, self.timeout )
	}
}

amqpbarrel.cleanupMessages = function () {
	let self = this

	let time = Date.now()
	for ( let key of Object.keys( self.messages ) ) {
		if ( time - self.messages[key].timestamp > self.timeout ) {
			let callbackFn = self.messages[key].callback
			delete self.messages[ key ]
			callbackFn( new Error('Response timeout') )
		}
	}
}



amqpbarrel.newDivision = function ( division, callback ) {
	if ( this.outs[division] ) return callback()
	this.createOut( division, callback )
}
amqpbarrel.removeEntity = function ( division, context, name, callback) {
	callback()
}
amqpbarrel.newEntity = function ( division, context, name, callback) {
	if ( this.ins[division] && this.ins[division][name] ) return callback()

	if ( !this.ins[division] ) this.ins[division] = []

	let self = this
	let fns = []
	if (context)
		fns.push(function (cb) {
			self.createIn( division, context, cb )
		})
	fns.push(function (cb) {
		self.createIn( division, name, cb )
	})
	async.series( fns, callback )
}

amqpbarrel.innerProcessAmqp = function ( comm ) {
	let self = this

	self.logger.harconlog( null, 'Received from bus...', comm, 'silly' )

	let realComm = Communication.importCommunication( comm.comm )
	if ( !comm.response ) {
		if ( comm.callback )
			realComm.callback = function ( ) { }
		self.logger.harconlog( null, 'Request received from bus...', realComm, 'silly' )
		self.parentIntoxicate( realComm )
	} else {
		if ( self.messages[ comm.id ] ) {
			realComm.callback = self.messages[ comm.id ].callback
			delete self.messages[ comm.id ]
		}
		let responses = comm.responseComms.map(function (c) { return Communication.importCommunication( c ) })

		self.parentAppease( realComm, comm.err ? new Error(comm.err) : null, responses )
	}
}

amqpbarrel.parentAppease = amqpbarrel.appease
amqpbarrel.appease = function ( comm, err, responseComms ) {
	let self = this
	if ( !comm.expose && self.isSystemEvent( comm.event ) ) return this.parentAppease( comm, err, responseComms )

	let entityName = comm.event.substring(0, comm.event.indexOf('.') )
	let packet = JSON.stringify( { id: comm.id, comm: comm, err: err ? err.message : null, response: true, responseComms: responseComms || [] } )

	if ( !self.outs[ comm.division ] )
		return self.logger.harconlog( new Error('Division is not ready yet...', comm.division) )

	self.logger.harconlog( null, 'Appeasing...', {comm: comm, err: err ? err.message : null, responseComms: responseComms}, 'silly' )
	self.outs[ comm.division ].publish( entityName + '.1', packet, 'utf8')
}

amqpbarrel.parentIntoxicate = amqpbarrel.intoxicate
amqpbarrel.intoxicate = function ( comm ) {
	let self = this
	if ( self.isSystemEvent( comm.event ) ) return this.parentIntoxicate( comm )

	if ( !self.outs[ comm.division ] )
		return self.logger.harconlog( new Error('Division is not ready yet...', comm.division) )

	self.logger.harconlog( null, 'Intoxicating to bus...', comm, 'silly' )

	if ( self.messages[ comm.id ] )
		return self.logger.harconlog( new Error('Duplicate message delivery!'), comm.id )

	if ( comm.callback )
		self.messages[ comm.id ] = { callback: comm.callback, timestamp: Date.now() }
	let entityName = comm.event.substring(0, comm.event.indexOf('.') )
	let packet = JSON.stringify( { id: comm.id, comm: comm, callback: !!comm.callback } )
	self.outs[ comm.division ].publish( entityName + '.1', packet, 'utf8')
}

amqpbarrel.extendedClose = function ( callback ) {
	if ( this.cleaner )
		clearInterval( this.cleaner )
	if ( this.ctx )
		this.ctx.close( callback )
}

module.exports = AmqpBarrel
