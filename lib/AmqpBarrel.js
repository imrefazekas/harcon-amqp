var rabbit = require('rabbit.js');

var Harcon = require('harcon');
var Barrel = Harcon.Barrel;
var Communication = Harcon.Communication;

function AmqpBarrel( ){ }
AmqpBarrel.prototype = new Barrel();
var amqpbarrel = AmqpBarrel.prototype;

amqpbarrel.extendedInit = function( config, callback ){
	var self = this;

	self.messages = {};

	self.ctx = rabbit.createContext( config.connectURL || 'amqp://localhost' );
	self.pushs = {};
	self.pull = self.ctx.socket('PULL');
	self.pull.setEncoding('utf8');
	self.pull.connect( self.division, function() {
		self.pull.on('readable', self.processAmqp.bind(self) );

		self.newDivision( self.division, callback );
	} );
};

amqpbarrel.newDivision = function( division, callback ){
	var self = this;
	var push = self.ctx.socket('PUSH');
	push.setDefaultEncoding('utf8');
	push.connect( division, function() {
		self.pushs[division] = push;
		if( callback )
			callback();
	} );
};

amqpbarrel.innerProcessAmqp = function( comm ){
	var self = this;
	if( self.messages[ comm.id ] ){
		comm.comm.callback = self.messages[ comm.comm.id ];
		delete self.messages[ comm.id ];
	}
	if( comm.response ){
		self.parentAppease( Communication.importCommunication( comm.comm ), comm.err, comm.responseComms.map(function(c){ return Communication.importCommunication( c ); }) );
	} else{
		self.parentIntoxicate( Communication.importCommunication( comm.comm ) );
	}
};
amqpbarrel.processAmqp = function( message ){
	var self = this;
	var msg;
	while( (msg = self.pull.read()) ) {
		var comm = JSON.parse( msg );
		self.innerProcessAmqp( comm );
	}
};

amqpbarrel.parentAppease = amqpbarrel.appease;
amqpbarrel.appease = function( comm, err, responseComms ){
	var self = this;
	if( self.isSystemEvent( comm.event ) ) return this.parentAppease( comm, err, responseComms );

	if( comm.callback )
		self.messages[ comm.id ] = comm.callback;
	var packet = JSON.stringify( { id: comm.id, comm: comm, err: err, response: true, responseComms: responseComms || [] } );

	self.pushs[ comm.division ].write(packet, 'utf8');
};

amqpbarrel.parentIntoxicate = amqpbarrel.intoxicate;
amqpbarrel.intoxicate = function( comm ){
	var self = this;
	if( self.isSystemEvent( comm.event ) ) return this.parentIntoxicate( comm );

	if( comm.callback )
		self.messages[ comm.id ] = comm.callback;
	var packet = JSON.stringify( { id: comm.id, comm: comm } );
	self.pushs[ comm.division ].write(packet, 'utf8');
};

amqpbarrel.extendedClose = function( ){
	if( this.ctx )
		this.ctx.close();
	if( this.pull )
		this.pull.close();
	if( this.pushs )
		for( var division in this.pushs )
			this.pushs[ division ].close();
};

module.exports = AmqpBarrel;
