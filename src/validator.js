/*
 function TestTypes(tester) {
 ["37", "3.14", "Math.LN2", "Infinity", "NaN", "Number(1)", "''", "'asd'", "typeof 1", "String('abc')", "true", "false", "Boolean(true)", "undefined", "kahdhwhawdahwd", "{}", "[]", "{a: 1}", "[1, 2, 4]", "new Date()", "new Boolean(true)", "new Number(1)", "new String('abc')", "function () {}", "_ => _", "console.log", "Math.sin", "globalThis", "this", "Symbol('foo')", "new Error()", "BigInt(9007199254740991)", "/ab+c/g", "new RegExp(/ab+c/, 'i')", "new Uint8ClampedArray()", "new" +
 " BigInt64Array([21n, 31n])", "new Set([1, 2, 3, 4, 5])"].forEach(x => {
 try {
 eval(`window.testedVariable = ${x}`);
 console.log(x, tester(window.testedVariable));
 }
 catch (e){
 console.log(x, e);
 }

 });
 }

 TestTypes(x=>typeof(x));
 TestTypes(x => Object.prototype.toString.call(x));
 */

/**
 * Get type of value, e.g. String, Number, Object, Array, Boolean, Undefined, Date, Function, Window, Symbol, Error, RegExp, Set, BigInt, Uint8ClampedArray and others.
 * @return {string}
 */
function GetType(value) {
	let fullType = Object.prototype.toString.call(value);
	return fullType.substring(8, fullType.length - 1).replace(' ', '');
}


/**
 * Generate built in types from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects.
 * @returns {Object}
 */
function GetDefaultTypes() {
	let builtins = [
		'Infinity',
		'NaN',
		'undefined',
		'_ => _',
		'async function () {}',
		'{}',
		'true',
		'Symbol()',
		'Error()',
		'42',
		'BigInt("0x1fffffffffffff")',
		'new Date()',
		'"qwerty"',
		'/qwerty/gi',
		'[]',
		'new Int8Array(0)',
		'new Uint8Array(0)',
		'new Uint8ClampedArray(0)',
		'new Int16Array(0)',
		'new Uint16Array(0)',
		'new Int32Array(0)',
		'new Uint32Array(0)',
		'new Float32Array(0)',
		'new Float64Array(0)',
		'new BigInt64Array(0)',
		'new BigUint64Array(0)',
		'new Map()',
		'new Set()',
		'new WeakMap()',
		'new WeakSet()',
		'new ArrayBuffer(0)',
		'new DataView(new ArrayBuffer(0))',
		'new Promise((rs, rj) => {})',
		'(function* () {})()',
		'(async function* () {})()',
		'[].keys()',
		'(function () {return arguments})()',
	];
	let lastType;
	let undefinedType = GetType(undefined);

	function TypeConstructor(expression) {
		try {
			eval(`lastType = ${expression}`);
			return GetType(lastType);
		} catch {
			return undefinedType;
		}
	}

	return Object.fromEntries([...new Set(builtins.map(TypeConstructor))].map(t => [t, t]).concat([['Any', '*']]));
}

let validationTypes = GetDefaultTypes();

function AssertType(value, type) {
	let typeType = GetType(type);
	if (typeType !== validationTypes.String) Raise(`type "${type}" must be "${validationTypes.String}" but "${typeType}"`);
	if (type === validationTypes.Any) return;
	let valType = GetType(value);
	let clearType = type.replace('*', '');
	if (!(valType === type || type.startsWith('*') && !valType.endsWith(clearType) || type.endsWith('*') && !valType.startsWith(clearType))) Raise(`value "${value}" must be "${type}" but "${valType}"`);
}

function Validate(data, scheme, fullData, fullScheme) {
	if (scheme === validationSchemeScheme) return;
	try {
		Validate(scheme, validationSchemeScheme);
	} catch (e) {
		Raise(`can not validate data because scheme "${scheme}" is not correct: ${e}`);
	}
	if (!fullData) fullData = data;
	if (!fullScheme) fullScheme = scheme;
	let schemeType = GetType(scheme);
	if (schemeType === validationTypes.String) AssertType(data, scheme);
	else if (schemeType === validationTypes.Function) {if (!scheme(data, scheme, fullData, fullScheme)) Raise(`custom validation of "${data}" failed`);} else if (schemeType === validationTypes.Array) {
		AssertType(data, validationTypes.Array);
		if (scheme.length === 1) data.forEach(item => Validate(item, scheme[0], fullData, fullScheme));
		else if (scheme.length !== 0) Raise(`array validation must contain only one type but contains "${scheme.join(', ')}"`);
	} else if (schemeType === validationTypes.Object) {
		AssertType(data, validationTypes.Object);
		let requiredProperties = Object.fromEntries(Object.entries(scheme).filter(([prop, type]) => prop !== validationTypes.Any && !prop.endsWith('?')));
		let optionalProperties = Object.fromEntries(Object.entries(scheme).filter(([prop, type]) => !(prop in requiredProperties)).map(([prop, type]) => [prop.replace('?', ''), type]));
		let otherProperties = scheme['*'];
		let requirements = Object.fromEntries(Object.entries(requiredProperties).map(([prop, type]) => [prop, false]));
		Object.entries(data).forEach(([prop, val]) => {
			let valScheme;
			if (prop in requiredProperties) {
				requirements[prop] = true;
				valScheme = requiredProperties[prop];
			} else if (prop in optionalProperties) valScheme = optionalProperties[prop];
			else if (otherProperties) valScheme = otherProperties;
			else Raise(`object "${data}" can not contain property "${prop}"`);
			Validate(val, valScheme, fullData, fullScheme);
		});
		requirements = Object.entries(requirements).filter(([prop, exists]) => !exists).map(([prop, exists]) => prop);
		if (requirements.length) Raise(`object "${data}" must contain "${requirements.join(', ')}"`);
	} else Raise(`unknown type of validation scheme "${scheme}"`);
}

function GenericType(...types) {
	if (types.length === 0) Raise('not types were assigned to generic');
	if (types.length === 1) Raise(`use ${types[0]} instead of generic from one type`);
	let validator = data => types.some(t => Validate(data, t));
	validator.toString = () => types.join(' | ');
	return validator;
}

function GenerateValidationSchemeScheme() {
	let validationSchemeObjectBuffer = {};
	let validationSchemeScheme = GenericType(validationTypes.String, [validationTypes.String], validationSchemeObjectBuffer);
	validationSchemeObjectBuffer['*'] = validationSchemeScheme;
	return validationSchemeScheme;
}

let validationSchemeScheme = GenerateValidationSchemeScheme();


/*
 Возможные типы:
 1. Примитивный тип
 2. Объект (коллекция)
 3. Функция
 4. Массив (коллекция)

 Возможные комбинации типов:
 1. Один из
 2. Абсолютно любой


 Структура схемы:

 схема = тип - задать тип
 схема = [тип] - задать массив определённого типа
 схема = [] - задать любой массив
 схема = { свойство: тип } - задать объект определённого типа
 схема = { } - задать любой объект
 схема = функция - задать произвольную функцию валидации с сигнатурой (текущее значение, текущая схема, полное значение, полная схема) -> bool|throw Error

 тип = '*' - задать абсолютно любой тип (можно использовать validationTypes.Any)
 тип = 'результат GetType(значение)' - задать конкретный тип (можно использовать заранее вычисленные результаты из перечисления validationTypes)
 тип = '*результат GetType(значение)' - задать группу типов, оканчивающуюся на результат, например: '*Array' включает и 'Array', и 'Uint8ClampedArray'.
 тип = 'результат GetType(значение)*' - задать группу типов, начинающуюся на результат, например: 'Array*' включает и 'Array', и 'ArrayBuffer'.

 свойство = 'название свойства' - задать обязательное свойство
 свойство = 'название свойства?' - задать необязательное свойство
 свойство = '*' - задать тип и возможность присутствия остальных свойств объекта

 */
