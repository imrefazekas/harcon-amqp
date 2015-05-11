var CleanTester = require('./CleanTest');
var async = require('async');

function error(err){ if(err){
	console.error(err);
	process.exit(1);
} }

console.log('------');

var fnNames = [
	'init'
	, 'addVivian'
	, 'checkHealth'
	, 'checkVivian'
	, 'checkMarie'
	, 'checkGreetings'
	, 'checkMorningGreetings'
	, 'close'
];

var tasks = [];
console.log('------');
fnNames.forEach(function( fnName ){
	tasks.push(function(cb){
		CleanTester[fnName]( function(err){
			console.log('------');
			error(err);
			cb();
		});
	});
});
async.series(tasks, function(err, res){
	console.log(err, res);
});
