function Raise(text) {
	let e = Error(text + '.');
	e.name = 'Graph editor error'
	throw e;
}
