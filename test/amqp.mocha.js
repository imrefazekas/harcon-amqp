var CleanTester = require('./CleanTest')

describe('harcon-amqp', function () {

	before(function (done) {
		CleanTester.init( process.env.SOCKET_TYPE || 'PUSHWORKER', function () {
			CleanTester.activatePublisher( function () {
				CleanTester.addVivian( done )
			} )
		} )
	})

	describe('Test Harcon status calls', function () {
		it('Patient...', function (done) {
			CleanTester.checkHealth( done )
		})
	})

	describe('Test Amqp calls', function () {
		it('Simple message', function (done) {
			CleanTester.checkVivian( done )
		})
	})

	describe('Harcon workflow over AMQP', function () {
		it('Simple greetings by name is', function (done) {
			CleanTester.checkMarie( done )
		})

		it('Simple greetings is', function (done) {
			CleanTester.checkGreetings( done )
		})

		it('Morning greetings is', function (done) {
			CleanTester.checkMorningGreetings( done )
		})

		it('Domina forcing is', function (done) {
			CleanTester.checkDomina( done )
		})
	})

	after(function (done) {
		CleanTester.close( done )
	})
})
