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
	return Object.prototype.toString.call(value).split(' ')[1].replace(']', '');
}

let validationTypes = Object.fromEntries('String, Number, Object, Array, Boolean, Undefined, Date, Function, Window, Symbol, Error, RegExp, Set, BigInt'.split(', ').map(t => [t, t]).concat([['Any', '*']]));

function AssertType(value, type) {
	let typeType = GetType(type);
	if (typeType !== validationTypes.String) Raise(`type "${type}" must be "${validationTypes.String}" but "${typeType}"`);
	if (type === validationTypes.Any) return;
	let valType = GetType(value);
	let clearType = type.replace('*', '');
	if (!(valType === type || type.startsWith('*') && !valType.endsWith(clearType) || type.endsWith('*') && !valType.startsWith(clearType))) Raise(`value "${value}" must be "${type}" but "${valType}"`);
}

function Validate(data, scheme,fullData,fullScheme) {
	if (scheme !== validationSchemeScheme && !Validate(scheme, validationSchemeScheme))
		Raise(`can not validate data because scheme "${scheme}" is not correct`);
	let schemeType = GetType(scheme);
	if (schemeType === validationTypes.String) AssertType(data, scheme);
	else if(schemeType=== validationTypes.Function) if(!scheme(data, scheme, fullData, fullScheme)) Raise(`custom validation of "${data}" failed`);
}

function GenericType(...types) {
	if (types.length === 0) Raise('not types were assigned to generic');
	if (types.length === 1) Raise(`use ${types[0]} instead of generic from one type`);
	let validator = data => types.some(t => Validate(data, t));
	validator.toString = () => types.join(' | ');
	return validator;
}

let validationSchemeObjectBuffer = {};
let validationSchemeScheme = GenericType(validationTypes.String, [validationTypes.String], validationSchemeObjectBuffer);
validationSchemeObjectBuffer['*'] = validationSchemeScheme;

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
 свойство = '*' - задать типы остальных свойств объекта

 */
