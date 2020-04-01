const {src, dest, series, parallel, task} = require('gulp');
const terser = require('gulp-terser');
const concat = require('gulp-concat');
const del = require('del');
const cleanCSS = require('gulp-clean-css');
const rename = require("gulp-rename");


function javascript(cb) {
	return src(['./node_modules/jquery/dist/jquery.min.js', './node_modules/fomantic-ui/dist/semantic.js', './node_modules/vis-network/dist/vis-network.min.js', './src/**/*.js'])
		.pipe(terser({
			output: {
				comments: false
			}
		}))
		.pipe(concat('bundle.min.js', {newLine: ''}))
		.pipe(dest('dist/'));
}

function css(cb) {
	return src(['./node_modules/fomantic-ui/dist/semantic.css', './src/**/*.css'])
		.pipe(cleanCSS({
			1: {
				all: true,
				specialComments: 0
			},
			2: {
				all: true
			}
		}))
		.pipe(concat('bundle.min.css'))
		.pipe(dest('dist/'));
}

function otherFiles(cb) {
	return src('./node_modules/fomantic-ui/dist/themes/default/**/*.*')
		.pipe(rename(function (path) {
			path.dirname = 'themes\\default\\' + path.dirname;
		}))
		.pipe(dest('dist/'));
}

function clean(cb) {
	return del(['dist/**', '!dist']);
}

exports.default = series(clean, parallel(javascript, css, otherFiles));
exports.js = javascript;
exports.css = css;
exports.assets = otherFiles;



