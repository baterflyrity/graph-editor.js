const {src, dest, series, parallel} = require('gulp');
const terser = require('gulp-terser');
const concat = require('gulp-concat');
const del = require('del');
const cleanCSS = require('gulp-clean-css');
const order = require("gulp-order");
const print = require('gulp-print').default;
const rename = require("gulp-rename");


function javascript(cb) {
	return src(['src/vendor/jquery*.js', 'src/vendor/**/*.js', 'src/**/*.js'])
		// .pipe(print(filepath => `js after: ${filepath}`))
		.pipe(terser({
			output: {
				comments: false
			}
		}))
		.pipe(concat('bundle.min.js', {newLine: ''}))
		.pipe(dest('dist/'));
}

function css(cb) {
	return src(['src/vendor/**/*.css', 'src/**/*.css'])
		// .pipe(print(filepath => `css before: ${filepath}`))
		// .pipe(order([
		// 	"src/vendor/**/*.css",
		// 	"src/**/*.css"
		// ], {base: './'}))
		// .pipe(print(filepath => `css after: ${filepath}`))
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
	return src(['src/vendor/semantic-ui/**/*.*','!src/vendor/semantic-ui/**/*.js', '!src/vendor/semantic-ui/**/*.css'])
		.pipe(rename(function (path) {
			path.dirname = "./";
		}))
		.pipe(dest('dist/'));
}

function clean(cb) {
	return del(['dist/**', '!dist']);
}

exports.default = series(clean, parallel(javascript, css, otherFiles));


