var Harcon = require('harcon');
var Amqp = require('../../lib/Amqp');

var Logger = require('../WinstonLogger');
var logger = Logger.createWinstonLogger( { console: true, level: 'debug' } );

var harcon = new Harcon( { Barrel: Amqp.Barrel, logger: logger }, function(err){
	if( err ) return console.error( err );

	var Julie = {
		name: 'Julie',
		greet: function( cb ){
			cb( null, 'Hello Bello!' );
		}
	};
	harcon.addicts( Julie, {}, function(){ } );

	setTimeout( function(){
		harcon.simpleIgnite( 'Julie.greet', function(err, res){
			console.log('::::::', err, res);
		} );
	}, 5000 );
} );
