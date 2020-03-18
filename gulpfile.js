const {src, dest, series, parallel, task} = require('gulp');
const terser = require('gulp-terser');
const concat = require('gulp-concat');
const del = require('del');
const cleanCSS = require('gulp-clean-css');
const order = require("gulp-order");
const print = require('gulp-print').default;
const rename = require("gulp-rename");
const shell = require('gulp-shell');
const execa = require('execa');
const argv = require('yargs').argv;


async function FomanticTasksCLI() {
	const {stdout} = await execa('gulp', ['--tasks-simple'], {cwd: './src/vendor/fomantic-ui'});
	let tasks = stdout.split('\n').map(x => x.trim());
	let args = Object.getOwnPropertyNames(argv).filter(x => x.match(/^\w.*$/) && tasks.indexOf(x) !== -1);
	if (args.length) return FomanticTask(args[0])();
	else console.log(`Pass argument like --<task name> to execute Fomantic-UI tasks.\r\nAvailable Fomantic-UI tasks: ${tasks.join(', ')}.`);
}

function FomanticTask(name) {
	return async cb => {
		console.log(`Starting fomantic-UI '${name}'...`);
		return execa('gulp', [name], {cwd: './src/vendor/fomantic-ui'});
	};
}

exports.fomantic = FomanticTasksCLI;


function javascript(cb) {
	return src(['./src/vendor/jquery*.min.js', './src/vendor/vis-network.patched.js', './src/vendor/fomantic-ui/dist/**/*.min.js', './src/*.js'])
		.pipe(terser({
			output: {
				comments: false
			}
		}))
		.pipe(concat('bundle.min.js', {newLine: ''}))
		.pipe(dest('dist/'));
}

function css(cb) {
	return src(['./src/vendor/fomantic-ui/dist/*.min.css', './src/vendor/fomantic-ui/dist/components/*.min.css', './src/vendor/fomantic-ui/dist/themes/default/*.min.css', './src/*.css'])
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
	return src('./src/vendor/fomantic-ui/dist/themes/default/**/*.*')
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



