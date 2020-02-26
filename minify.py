# coding=utf-8
"""Run this file to build sources."""

import os
import re
import requests
import shutil
import zipfile


def minify(js_files=None, css_files=None, html_files=None):
	"""Minify and overwrite files.
	For each files type assign array of sources paths. They will be minified and stored in dist/<path>."""
	minify_files(assert_list(js_files), js_minify)
	minify_files(assert_list(css_files), css_minify)


# minify_files(assert_list(html_files), html_minify)

def js_minify(text):
	"""Use https://javascript-minifier.com."""
	return requests.post('https://javascript-minifier.com/raw', data={
		'input': text
	}).text.replace('\\n', '').replace('\\t', '')


def css_minify(text):
	"""Use https://cssminifier.com."""
	return requests.post('https://cssminifier.com/raw', data={
		'input': text
	}).text


def clear_path(path):
	"""
	Remove
	all
	files in directory.
	"""
	files = os.listdir(path)
	for f in files:
		if f[0] != '.':
			os.remove(path + '/' + f)
	if os.path.exists(f'graph-editor{VERSION}.min'):
		if not os.path.isfile(f'graph-editor{VERSION}.min'):
			raise ValueError(f'graph-editor{VERSION}.min is already exists and it it not an archive.')
		os.remove(f'graph-editor{VERSION}.min')


def minify_files(files, minifier):
	"""
Minify
list
of
files.
"""
	for file in files:
		write(DIST + '/' + file[1], minifier(read(file[0])))


def read(path):
	"""
Read
all
text
from file in UTF - 8.
"""
	with open(path, 'r', encoding='utf-8') as f:
		return f.read()


def write(path, text):
	"""
Write
all
text
to
file in UTF - 8.
"""
	with open(path, 'w', encoding='utf-8') as f:
		f.write(text)


def assert_list(lst):
	"""
Return
list or empty
list if first
equals
False.
"""
	if not lst:
		return []
	return [isinstance(double, list) and len(double) == 2 and double or [double, double] for double in lst]


def set_globals(text):
	"""Set all patterns {{NAME}} to corresponding global variable."""
	for variable_name, variable_value in globals().items():
		if re.fullmatch(r'[A-Z]+', variable_name):
			text = text.replace('{{' + variable_name + '}}', str(variable_value))
	return text


def copy(files):
	"""Copy with templating to dist directory."""
	for file in assert_list(files):
		write(DIST + '/' + file[1], set_globals(read(file[0])))


def zipdir(path):
	# shutil.make_archive(f'graph-editor{VERSION}.min', 'zip', path)
	with zipfile.ZipFile(f'graph-editor{VERSION}.zip', 'w', zipfile.ZIP_LZMA, compresslevel=9) as zip:
		for f in os.listdir(path):
			file = path + '/' + f
			if os.path.isfile(file):
				zip.write(file, f)


def check_dist(dist):
	"""Проверить путь."""
	if not os.path.isdir(dist):
		print('\033[94m', f'Can not find dist directory {dist}. Seems like you do not use repository. Creating simple folder.', '\033[0m')
		os.makedirs(dist)


if __name__ == '__main__':
	VERSION = '1.0'
	CSS = f'graph-editor{VERSION}.min.css'
	JS = f'graph-editor{VERSION}.min.js'
	DIST = f'dist'

	# check_dist(DIST)
	clear_path(DIST)
	minify([['main.js', JS]], [['style.css', CSS]])
	copy(['readme.md', 'example.html'])
	# zipdir(DIST)
	print('Built')
