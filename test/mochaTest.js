var CleanTester = require('./CleanTest');

describe("harcon-amqp", function () {

	before(function(done){
		CleanTester.init( function(){
			CleanTester.addVivian( done );
		} );
	});

	describe("Test Harcon status calls", function () {
		it('Patient...', function(done){
			CleanTester.checkHealth( done );
		});
	});

	describe("Test Amqp calls", function () {
		it('Simple message', function(done){
			CleanTester.checkVivian( done );
		});
	});

	describe("Harcon workflow over AMQP", function () {
		it('Simple greetings by name is', function(done){
			CleanTester.checkMarie( done );
		});

		it('Simple greetings is', function(done){
			CleanTester.checkGreetings( done );
		});

		it('Morning greetings is', function(done){
			CleanTester.checkMorningGreetings( done );
		});

		it('Domina forcing is', function(done){
			CleanTester.checkDomina( done );
		});

		/*
		it('General dormir', function(done){
			harcon.ignite( '0', '', 'morning.dormir', function(err, res){
				//console.log( err, res );

				expect(err).to.be.a('null');
				expect(res).to.eql( [ 'Non, non, non!', 'Non, Mais non!' ] );
				done( );
			} );
		});

		it('Specific dormir', function(done){
			harcon.ignite( '0', '', 'morning.girls.dormir', function(err, res){
				//console.log( err, res );

				expect(err).to.be.a('null');
				expect(res).to.eql( [ 'Non, non, non!', 'Non, Mais non!' ] );
				done( );
			} );
		});
		it('No answer', function(done){
			// Sending a morning message and waiting for the proper answer
			harcon.ignite( '0', '', 'cave.echo', function(err, res){
				//console.log( err, res );

				expect(err).to.be.an.instanceof( Error );
				expect(res).to.be.a('null');

				done( );
			} );
		});

		it('Division test', function(done){
			// Sending a morning message and waiting for the proper answer
			harcon.ignite( '0', 'Inflicter.click', 'greet.simple', 'Hi', 'Ca vas?', function(err, res){
				//console.log( err, res );

				should.not.exist(err); should.exist(res);

				expect( res ).to.include( 'Hi there!' );
				expect( res ).to.include( 'My pleasure!' );
				expect( res ).to.include( 'Bonjour!' );
				expect( res ).to.include( 'Pas du tout!' );

				done( );
			} );
		});

		it('Deactivate', function(done){
			// Sending a morning message and waiting for the proper answer
			harcon.deactivate('Claire');
			harcon.ignite( '0', 'click', 'greet.simple', 'Hi', 'Ca vas?', function(err, res){
				//console.log( err, res );

				should.not.exist(err); should.exist(res);

				expect( res ).to.not.include( 'Pas du tout!' );

				done( );
			} );
		});
		*/
	});

	after(function(done){
		CleanTester.close( done );
	});
});
