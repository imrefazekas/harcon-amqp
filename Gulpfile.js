var gulp = require('gulp'),
	plugins = require('gulp-load-plugins')( { scope: ['devDependencies'] } )

gulp.task( 'eslint', function (callback) {
	return gulp.src( './lib/*.js' )
		.pipe( plugins.eslint() )
		.pipe( plugins.eslint.format() )
		.pipe( plugins.eslint.failOnError() )
} )

gulp.task( 'mochaTest', function (callback) {
	return gulp.src( './test/amqp.mocha.js' ).pipe( plugins.mocha({reporter: 'nyan'}) )
} )

gulp.task( 'doc', function (callback) {
	var doccoOptions
	return 	gulp.src('./lib/AmqpBarrel.js')
			.pipe( plugins.docco( doccoOptions ) )
			.pipe( gulp.dest('./doc') )
} )

/*
var web = require('./test/web/build-web' )
gulp.task( 'build-web-test', web.buildTasks )
*/
gulp.task( 'default', gulp.series('eslint', 'mochaTest', 'doc') )
