from requests import post
from os import makedirs
import os
from pathlib import Path
from pipeline import Generator, ParametrizedProcessor, Processor


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


	def __init__(self, glob_pattern, text=True):
		self.pattern = glob_pattern
		self.text = text

	def _read_file(self, file):
		if self.text:
			data = FileString(file.read_text('utf-8'))
		else:
			data = FileBytes(file.read_bytes())
		data._path = str(file)
		return data

	def _run(self, data):
		return [self._read_file(file) for file in Path('.').glob(self.pattern)]


class Save(ParametrizedProcessor):


	def __init__(self, path, overwrite=False):
		self.overwrite = overwrite
		self.path = Path('.') / path

	def _run(self, data):
		if isinstance(data, IFile):
			if not self.path.exists():
				makedirs(str(self.path))
			if data._path is None:
				raise ValueError('File does not have path')
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
	"""Use https://javascript-minifier.com."""
	return post('https://javascript-minifier.com/raw', data={
		'input': text
	}).text.replace('\\n', '').replace('\\t', '')


@Processor
def MinifyCSS(text):
	"""Use https://cssminifier.com."""
	return post('https://cssminifier.com/raw', data={
		'input': text
	}).text


js = Clear('../dist') | Load('**/*.js') > MinifyJS() | Save('../dist/bundle.js')
css = Load('**/*.css') > MinifyCSS() | Save('../dist/bundle.css')
js.run()
css.run()
