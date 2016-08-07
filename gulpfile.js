/**
 * Based on Web Starter Kit
 * google/web-starter-kit/gulpfile.babel.js
 *
 */

'use strict';

//import path from 'path';
//import gulp from 'gulp';
//import del from 'del';
//import runSequence from 'run-sequence';
//import browserSync from 'browser-sync';
//import swPrecache from 'sw-precache';
//import gulpLoadPlugins from 'gulp-load-plugins';
//import {output as pagespeed} from 'psi';
//import pkg from './package.json';
//const $ = gulpLoadPlugins();
//const reload = browserSync.reload;

const gulp = require('gulp');
const fs = require("fs");

gulp.task('bower-copy', () => {

	var bowerrc;
	try {
		bowerrc = JSON.parse( fs.readFileSync("./.bowerrc"));
	} catch(err) {
		bowerrc = {};
	}
	var dir = bowerrc.directory || 'bower_components';

	gulp.src([
		'node_modules/mobx/**'
	], {
		dot: true
	}).pipe(gulp.dest(dir+'/mobx'))

	gulp.src([
		'node_modules/socket.io-client/**'
	], {
		dot: true
	}).pipe(gulp.dest(dir+'/socket.io'))

});
