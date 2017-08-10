'use strict'

let _ = require('isa.js')
let rabbit = require('rabbit.js')
let Harcon = require('harcon')
let Barrel = Harcon.Barrel
let Communication = Harcon.Communication

let Proback = require('proback.js')
const sequential = Proback.syncAll

let Cerobee = require('clerobee')
let clerobee = new Cerobee( 16 )

function AmqpBarrel ( ) { }
AmqpBarrel.prototype = new Barrel()
let amqpbarrel = AmqpBarrel.prototype

let SEPARATOR = '.'

amqpbarrel.randomNodeID = function ( valve, division, entityName ) {
	if ( _.isNumber( valve ) ) return valve

	if ( !this.presences || !this.presences[division] || !this.presences[division][entityName] ) return this.nodeID

	let ids = Object.keys( this.presences[division][entityName] )
	let id = ids[ Math.floor( Math.random( ) * ids.length ) ]
	return id
}

amqpbarrel.innerCreateIn = function ( division, entityName, handler, collection ) {
	let self = this

	return new Promise( (resolve, reject) => {
		let socket = self.ctx.socket( 'SUBSCRIBE', { routing: 'topic' } )

		if (collection)
			self.ins[division][entityName] = { socket: socket, timestamp: Date.now() }

		socket.setEncoding('utf8')
		socket.on('data', handler )

		socket.connect( division, entityName, function ( ) {
			self.logger.harconlog( null, 'AMQP SUBSCRIBE socket is made.', { division: division, entity: entityName }, 'info' )

			resolve( socket )
		} )
		socket.on('error', reject )
		socket.on('close', reject )
	} )
}

amqpbarrel.createIn = function ( division, entityName ) {
	let self = this
	return Promise.all( [
		self.innerCreateIn( division, entityName, function ( message ) {
			try {
				let status = JSON.parse( message )

				if (!status.domain || !status.entity || !status.nodeID ) return

				if ( !self.presences[ status.domain ] )
					self.presences[ status.domain ] = {}
				if ( !self.presences[ status.domain ][ status.entity ] )
					self.presences[ status.domain ][ status.entity ] = {}

				self.presences[ status.domain ][ status.entity ][ self.nodeID ] = Date.now()
			} catch (err) { self.logger.harconlog( err ) }
		}, true ),
		self.innerCreateIn( division, entityName + SEPARATOR + self.nodeID, function ( message ) {
			try {
				let comm = JSON.parse( message )

				if ( !comm.comm ) return

				let reComm = Communication.importCommunication( comm.comm )
				let reResComm = comm.response ? (comm.responseComms.length > 0 ? Communication.importCommunication( comm.responseComms[0] ) : reComm.twist( self.systemFirestarter.name, comm.err ) ) : null

				let interested = (!reResComm && self.matching( reComm ).length !== 0) || (reResComm && self.matchingResponse( reResComm ).length !== 0)
				if ( !interested ) return false

				self.innerProcessAmqp( comm )
			} catch (err) { self.logger.harconlog( err ) }
		}, false )
	] )
}

amqpbarrel.createOut = function ( division ) {
	let self = this

	return new Promise( (resolve, reject) => {

		let socket = self.ctx.socket( 'PUBLISH', { routing: 'topic' } )

		socket.setDefaultEncoding('utf8')
		if ( self.expiration )
			socket.setsockopt('expiration', self.expiration)

		socket.connect( division, function () {
			self.logger.harconlog( null, 'AMQP PUBLISH socket is made.', division, 'info' )

			self.outs[division] = socket

			resolve()
		} )
		socket.on('error', reject )
		socket.on('close', reject )
	} )
}

amqpbarrel.extendedInit = function ( config, callback ) {
	let self = this

	return new Promise( (resolve, reject) => {
		self.messages = {}
		self.outs = {}
		self.ins = {}

		self.nodeID = clerobee.generate()
		self.reporterInterval = config.reporterInterval || 2000
		self.reporter = setInterval( () => { self.reportStatus() }, self.reporterInterval )
		self.presences = {}
		self.keeperInterval = config.keeperInterval || 3000
		self.keeper = setInterval( () => { self.checkPresence() }, self.keeperInterval )

		self.connectURL = config.connectURL || 'amqp://localhost'
		self.socketType = 'PUBSUB' // PUSHWORKER || PUBSUB || PUSHPULL
		self.quiteMode = self.socketType === 'PUBSUB'
		self.timeout = config.timeout || 0
		self.expiration = config.expiration || 0

		self.reconnectionTimeout = config.reconnectionTimeout || 500
		self.reconnectionMaxTimeout = config.reconnectionMaxTimeout || 10000

		self.connect( Proback.handler( callback, resolve, reject ) )
	} )
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
	var self = this
	if ( self.outs[division] ) return Proback.quicker( 'ok', callback )
	return Proback.embracer( self.createOut( division ), callback )
}

amqpbarrel.removeEntity = function ( division, context, name, callback) {
	return Proback.quicker( 'ok', callback )
}

amqpbarrel.newEntity = function ( division, context, name, callback) {
	var self = this

	return new Promise( (resolve, reject) => {
		if ( !self.ins[division] ) self.ins[division] = {}

		let fns = []
		if (context && !self.ins[division][context] )
			fns.push( function (previousResponse, responses, count) {
				return self.createIn( division, context )
			} )
		if (!self.ins[division][name] )
			fns.push( function (previousResponse, responses, count) {
				return self.createIn( division, name )
			} )
		Proback.performer(sequential( fns ), callback, resolve, reject)
	} )
}

amqpbarrel.innerProcessAmqp = function ( comm ) {
	let self = this

	self.logger.harconlog( null, 'Received from bus...', comm, 'trace' )

	let realComm = Communication.importCommunication( comm.comm )
	realComm.nodeID = comm.nodeID || self.nodeID

	if ( !comm.response ) {
		// console.log( comm.callback )
		if ( comm.callback )
			realComm.callback = function () { }
		self.logger.harconlog( null, 'Request received from bus...', realComm, 'trace' )
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
	let packet = JSON.stringify( { id: comm.id, comm: comm, nodeID: self.nodeID, err: err ? err.message : null, response: true, responseComms: responseComms || [] } )

	self.logger.harconlog( null, 'Appeasing...', {comm: comm, err: err ? err.message : null, responseComms: responseComms}, 'trace' )
	let nodeNO = comm.nodeID || self.randomNodeID( comm.valve, comm.sourceDivision, entityName )
	try {
		self.outs[ comm.sourceDivision ].publish( entityName + SEPARATOR + nodeNO, packet, 'utf8')
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

	self.logger.harconlog( null, 'Intoxicating to bus...', comm, 'trace' )

	if ( self.messages[ comm.id ] )
		return self.logger.harconlog( new Error('Duplicate message delivery!'), comm.id )

	// console.log( '\n\n', comm.event, self.messages )
	if ( comm.callback )
		self.messages[ comm.id ] = { callback: comm.callback, timestamp: Date.now() }
	// console.log( '\n\n', comm.event, comm.division, self.messages )

	let entityName = comm.event.substring(0, comm.event.indexOf( SEPARATOR ) )
	let packet = JSON.stringify( { id: comm.id, comm: comm, nodeID: self.nodeID, callback: !!comm.callback } )
	let nodeNO = comm.nodeID || self.randomNodeID( comm.valve, comm.division, entityName )
	try {
		self.outs[ comm.division ].publish( entityName + SEPARATOR + nodeNO, packet, 'utf8')
	} catch (err) {
		self.logger.harconlog( err )
	}
}

amqpbarrel.checkPresence = function ( ) {
	let self = this

	let timestamp = Date.now()
	Object.keys(self.presences).forEach( function (domain) {
		Object.keys(self.presences[domain]).forEach( function (entity) {
			Object.keys(self.presences[domain][entity]).forEach( function (nodeID) {
				if ( self.presences[domain][entity][nodeID] <= timestamp - self.keeperInterval )
					delete self.presences[domain][entity][nodeID]
			} )
		} )
	} )
}

amqpbarrel.reportStatus = function ( ) {
	let self = this

	try {
		Object.keys(self.ins).forEach( function (domain) {
			Object.keys(self.ins[domain]).forEach( function (entity) {
				if (self.outs[ domain ])
					self.outs[ domain ].publish( entity, JSON.stringify( { domain: domain, entity: entity, nodeID: self.nodeID } ), 'utf8')
			} )
		} )
	} catch ( err ) { self.logger.harconlog( err ) }
}

amqpbarrel.clearReporter = function ( ) {
	if (this.reporter) {
		clearInterval( this.reporter )
		this.reporter = null
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

	if (self.finalised || self.reconnectionProcess) return

	self.reconnectionProcess = setTimeout( function () {
		self.logger.harconlog( null, 'Reconnecting...', self.connectURL, 'warn' )

		self.connect( function () {
			self.reconnectionTimeout = self.reconnectionTimeout * 2
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
			fns.push( function (previousResponse, responses, count) { return self.createIn( domain, entity ) } )
		} )
	} )
	Object.keys(self.outs).forEach( function (division) {
		fns.push( function (previousResponse, responses, count) { return self.createOut( division ) } )
	} )
	// function (previousResponse, responses, count) {
	sequential( fns )
		.then( (res) => { callback(null, res) } )
		.catch( (reason) => { callback(reason) } )
}

amqpbarrel.extendedClose = function ( callback ) {
	var self = this
	return new Promise( (resolve, reject) => {
		self.finalised = true
		self.clearReporter()
		self.clearClearer()
		if ( self.ctx )
			self.ctx.close( Proback.handler( callback, resolve, reject ) )
		else Proback.resolver('ok', callback, resolve)
	} )
}

module.exports = AmqpBarrel
