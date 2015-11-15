var Harcon = require('harcon');
var Amqp = require('../lib/Amqp');

var Logger = require('./WinstonLogger');
var logger = Logger.createWinstonLogger( { console: true, level: 'debug' } );

var harcon = new Harcon( { Barrel: Amqp.Barrel, barrel: { timeout: 1000 }, logger: logger }, function(err){
	if( err ) return console.error( err );

	var Marie = {
		name: 'Marie',
		greet: function( cb ){
			cb( null, 'Hello!' );
		}
	};
	harcon.addicts( Marie, {}, function(){ } );

	setTimeout( function(){
		harcon.simpleIgnite( 'Vivian.greet', function(err, res){
			console.log('::::::', err, res);
		} );
	}, 3000 );
} );
