var rabbit = require('rabbit.js');
var Harcon = require('harcon');
var async = require('async');
var Barrel = Harcon.Barrel;
var Communication = Harcon.Communication;

function AmqpBarrel( ){ }
AmqpBarrel.prototype = new Barrel();
var amqpbarrel = AmqpBarrel.prototype;

amqpbarrel.createPull = function( division, callback ){
	var self = this;

	var pull = self.ctx.socket('PULL');

	self.pulls[division] = pull;

	pull.setEncoding('utf8');
	pull.on('readable', function( message ){
		var msg;
		while( (msg = self.pulls[division].read()) ) {
			var comm = JSON.parse( msg );
			self.innerProcessAmqp( comm );
		}
	} );
	pull.connect( division, function( ) {
		self.logger.harconlog( null, 'AMQP pull queue is made.', division, 'info' );

		if( callback )
			callback( );
	} );
	pull.on('error', self.logger.error );
};
amqpbarrel.createPush = function( division, callback ){
	var self = this;

	var push = self.ctx.socket('PUSH');
	push.setDefaultEncoding('utf8');
	push.connect( division, function() {
		self.logger.harconlog( null, 'AMQP push queue is made.', division, 'info' );

		self.pushs[division] = push;

		if( callback )
			callback();
	} );
	push.on('error', self.logger.error );
};

amqpbarrel.extendedInit = function( config, callback ){
	var self = this;

	self.messages = {};

	var connectURL = config.connectURL || 'amqp://localhost';
	self.ctx = rabbit.createContext( connectURL );
	self.ctx.on('ready', function() {
		self.logger.harconlog( null, 'AMQP connection is made.', connectURL, 'info' );
		self.pushs = {};
		self.pulls = {};

		if( callback )
			callback();
	} );
	self.ctx.on('error', self.logger.error );
};

amqpbarrel.newDivision = function( division, callback ){
	if( this.pushs[division] ){
		return callback ? callback() : division;
	}
	var self = this;

	async.series( [
		function(cb){ self.createPull( division, cb ); },
		function(cb){ self.createPush( division, cb ); }
	], callback || function(err){
		if(err)
			console.error( err );
	} );
};

amqpbarrel.innerProcessAmqp = function( comm ){
	var self = this;

	self.logger.harconlog( null, 'Received from bus...', comm, 'silly' );

	var realComm = Communication.importCommunication( comm.comm );

	if( !comm.response ){
		if( comm.callback )
			realComm.callback = function(err, res){  };
		self.logger.harconlog( null, 'Request received from bus...', realComm, 'silly' );
		self.parentIntoxicate( realComm );
	} else {
		if( self.messages[ comm.id ] ){
			realComm.callback = self.messages[ comm.id ];
			delete self.messages[ comm.id ];
		}
		var responses = comm.responseComms.map(function(c){ return Communication.importCommunication( c ); });

		self.parentAppease( realComm, comm.err ? new Error(comm.err) : null, responses );
	}
};

amqpbarrel.parentAppease = amqpbarrel.appease;
amqpbarrel.appease = function( comm, err, responseComms ){
	var self = this;
	if( self.isSystemEvent( comm.event ) ) return this.parentAppease( comm, err, responseComms );

	var packet = JSON.stringify( { id: comm.id, comm: comm, err: err ? err.message : null, response: true, responseComms: responseComms || [] } );

	if( !self.pushs[ comm.division ] )
		return self.logger.harconlog( new Error('Division is not ready yet...', comm.division) );

	self.logger.harconlog( null, 'Appeasing...', {comm: comm, err: err ? err.message : null, responseComms: responseComms}, 'silly' );
	self.pushs[ comm.division ].write(packet, 'utf8');
};

amqpbarrel.parentIntoxicate = amqpbarrel.intoxicate;
amqpbarrel.intoxicate = function( comm ){
	var self = this;
	if( self.isSystemEvent( comm.event ) ) return this.parentIntoxicate( comm );

	if( !self.pushs[ comm.division ] )
		return self.logger.harconlog( new Error('Division is not ready yet...', comm.division) );

	self.logger.harconlog( null, 'Intoxicating to bus...', comm, 'silly' );

	if( self.messages[ comm.id ] )
		self.logger.harconlog( new Error('Duplicate message delivery!'), comm.id );

	if( comm.callback )
		self.messages[ comm.id ] = comm.callback;
	var packet = JSON.stringify( { id: comm.id, comm: comm, callback: !!comm.callback } );
	self.pushs[ comm.division ].write(packet, 'utf8');
};

amqpbarrel.extendedClose = function( callback ){
	if( this.ctx )
		this.ctx.close( callback );
};

module.exports = AmqpBarrel;
