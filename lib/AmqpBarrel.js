let _ = require('isa.js')
let rabbit = require('rabbit.js.ng')
let Harcon = require('harcon')
let Barrel = Harcon.Barrel
let Communication = Harcon.Communication
let Proback = require('proback.js')

let DIVISION_REPORTS = 'harcon_division_reports'

function AmqpBarrel ( ) { }
AmqpBarrel.prototype = new Barrel()
let amqpbarrel = AmqpBarrel.prototype

let SEPARATOR = '.'

amqpbarrel.randomNodeID = function ( valve, division, entityName ) {
	if ( _.isNumber( valve ) ) return valve

	if ( !this.presences || !this.presences[division] || !this.presences[division][entityName] )
		return null

	let ids = Object.keys( this.presences[division][entityName] )
	let id = ids[ Math.floor( Math.random( ) * ids.length ) ]
	return id
}

amqpbarrel.innerCreateIn = function ( division, entityName, nodeID, handler ) {
	let self = this

	return new Promise( (resolve, reject) => {
		let socket = self.ctx.socket( 'SUBSCRIBE', { routing: 'topic' } )

		if (!self.ins[division])
			self.ins[division] = {}
		self.ins[division][entityName] = { socket: socket, timestamp: Date.now() }

		socket.setEncoding('utf8')
		socket.on('data', handler )

		let socketName = entityName + (nodeID ? SEPARATOR + nodeID : nodeID)
		socket.connect( division, socketName, function ( ) {
			self.logger.harconlog( null, 'AMQP SUBSCRIBE socket is made.', { division: division, entity: entityName }, 'info' )

			resolve( socket )
		} )
		socket.on('error', reject )
		socket.on('close', reject )
	} )
}

amqpbarrel.closeIn = function ( division, entityName ) {
	let self = this
	return new Promise( (resolve, reject) => {
		try {
			if ( self.ins[division][entityName] ) {
				self.ins[division][entityName].socket.close( )
				delete self.ins[division][entityName]
			}
			resolve('ok')
		} catch (err) { reject(err) }
	} )
}

amqpbarrel.commPacket = async function ( comm ) {
	let self = this

	if ( !comm.comm ) return

	let reComm = Communication.importCommunication( comm.comm )
	let reResComm = comm.response ? (comm.responseComms.length > 0 ? Communication.importCommunication( comm.responseComms[0] ) : reComm.twist( self.systemFirestarter.name, comm.err ) ) : null

	let interested = (!reResComm && self.matching( reComm ).length !== 0) || (reResComm && self.matchingResponse( reResComm ).length !== 0)
	if ( !interested ) return false
	return await self.innerProcessAmqp( comm )
}

amqpbarrel.createDivisionIn = function ( division, force ) {
	let self = this
	if ( !force && self.ins[division][DIVISION_REPORTS] ) return 'done'

	return self.innerCreateIn( division, DIVISION_REPORTS, '', async function ( message ) {
		try {
			let status = JSON.parse( message )
			if ( status.comm )
				return await self.commPacket( status )

			if ( !status.divisions && (!status.division || !status.entity || !status.nodeID) ) return

			if ( status.divisions ) {
				for (let division of status.divisions)
					await self.extendedNewDivision( division )
				return 'ok'
			}

			if ( !self.presences[ status.division ] )
				self.presences[ status.division ] = {}
			if ( !self.presences[ status.division ][ status.entity ] )
				self.presences[ status.division ][ status.entity ] = {}

			self.presences[ status.division ][ status.entity ][ status.nodeID ] = { timestamp: Date.now(), warper: self.warper.inpose( status.warper ) }
		} catch (err) { self.logger.harconlog( err ) }
	}, true )
}

amqpbarrel.createEntityIn = function ( division, entityName, force ) {
	let self = this
	if ( !force && self.ins[division][entityName] ) return 'done'

	if (!self._divisionsManaged[division])
		self._divisionsManaged[division] = []
	if (!self._divisionsManaged[division].includes( entityName ))
		self._divisionsManaged[division].push( entityName )

	return self.innerCreateIn( division, entityName, self.nodeID, async function ( message ) {
		try {
			await self.commPacket( JSON.parse( message ) )
		} catch (err) { self.logger.harconlog( err ) }
	}, false )
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

			resolve('ok')
		} )
		socket.on('error', reject )
		socket.on('close', reject )
	} )
}

amqpbarrel.extendedInit = async function ( config ) {
	let self = this

	self.logger.harconlog( null, 'configuring AMQP Barrel.', {}, 'info' )

	self.messages = {}
	self._divisionsManaged = {}
	self.outs = {}
	self.ins = {}

	self.reporterInterval = config.reporterInterval || 2000
	self.reporter = setInterval( () => { self.reportStatus() }, self.reporterInterval )

	self.presences = {}
	self.warper.referenceMatrix( self.presences )

	self.keeperInterval = config.keeperInterval || 3000
	self.keeper = setInterval( () => { self.checkPresence() }, self.keeperInterval )

	self.connectURL = config.connectURL || 'amqp://localhost'
	self.socketType = 'PUBSUB' // PUSHWORKER || PUBSUB || PUSHPULL
	self.quiteMode = self.socketType === 'PUBSUB'
	self.timeout = config.timeout || 0
	self.expiration = config.expiration || 0

	self.reconnectionTimeout = config.reconnectionTimeout || 500
	self.reconnectionMaxTimeout = config.reconnectionMaxTimeout || 10000

	self.logger.harconlog( null, 'connecting to AMQP...', self.connectURL, 'info' )

	await self.connect( )
	return 'ok'
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

amqpbarrel.extendedNewDivision = async function ( division ) {
	let self = this
	if ( !self.ins[division] ) self.ins[division] = {}
	if ( !self.ins[division][ DIVISION_REPORTS ] )
		await self.createDivisionIn( division )
	if ( !this.outs[division] )
		await this.createOut( division )

	if (!this.presences[ division ]) this.presences[ division ] = {}
	this.presences[ division ]['*'] = { warper: this.warper.inpose( this.warper.expose() ) }

	return 'ok'
}
amqpbarrel.extendedRemoveEntity = async function ( division, context, name ) {
	var self = this

	if ( !self.ins[division] ) return 'ok'

	if ( context && self.ins[division][context] )
		await self.closeIn( division, context )
	if ( self.ins[division][name] )
		await self.closeIn( division, name )
	return 'ok'
}
amqpbarrel.extendedNewEntity = async function ( division, context, name ) {
	var self = this

	if ( !self.ins[division] ) self.ins[division] = {}
	if (context && !self.ins[division][context] )
		await self.createEntityIn( division, context )
	if (!self.ins[division][name] )
		await self.createEntityIn( division, name )
	return 'ok'
}

amqpbarrel.innerProcessAmqp = async function ( comm ) {
	let self = this

	self.logger.harconlog( null, 'Package received', comm, 'trace' )

	let realComm = Communication.importCommunication( comm.comm )

	if ( !comm.response ) {
		if ( comm.callback )
			realComm.callback = function () { }
		await self.appease( realComm )
	} else {
		if ( self.messages[ comm.id ] ) {
			realComm.callback = self.messages[ comm.id ].callback
			delete self.messages[ comm.id ]
		}
		let responses = comm.responseComms.map(function (c) { return Communication.importCommunication( c ) })
		await self.appease( realComm, comm.err ? new Error(comm.err) : null, responses )
	}
	return 'ok'
}

amqpbarrel.intoxicateMessage = async function ( comm ) {
	var self = this

	if ( self.isSystemEvent( comm.event ) )
		return this.appease( comm )

	if ( !self.outs[ comm.division ] )
		throw new Error('Division is not ready yet: ' + comm.division)

	if ( self.messages[ comm.id ] )
		throw new Error('Duplicate message delivery:' + comm.id )

	self.logger.harconlog( null, 'Packet sending', comm, 'trace' )

	if ( comm.callback )
		self.messages[ comm.id ] = { callback: comm.callback, timestamp: Date.now() }

	let entityName = comm.event.substring(0, comm.event.lastIndexOf( SEPARATOR ) )
	let packet = JSON.stringify( { id: comm.id, comm: comm, callback: !!comm.callback } )
	let nodeNO = self.randomNodeID( comm.valve, comm.division, entityName )
	self.outs[ comm.division ].publish( entityName + (nodeNO ? SEPARATOR + nodeNO : ''), packet, 'utf8')
	return 'ok'
}
amqpbarrel.intoxicateAnswer = async function ( comm, err, responseComms ) {
	var self = this

	if ( !comm.expose && self.isSystemEvent( comm.event ) )
		return this.appease( comm, err, responseComms )

	if ( !self.outs[ comm.division ] )
		throw new Error('Division is not ready yet: ' + comm.division)

	self.logger.harconlog( null, 'Packet sending', {comm: comm, err: err ? err.message || err.toString() : null, responseComms: responseComms}, 'trace' )

	let entityName = comm.source // event.substring(0, comm.event.indexOf('.') )
	let packet = JSON.stringify( { id: comm.id, comm: comm, err: err ? err.message || err.toString() : null, response: true, responseComms: responseComms || [] } )
	let nodeNO = comm.sourceNodeID || self.randomNodeID( comm.valve, comm.sourceDivision, entityName )
	self.outs[ comm.sourceDivision ].publish( entityName + (nodeNO ? (SEPARATOR + nodeNO) : ''), packet, 'utf8')
	return 'ok'
}

amqpbarrel.checkPresence = function ( ) {
	let self = this

	let timestamp = Date.now()
	Object.keys(self.presences).forEach( function (division) {
		Object.keys(self.presences[division]).forEach( function (entity) {
			Object.keys(self.presences[division][entity]).forEach( function (nodeID) {
				if ( self.presences[division][entity][nodeID].timestamp <= timestamp - self.keeperInterval )
					delete self.presences[division][entity][nodeID]
			} )
		} )
	} )
}

amqpbarrel.reportStatus = function ( ) {
	let self = this

	if (self._offline) return 'ok'

	try {
		let divisions = Object.keys(self.ins)

		if (self.outs[ self.division ])
			self.outs[ self.division ].publish( DIVISION_REPORTS, JSON.stringify( {
				divisions: divisions
			} ), 'utf8')

		divisions.forEach( function (division) {
			Object.keys(self.ins[division]).forEach( function (entity) {
				if (self.outs[ division ])
					self.outs[ division ].publish( DIVISION_REPORTS, JSON.stringify( {
						division: division, entity: entity, nodeID: self.nodeID, warper: self.warper.expose()
					} ), 'utf8')
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

amqpbarrel.clearKeeper = function ( ) {
	if (this.keeper) {
		clearInterval( this.keeper )
		this.keeper = null
	}
}

amqpbarrel.clearClearer = function ( ) {
	if ( this.cleaner ) {
		clearInterval( this.cleaner )
		this.cleaner = null
	}
}

amqpbarrel.connect = async function ( ) {
	let self = this

	return new Promise( (resolve, reject) => {
		self.ctx = rabbit.createContext( self.connectURL )

		self.ctx.on('error', () => {
			self._offline = true
			self.reconnect().catch( () => { } )
		} )
		self.ctx.on('close', () => {
			self._offline = true
			self.reconnect().catch( () => { } )
		} )
		self.ctx.on('ready', async function () {
			self._offline = false
			self.logger.harconlog( null, 'AMQP connection is made.', self.connectURL, 'warn' )
			await self.setupDivisions( )
			resolve('ok')
		} )

		self.clearClearer()
		if ( self.timeout > 0 ) {
			self.cleaner = setInterval( function () {
				self.cleanupMessages()
			}, self.timeout )
		}
	} )
}

amqpbarrel.reconnect = async function ( ) {
	let self = this

	if (self.finalised) return 'ok'

	try {
		await Proback.timeout( self.reconnectionTimeout )
		self.logger.harconlog( null, 'Reconnecting...', self.connectURL, 'warn' )

		await self.connect()

		self.logger.harconlog( null, 'Reconnected.', self.connectURL, 'warn' )

		return 'ok'
	} catch (err) {
		self.reconnectionTimeout = self.reconnectionTimeout + 250
		if ( self.reconnectionTimeout > self.reconnectionMaxTimeout )
			self.reconnectionTimeout = self.reconnectionMaxTimeout

		throw err
	}
}

amqpbarrel.setupDivisions = async function ( ) {
	let self = this

	if (self._offline) return 'ok'

	try {
		if (self.outs)
			for ( let div in self.outs)
				self.outs[div].close()
		if (self.ins)
			for ( let div in self.ins)
				for ( let entity in self.ins[div])
					self.ins[div][entity].socket.close()
	} catch ( err ) { }
	self.outs = {}
	self.ins = {}

	for ( let division in self._divisionsManaged ) {
		await self.createDivisionIn( division, true )
		await self.createOut( division )
		for ( let entity of self._divisionsManaged[division] )
			await self.createEntityIn( division, entity, true )
	}

	return 'ok'
}

amqpbarrel.extendedClose = function ( ) {
	var self = this
	return new Promise( async (resolve, reject) => {
		self.finalised = true
		self.clearReporter()
		self.clearKeeper()
		self.clearClearer()
		try {
			if ( self.ctx ) {
				self.ctx.close( () => {
					resolve('ok')
				} )
			}
			else resolve('ok')
		} catch (err) { reject(err) }
	} )
}

module.exports = AmqpBarrel
