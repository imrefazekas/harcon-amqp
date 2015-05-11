var chai = require('chai'),
	should = chai.should(),
	expect = chai.expect;

var Harcon = require('harcon');
var Amqp = require('../lib/Amqp');

var Logger = require('./WinstonLogger');
var logger = Logger.createWinstonLogger( { console: true, level: 'debug' } );

var Publisher = require('./Publisher');

module.exports = {
	harcon: null,
	init: function( callback ){
		var self = this;
		self.harcon = new Harcon( { Barrel: Amqp.Barrel, logger: logger, idLength: 32, marie: {greetings: 'Hi!'} }, callback );
	},
	addVivian: function(callback){
		var self = this;
		var Vivian = {
			name: 'Vivian',
			context: 'morning',
			wakeup: function( greetings, ignite, cb ){
				cb( null, 'Thanks. ' + greetings );
			}
		};
		self.harcon.addicts( Publisher );
		Publisher.watch( './test/components', -1 );

		self.harcon.addicts( Vivian, {}, function(){
			callback();
		} );
	},
	checkHealth: function( callback ){
		var self = this;
		setTimeout( function(){
			var divisions = self.harcon.divisions();
			expect( divisions ).to.eql( [ 'Inflicter', 'Inflicter.click' ] );
			var listeners = self.harcon.listeners();
			expect( listeners ).to.eql( [ 'Inflicter', 'Publisher', 'Vivian', 'Alizee', 'Claire', 'Julie', 'Marie' ] );
			callback();
		}, 1000 );
	},
	checkVivian: function( done ){
		this.harcon.simpleIgnite( 'Vivian.wakeup', 'whatsup?', function(err, res){
			should.not.exist(err); should.exist(res);
			expect( res ).to.include( 'Thanks. whatsup?' );
			done( );
		} );
	},
	checkMarie: function(done){
		this.harcon.simpleIgnite( 'Marie.simple', 'whatsup?', 'how do you do?', function(err, res){
			console.log('>>>>>>>>>>>>>>', err, res);
			should.not.exist(err); should.exist(res);
			expect( res ).to.include( 'Bonjour!' );
			done( );
		} );
	},
	checkGreetings: function(done){
		this.harcon.simpleIgnite( 'greet.simple', 'whatsup?', 'how do you do?', function(err, res){
			console.log( '>>>>>>>>>>>>>>', err, res );
			should.not.exist(err); should.exist(res);

			expect( res ).to.include( 'Bonjour!' );

			done( );
		} );
	},
	checkMorningGreetings: function(done){
		this.harcon.simpleIgnite( 'dawn.wakeup', function(err, res){
			console.log( '>>>>>>>>>>>>>>', err, res );
			expect(err).to.be.a('null');
			expect( res[0] ).to.include( 'Bonjour!' );
			done( );
		} );
	},
	close: function( done ){
		if( this.harcon )
			this.harcon.close( done );
	}
};