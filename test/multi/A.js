var Harcon = require('harcon');
var Amqp = require('../../lib/Amqp');

var Logger = require('../WinstonLogger');
var logger = Logger.createWinstonLogger( { console: true, level: 'debug' } );

var harcon = new Harcon( { Barrel: Amqp.Barrel, barrel: { socketType: 'PUBSUB' }, logger: logger }, function(err){
	if( err ) return console.error( err );

	var Marie = {
		name: 'Marie',
		whiny: function (greetings1, greetings2, greetings3, greetings4, callback) {
			console.log( 'Marie is whiny', greetings1, greetings2, greetings3, greetings4 );
			callback( null, 'Pas du tout!' );
		}
	};
	harcon.addicts( Marie, {}, function(){ } );
} );
