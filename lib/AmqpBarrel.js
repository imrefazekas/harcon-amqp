'use strict'

var rabbit = require('rabbit.js')
var Harcon = require('harcon')
var async = require('async')
var Barrel = Harcon.Barrel
var Communication = Harcon.Communication

function AmqpBarrel ( ) { }
AmqpBarrel.prototype = new Barrel()
var amqpbarrel = AmqpBarrel.prototype

function socketOutContext ( ctx, socketType, options ) {
	switch ( socketType ) {
	case 'PUBSUB': return ctx.socket( 'PUBLISH' )
	case 'PUSHWORKER': return ctx.socket( 'PUSH' )
	case 'PUSHPULL': return ctx.socket( 'PUSH' )
	}
}
function socketInContext ( ctx, socketType, options ) {
	switch ( socketType ) {
	case 'PUBSUB': return ctx.socket( 'SUBSCRIBE' )
	case 'PUSHWORKER': return ctx.socket( 'WORKER', { prefetch: options.prefetch } )
	case 'PUSHPULL': return ctx.socket( 'PULL' )
	}
}

amqpbarrel.createIn = function ( division, callback ) {
	var self = this

	var socket = socketInContext( self.ctx, self.socketType, self )

	self.ins[division] = socket

	socket.setEncoding('utf8')
	socket.on('data', function ( message ) {
		var comm = JSON.parse( message )

		var reComm = Communication.importCommunication( comm.comm )
		var reResComm = comm.response ? (comm.responseComms.length > 0 ? Communication.importCommunication( comm.responseComms[0] ) : reComm.twist( self.systemFirestarter.name, comm.err ) ) : null

		var interested = (!reResComm && self.matching( reComm ).length !== 0) || (reResComm && self.matchingResponse( reResComm ).length !== 0)

		if ( self.expAck )
			socket.ack()

		if ( !interested ) return false
		self.innerProcessAmqp( comm )
	} )
	/*
	socket.on('readable', function ( message ) {
		var msg
		while( (msg = self.ins[division].read()) ) {
			var comm = JSON.parse( msg )
			self.innerProcessAmqp( comm )
		}
	} )
	*/
	socket.connect( division, function ( ) {
		self.logger.harconlog( null, 'AMQP subscribe ' + self.socketType + ' socket is made.', division, 'info' )

		if ( callback )
			callback( )
	} )
	socket.on('error', self.logger.error )
}
amqpbarrel.createOut = function ( division, callback ) {
	var self = this

	var socket = socketOutContext( self.ctx, self.socketType )
	socket.setDefaultEncoding('utf8')
	if ( self.expiration )
		socket.setsockopt('expiration', self.expiration)

	socket.connect( division, function () {
		self.logger.harconlog( null, 'AMQP publish ' + self.socketType + ' socket is made.', division, 'info' )

		self.outs[division] = socket

		if ( callback )
			callback()
	} )
	socket.on('error', self.logger.error )
}

amqpbarrel.extendedInit = function ( config, callback ) {
	var self = this

	self.messages = {}

	self.connectURL = config.connectURL || 'amqp://localhost'
	self.socketType = config.socketType || 'PUBSUB' // PUSHWORKER || PUBSUB || PUSHPULL
	self.expAck = self.socketType === 'PUSHWORKER'
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
	var self = this

	var time = Date.now()
	for ( let key of Object.keys( self.messages ) ) {
		if ( time - self.messages[key].timestamp > self.timeout ) {
			var callbackFn = self.messages[key].callback
			delete self.messages[ key ]
			callbackFn( new Error('Response timeout') )
		}
	}
}

amqpbarrel.newDivision = function ( division, callback ) {
	if ( this.outs[division] ) {
		return callback ? callback() : division
	}
	var self = this

	async.series( [
		function (cb) { self.createIn( division, cb ) },
		function (cb) { self.createOut( division, cb ) }
	], callback || function (err) {
		if (err)
			console.error( err )
	} )
}

amqpbarrel.innerProcessAmqp = function ( comm ) {
	var self = this

	self.logger.harconlog( null, 'Received from bus...', comm, 'silly' )

	var realComm = Communication.importCommunication( comm.comm )
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
		var responses = comm.responseComms.map(function (c) { return Communication.importCommunication( c ) })

		self.parentAppease( realComm, comm.err ? new Error(comm.err) : null, responses )
	}
}

amqpbarrel.parentAppease = amqpbarrel.appease
amqpbarrel.appease = function ( comm, err, responseComms ) {
	var self = this
	if ( !comm.expose && self.isSystemEvent( comm.event ) ) return this.parentAppease( comm, err, responseComms )

	var packet = JSON.stringify( { id: comm.id, comm: comm, err: err ? err.message : null, response: true, responseComms: responseComms || [] } )

	if ( !self.outs[ comm.division ] )
		return self.logger.harconlog( new Error('Division is not ready yet...', comm.division) )

	self.logger.harconlog( null, 'Appeasing...', {comm: comm, err: err ? err.message : null, responseComms: responseComms}, 'silly' )
	self.outs[ comm.division ].write(packet, 'utf8')
}

amqpbarrel.parentIntoxicate = amqpbarrel.intoxicate
amqpbarrel.intoxicate = function ( comm ) {
	var self = this
	if ( self.isSystemEvent( comm.event ) ) return this.parentIntoxicate( comm )

	if ( !self.outs[ comm.division ] )
		return self.logger.harconlog( new Error('Division is not ready yet...', comm.division) )

	self.logger.harconlog( null, 'Intoxicating to bus...', comm, 'silly' )

	if ( self.messages[ comm.id ] )
		return self.logger.harconlog( new Error('Duplicate message delivery!'), comm.id )

	if ( comm.callback )
		self.messages[ comm.id ] = { callback: comm.callback, timestamp: Date.now() }
	var packet = JSON.stringify( { id: comm.id, comm: comm, callback: !!comm.callback } )
	self.outs[ comm.division ].write(packet, 'utf8')
}

amqpbarrel.extendedClose = function ( callback ) {
	if ( this.cleaner )
		clearInterval( this.cleaner )
	if ( this.ctx )
		this.ctx.close( callback )
}

module.exports = AmqpBarrel
