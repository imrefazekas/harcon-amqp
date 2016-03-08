'use strict'

let ctx = require('rabbit.js').createContext('amqp://localhost')

console.log( ctx.close )
/*
let pub = ctx.socket('PUB', {routing: 'topic'})
let sub = ctx.socket('SUB', {routing: 'topic'})
let sub2 = ctx.socket('SUB', {routing: 'topic'})
sub.pipe(process.stdout)
sub2.pipe(process.stdout)

sub.connect('events', 'user.*', function () {
	sub2.connect('events', 'user.*', function () {
		// Make sure we're listening before sending anything
		pub.connect('events', function () {
			pub.publish('user.create', JSON.stringify({username: "Fiver"}))
		})
	})
})

*/

let pull = ctx.socket('PULL')
function process ( ) {
	let msg
	while ( (msg = pull.read()) ) {
		console.log('>>>>>>>>', JSON.parse(msg).username )
	}
}

let push = ctx.socket('PUSH')
push.setDefaultEncoding('utf8')
pull.setEncoding('utf8')

push.connect('events', function () {
	pull.connect('events', function () {
		pull.on('readable', process )
		push.write(JSON.stringify({username: 'Fiver'}), 'utf8')
		// push.publish('user.create', JSON.stringify({username: "Fiver"}))
	})
})
