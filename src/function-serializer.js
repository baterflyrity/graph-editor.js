function SerializeFunction(foo) {
	let tree = esprima.parseScript(foo.toString(), {loc: true});
	let node = tree.body[0];
	let definitions = [];
	let accessions = [];
	ValidateNode(node, definitions, accessions);
}

function ValidateNode(node, definitionsRef, accessionsRef) {
	
}
