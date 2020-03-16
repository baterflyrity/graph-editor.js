from py_mini_racer import py_mini_racer

ctx = py_mini_racer.MiniRacer()
with open('babel.min.js', 'r', encoding='utf-8') as f:
	ctx.eval(f.read())
ctx.eval("""
function transpile(code){
	return Babel.transform(code, { presets: ['es2015'] }).code;
}
transpile('_=>_');
""")


def transpile(code):
	return ctx.call('transpile', code)
