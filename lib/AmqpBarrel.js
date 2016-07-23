'use strict'

let _ = require('isa.js')
let async = require('async')
let rabbit = require('rabbit.js')
let Harcon = require('harcon')
let Barrel = Harcon.Barrel
let Communication = Harcon.Communication

function AmqpBarrel ( ) { }
AmqpBarrel.prototype = new Barrel()
let amqpbarrel = AmqpBarrel.prototype

amqpbarrel.nodeNO = function ( comm ) {
	return _.isNumber( comm.valve ) ? comm.valve : Math.floor((Math.random() * this.nodeCount) + 1)
}

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

	// console.log('<><><>', division, entityName )
	socket.connect( division, entityName + '.' + self.nodeSeqNo, function ( ) {
		self.logger.harconlog( null, 'AMQP SUBSCRIBE socket is made.', { division: division, entity: entityName }, 'info' )

		callback( )
	} )
	socket.on('error', self.logger.error )
	socket.on('close', self.logger.error )
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
	socket.on('close', self.logger.error )
}

amqpbarrel.extendedInit = function ( config, callback ) {
	let self = this

	self.messages = {}
	self.outs = {}
	self.ins = {}

	self.nodeSeqNo = config.nodeSeqNo || 1
	self.nodeCount = config.nodeCount || 1

	self.connectURL = config.connectURL || 'amqp://localhost'
	self.socketType = 'PUBSUB' // PUSHWORKER || PUBSUB || PUSHPULL
	self.quiteMode = self.socketType === 'PUBSUB'
	self.timeout = config.timeout || 0
	self.expiration = config.expiration || 0

	self.reconnectionTimeout = config.reconnectionTimeout || 500
	self.reconnectionMaxTimeout = config.reconnectionMaxTimeout || 10000

	self.connect( callback )
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
	if ( !this.ins[division] ) this.ins[division] = []

	let self = this
	let fns = []
	if (context && !this.ins[division][context] )
		fns.push(function (cb) {
			self.createIn( division, context, cb )
		})
	if (!this.ins[division][name] )
		fns.push(function (cb) {
			self.createIn( division, name, cb )
		})
	async.series( fns, callback )
}

amqpbarrel.innerProcessAmqp = function ( comm ) {
	let self = this

	self.logger.harconlog( null, 'Received from bus...', comm, 'silly' )

	let realComm = Communication.importCommunication( comm.comm )
	realComm.nodeSeqNo = comm.nodeSeqNo || 1

	if ( !comm.response ) {
		// console.log( comm.callback )
		if ( comm.callback )
			realComm.callback = function () { }
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
	if ( !comm.expose && self.isSystemEvent( comm.event ) )
		return this.parentAppease( comm, err, responseComms )

	if ( !self.outs[ comm.division ] )
		return self.logger.harconlog( new Error('Division is not ready yet: ' + comm.division) )

	let entityName = comm.source // event.substring(0, comm.event.indexOf('.') )
	let packet = JSON.stringify( { id: comm.id, comm: comm, nodeSeqNo: self.nodeSeqNo, err: err ? err.message : null, response: true, responseComms: responseComms || [] } )

	self.logger.harconlog( null, 'Appeasing...', {comm: comm, err: err ? err.message : null, responseComms: responseComms}, 'silly' )
	let nodeNO = comm.nodeSeqNo || self.nodeNO( comm )
	try {
		self.outs[ comm.sourceDivision ].publish( entityName + '.' + nodeNO, packet, 'utf8')
	} catch (err) {
		self.logger.harconlog( err )
	}
}

amqpbarrel.parentIntoxicate = amqpbarrel.intoxicate
amqpbarrel.intoxicate = function ( comm ) {
	let self = this
	if ( self.isSystemEvent( comm.event ) ) return this.parentIntoxicate( comm )

	if ( !self.outs[ comm.division ] )
		return self.logger.harconlog( new Error('Division is not ready yet: ' + comm.division) )

	self.logger.harconlog( null, 'Intoxicating to bus...', comm, 'silly' )

	if ( self.messages[ comm.id ] )
		return self.logger.harconlog( new Error('Duplicate message delivery!'), comm.id )

	// console.log( '\n\n', comm.event, self.messages )
	if ( comm.callback )
		self.messages[ comm.id ] = { callback: comm.callback, timestamp: Date.now() }
	// console.log( '\n\n', comm.event, comm.division, self.messages )

	let entityName = comm.event.substring(0, comm.event.indexOf('.') )
	let packet = JSON.stringify( { id: comm.id, comm: comm, nodeSeqNo: self.nodeSeqNo, callback: !!comm.callback } )
	let nodeNO = comm.nodeSeqNo || self.nodeNO( comm )
	try {
		self.outs[ comm.division ].publish( entityName + '.' + nodeNO, packet, 'utf8')
	} catch (err) {
		self.logger.harconlog( err )
	}
}

amqpbarrel.clearClearer = function ( ) {
	if ( this.cleaner ) {
		clearInterval( this.cleaner )
		this.cleaner = null
	}
}

amqpbarrel.connect = function ( callback ) {
	let self = this

	self.ctx = rabbit.createContext( self.connectURL )
	self.reconnectionProcess = null

	self.ctx.on('error', self.reconnect.bind( self ) )
	self.ctx.on('close', self.reconnect.bind( self ) )
	self.ctx.on('ready', function () {
		self.logger.harconlog( null, 'AMQP connection is made.', self.connectURL, 'warn' )

		self.setupDomains( function () {
			if ( callback )
				callback()
		} )
	} )

	self.clearClearer()
	if ( self.timeout > 0 ) {
		self.cleaner = setInterval( function () {
			self.cleanupMessages()
		}, self.timeout )
	}
}

amqpbarrel.reconnect = function ( ) {
	let self = this

	if (self.reconnectionProcess) return

	self.logger.harconlog( null, 'Reconnecting...', self.connectURL, 'warn' )

	self.reconnectionProcess = setTimeout( function () {
		self.connect( function () {
			self.reconnectionTimeout *= 2
			if ( self.reconnectionTimeout > self.reconnectionMaxTimeout )
				self.reconnectionTimeout = self.reconnectionMaxTimeout
		} )
	}, self.reconnectionTimeout )
}

amqpbarrel.setupDomains = function ( callback ) {
	let self = this

	let fns = []
	Object.keys(self.ins).forEach( function (domain) {
		Object.keys(self.ins[domain]).forEach( function (entity) {
			fns.push( function (cb) { self.createIn( domain, entity, cb ) } )
		} )
	} )
	Object.keys(self.outs).forEach( function (division) {
		fns.push( function (cb) { self.createOut( division, cb ) } )
	} )
	async.series( fns, callback )
}

amqpbarrel.extendedClose = function ( callback ) {
	this.clearClearer()
	if ( this.ctx ) {
		this.ctx.close( callback )
	}
}

module.exports = AmqpBarrel
