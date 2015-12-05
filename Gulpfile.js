var gulp = global.gulp = require('gulp'),
	plugins = global.plugins = require("gulp-load-plugins")( { scope: ['devDependencies'] } );

var runSequence = global.runSequence = require('run-sequence');


gulp.task( 'eslint', function(callback) {
	return gulp.src( './lib/*.js' )
		.pipe( global.plugins.eslint() )
		.pipe( global.plugins.eslint.format() )
		.pipe( global.plugins.eslint.failOnError() );
} );

gulp.task( 'mochaTestWorker', function(callback) {
	process.env.SOCKET_TYPE = 'PUSHWORKER';
	return gulp.src( './test/mochaTest.js' ).pipe( global.plugins.mocha({reporter: 'nyan'}) );
} );
gulp.task( 'mochaTestSub', function(callback) {
	process.env.SOCKET_TYPE = 'PUBSUB';
	return gulp.src( './test/mochaTest.js' ).pipe( global.plugins.mocha({reporter: 'nyan'}) );
} );
gulp.task( 'mochaTestPull', function(callback) {
	process.env.SOCKET_TYPE = 'PUSHPULL';
	return gulp.src( './test/mochaTest.js' ).pipe( global.plugins.mocha({reporter: 'nyan'}) );
} );
gulp.task( 'mochaTest', function(callback) {
	runSequence(
		'mochaTestWorker', 'mochaTestSub', 'mochaTestPull', callback
	);
} );

gulp.task( 'doc', function(callback) {
	var doccoOptions;
	return 	gulp.src("./lib/AmqpBarrel.js")
			.pipe( global.plugins.docco( doccoOptions ) )
			.pipe( gulp.dest('./doc') );
} );

/*
var web = require('./test/web/build-web' );
gulp.task( 'build-web-test', web.buildTasks );
*/
gulp.task( 'default', ['eslint', 'mochaTest', 'doc'] );
