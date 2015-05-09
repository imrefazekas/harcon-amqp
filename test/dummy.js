var _ = require('lodash');

var ctx = require('rabbit.js').createContext('amqp://localhost');

console.log( ctx.close );
/*
var pub = ctx.socket('PUB', {routing: 'topic'});
var sub = ctx.socket('SUB', {routing: 'topic'});
var sub2 = ctx.socket('SUB', {routing: 'topic'});
sub.pipe(process.stdout);
sub2.pipe(process.stdout);

sub.connect('events', 'user.*', function() {
	sub2.connect('events', 'user.*', function() {
		// Make sure we're listening before sending anything
		pub.connect('events', function() {
			pub.publish('user.create', JSON.stringify({username: "Fiver"}));
		});
	});
});

*/

var pull = ctx.socket('PULL');
function process( ) {
	var msg;
	while (msg = pull.read()) {
		console.log('>>>>>>>>', JSON.parse(msg).username );
	}
}

var push = ctx.socket('PUSH');
push.setDefaultEncoding('utf8');
pull.setEncoding('utf8');

push.connect('events', function() {
	pull.connect('events', function() {
		pull.on('readable', process );
		console.log( '????????????', _.functions( push ), _.functions( pull ) );
		push.write(JSON.stringify({username: "Fiver"}), 'utf8');
		//push.publish('user.create', JSON.stringify({username: "Fiver"}));
	});
});
