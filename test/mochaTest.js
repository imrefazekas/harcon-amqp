var chai = require('chai'),
	should = chai.should(),
	expect = chai.expect;

var Harcon = require('harcon');
var Amqp = require('../lib/Amqp');

var Logger = require('./WinstonLogger');
var logger = Logger.createWinstonLogger( { console: true } );

var harcon, Julie;

describe("harcon-amqp", function () {

	before(function(done){
		harcon = new Harcon( { Barrel: Amqp.Barrel, logger: logger, idLength: 32, marie: {greetings: 'Hi!'} }, function(){
			Julie = {
				name: 'Julie',
				context: 'morning',
				wakeup: function( greetings, ignite, callback ){
					callback( null, 'Thanks. ' + greetings );
				}
			};

			harcon.addicts( Julie );

			done();
		} );
	});

	describe("Test Amqp calls", function () {
		it('Simple message', function(done){
			console.log( harcon.listeners(), harcon.divisions() );
			harcon.simpleIgnite( 'Julie.wakeup', 'whatsup?', function(err, res){
				should.not.exist(err); should.exist(res);
				expect( res ).to.include( 'Thanks. whatsup?' );
				done( );
			} );
		});
	});

	after(function(done){
		if( harcon )
			harcon.close();
		done();
	});
});
