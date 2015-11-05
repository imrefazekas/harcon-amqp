var CleanTester = require('./CleanTest');
var async = require('async');

function error(err){ if(err){
	console.error(err);
	process.exit(1);
} }

console.log('------');

var fnNames = [
	'init'
	, 'activatePublisher'
	, 'addVivian'
	, 'checkHealth'
	, 'checkVivian'
	, 'checkMarie'
	, 'checkGreetings'
	, 'checkMorningGreetings'
	, 'checkDomina'
	, 'close'
];

var tasks = [];
fnNames.forEach(function( fnName ){
	tasks.push(function(cb){
		CleanTester[fnName]( function(err){
			console.log('------ ' + fnName + ' done. ------');
			error(err);
			cb();
		});
	});
});

async.series(tasks, function(err, res){
	if(err)
		console.error(err);
});
