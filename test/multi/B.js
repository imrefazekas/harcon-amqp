var Harcon = require('harcon');
var Amqp = require('../../lib/Amqp');

var Logger = require('../WinstonLogger');
var logger = Logger.createWinstonLogger( { console: true, level: 'debug' } );

var harcon = new Harcon( { Barrel: Amqp.Barrel, barrel: { socketType: 'PUBSUB' }, logger: logger }, function(err){
	if( err ) return console.error( err );

	var Claire = {
		name: 'Claire',
		simple: function (greetings1, ignite, callback) {
			console.log('Claire is simple...');
			ignite( 'Marie.whiny', greetings1, 'Bon matin!', 'Bon jour!', 'Bon soleil!', callback );
		}
	};
	harcon.addicts( Claire, {}, function(){ } );

	setTimeout( function(){
		console.log('>>>>>> Sending ...');
		harcon.simpleIgnite( 'Claire.simple', 'Hallo!', function(err, res){
			console.log('::::::', err, res);
		} );
	}, 5000 );
} );
