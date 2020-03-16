import re

from requests import post
from os import makedirs
import os
from pathlib import Path
from pipeline import Generator, ParametrizedProcessor, Processor
from babel import transpile


def replace_regex(text, *patterns):
	for p in patterns:
		if isinstance(p, (tuple, list)):
			r = p[1]
			p = p[0]
		else:
			r = ''
		text = re.sub(p, r, text)
	return text


class IFile:
	_path = None


class FileString(str, IFile):
	pass


class FileBytes(bytes, IFile):
	pass


@Processor
def Print(data):
	print(data)
	return data


class RandomGenerator(Generator):


	def __init__(self, max_count=5):
		from random import randint
		def generate_count():
			return randint(1, max_count)

		self._count_generator = generate_count

	def _run(self, data):
		return ['random' for _ in range(self._count_generator())]


class Load(Generator):


	def __init__(self, glob_pattern, *ignore_patterns, text=True):
		self.pattern = glob_pattern
		self.ignore_patterns = ignore_patterns
		self.text = text

	def _read_file(self, file):
		if self.text:
			data = FileString(file.read_text('utf-8'))
		else:
			data = FileBytes(file.read_bytes())
		data._path = str(file)
		return data

	def _run(self, data):
		ignored = [x for x in [list(Path('.').glob(p)) for p in self.ignore_patterns]]
		return [self._read_file(file) for file in Path('.').glob(self.pattern) if file not in ignored]


class Save(ParametrizedProcessor):


	def __init__(self, path, as_root=False, overwrite=False):
		self.overwrite = overwrite
		self.as_root = as_root
		self.path = Path('.') / path

	def _run(self, data):
		if isinstance(data, IFile):
			if not self.path.exists():
				makedirs(str(self.path))
			if data._path is None:
				raise ValueError('File does not have path')
			if self.as_root:
				path = self.path / Path(data._path).name
			else:
				path = self.path / data._path
		else:
			path = self.path
		if not path.parent.exists():
			makedirs((str(path.parent)))
		elif path.exists() and not self.overwrite:
			raise ValueError('File {} already exists.'.format(path.absolute()))
		if isinstance(data, str):
			path.write_text(data, 'utf-8')
		else:
			path.write_bytes(data)
		return str(path)


@Processor
def Concat(data):
	if len(data) == 0:
		return None
	if isinstance(data[0], str):
		return ''.join(data)
	return b''.join(data)


@Processor
def Len(data):
	return len(data)


class Clear(ParametrizedProcessor):


	def __init__(self, directory_path):
		p = Path('.') / directory_path
		if p.exists() and not p.is_dir():
			raise ValueError('Path {] is nod directory.'.format(directory_path))
		self.path = p

	def _run(self, data):
		if self.path.exists():
			for file in self.path.glob('*'):
				file.unlink()
			self.path.rmdir()
		return data


@Processor
def MinifyJS(text):
	# """Use https://javascript-minifier.com."""
	# return post('https://javascript-minifier.com/raw', data={
	# 	'input': text
	# }).text.replace('\\n', '').replace('\\t', '')
	return replace_regex(transpile(text), r'\/\*.*?\*\/', r'\/\/.*?$', [r't\+=""use strict"', r't+="use strict"'])


@Processor
def MinifyCSS(text):
	# """Use https://cssminifier.com."""
	# return post('https://cssminifier.com/raw', data={
	# 	'input': text
	# }).text
	# CSS replace patterns from https://github.com/purple-force/css-minify/blob/master/lib/minify.js
	return replace_regex(text, r'\/\*(.|\n)*?\*\/', [r'\s*(\{|\}|\[|\]|\(|\)|\:|\;|\,)\s*', r'\1'], [r'#([\da-fA-F])\1([\da-fA-F])\2([\da-fA-F])\3', r'#\1\2\3'], [r':[\+\-]?0(rem|em|ec|ex|px|pc|pt|vh|vw|vmin|vmax|%|mm|cm|in)', r':0'], r'\n', r';\}', r'^\s+|\s+$')


js = Clear('../dist') | Load('**/*.js', '**/jquery*.min.js') > Save('../dist/bundle.min.js')
css = Load('**/*.css') > Save('../dist/bundle.min.css')
other = Load('dependencies/semantic-ui/*.*', '**/*.js', '**/*.css', text=False) | Save('../dist', True)
js.run()
css.run()
other.run()
