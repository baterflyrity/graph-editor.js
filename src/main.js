//Last release: 1.1
function GraphEditor(container, hierarchical = true, editable = true) {
	//TODO: убрать старые куски кода.

	let nodeStyles, titles = ['Новый узел'], edgeStyles, nodesData, edgesData;

	/**
	 * Check own property existence. In case object does not contain such property and default value defined assignes that property to object and also returns true.
	 * @param propertyDefaultValue Can be omitted or undefined to return false in case such property does not exist.
	 * @returns {boolean}
	 */
	function AssertPropertyOrDefault(object, objectPropertyName, propertyDefaultValue = undefined) {
		if (!object.hasOwnProperty(objectPropertyName)) {
			if (typeof (propertyDefaultValue) === 'undefined')
				return false;
			object[objectPropertyName] = propertyDefaultValue;
		}
		return true;
	}


	function AssertVariable(path, owner, library) {
		owner = owner || window;
		let variable;
		let names = path.split('.');
		library = library || names[0];
		names.forEach(name => {
			variable = owner[name];
			if (typeof (variable) === 'undefined') throw `Graph editor error: ${library} library must be included.`;
			owner = variable;
		});
	}

	AssertVariable('jQuery');
	AssertVariable('vis.Network', false, 'Vis.js Network');
	AssertVariable('vis.DataSet', false, 'Vis.js DataSet');
	AssertVariable('transition', jQuery(), 'Semantic UI');
	AssertVariable('modal', jQuery(), 'Semantic UI');
	AssertVariable('dropdown', jQuery(), 'Semantic UI');


	/**
	 * Ensure vis node contains id (random), x (0) and y (0) properties (default values).
	 */
	function ValidateVisNode(visNode) {
		AssertPropertyOrDefault(visNode, 'id', GraphEditor.GenerateID());
		AssertPropertyOrDefault(visNode, 'x', 0);
		AssertPropertyOrDefault(visNode, 'y', 0);
		return visNode
	}

	/**
	 * Ensure vis node contains id (random), from (0) and to (0) properties (default values).
	 */
	function ValidateVisEdge(visEdge) {
		AssertPropertyOrDefault(visEdge, 'id', GraphEditor.GenerateID());
		AssertPropertyOrDefault(visEdge, 'from', 0);
		AssertPropertyOrDefault(visEdge, 'to', 0);
		return visEdge
	}

	//TODO add validation for all object's properties/IDs existence and MAYBE throw exceptions.
	function ValidateElementType(rawElementTypeOrElementType) {
		let otherClasses = rawElementTypeOrElementType.typeStylesIDsArray.map(styleID => scope.GetElementStyle(styleID)).filter(style => !!style && style.elementClassID !== rawElementTypeOrElementType.elementClassID);
		if (otherClasses.length)
			throw `Can not create type ${rawElementTypeOrElementType.typeName} of element class ${rawElementTypeOrElementType.elementClassID} with style(s) ${otherClasses.map(style => style.styleID + ' (of class ' + style.elementClassID + ')').join(', ')}.`;
		return rawElementTypeOrElementType;
	}

	function ValidateElement(rawElementOrElement) {
		if (!scope.GetElementType(rawElementOrElement.elementTypeID))
			throw `Can not create element of type ${rawElementOrElement.elementTypeID}. Ensure this type was created.`;
		return rawElementOrElement;
	}

	function SelectPropertyDefaultValue(defaultValue) {
		switch (Object.prototype.toString.call(defaultValue)) {
			case '[object Array]':
				return defaultValue.length ? defaultValue[0] : '';
			case '[object Object]':
				return JSON.stringify(defaultValue);
			case '[object Null]':
			case '[object Undefined]':
			case '[object Function]':
				return '';
		}
		return '' + defaultValue;
	}

	function SerializeFunction(foo) {
		return foo.toString();
	}

	function DeserializeFunction(foo) {
		return new Function('return ' + foo)();
	}


	function CreateDefaults() {
		//Element classes
		scope.SetElementClass('node', {x: 0, y: 0});
		scope.SetElementClass('edge', {from: 0, to: 0});

		//Property classes
		function ConstructText(elementProperty, propertyValue, element) {
			return `<label>${elementProperty.propertyName}: </label>
<div style="display:inline-block;" contenteditable="true" data-placeholder="${elementProperty.propertyDefaultValue}">${propertyValue}</div>`;
		}

		function ParseText($propertyDOM, elementProperty, element) {
			return $propertyDOM.find('[contenteditable]').text();
		}

		function ConstructDropdown(label, options, defaultValue, multiple = false, searchable = true, autosearchable = true) {
			options = options.constructor !== Array ? Object.entries(options) : options.map((option, index) => [index, option]);
			options = options.map(([optionValue, option]) => {
				if (typeof (option) !== 'string')
					return Object.assign({value: optionValue}, option);
				return {
					value: '' + optionValue,
					shortContent: '' + option,
					longContent: '' + option,
				};
			});
			if (!options.length) throw `No options available for dropdown ${label}.`;
			if (!defaultValue) defaultValue = multiple ? [options[0].value] : options[0].value;
			let attributes = [];
			if (searchable && (!autosearchable || options.length > 5)) attributes.push('search');
			if (multiple) attributes.push('multiple');
			let optionsHTML = options.map(option => `<div class="item" data-value="${option.value}" data-text='${option.shortContent}'>${option.longContent}</div>`);
			let $dom = jQuery(`<div><label>${label}: </label>
<div class="property ui fluid inline selection ${attributes.join(' ')} dropdown">
	<input type="hidden" value="">
	<i class="dropdown icon"></i>
	<div class="default text"></div>	
	<div class="menu">${optionsHTML.join('')}</div>
</div>
</div>`);
			Incoming(() => {
				$dropdown = $dom.find('.property.dropdown').dropdown();
				if (multiple) defaultValue.forEach(val => $dropdown.dropdown('set selected', val));
				else $dropdown.dropdown('set selected', defaultValue);
			});
			return $dom;
		}

		function ParseDropdown($propertyDOM) {
			return $propertyDOM.find('.property.dropdown').dropdown('get value');
		}

		function ParseMultiDropdown($propertyDOM) {
			let val = ParseDropdown($propertyDOM);
			return val ? val.split(',') : [];
		}

		function ConstructCustomMultiSelect(elementProperty, propertyValue, element) {
			return ConstructDropdown(elementProperty.propertyName, propertyValue.options, propertyValue.value, true);
		}

		function ParseCustomSelect($propertyDOM, elementProperty, element) {
			let value = ParseMultiDropdown($propertyDOM);
			return Object.assign({}, element.elementPropertiesValues[elementProperty.propertyID], {value: value});
		}

		function ConstructCustomSelect(elementProperty, propertyValue, element) {
			return ConstructDropdown(elementProperty.propertyName, propertyValue.options, propertyValue.value);
		}

		function ConstructMultiSelect(elementProperty, propertyValue, element) {
			return ConstructDropdown(elementProperty.propertyName, elementProperty.propertyOptions, propertyValue, true);
		}

		function ConstructSelect(elementProperty, propertyValue, element) {
			return ConstructDropdown(elementProperty.propertyName, elementProperty.propertyOptions, propertyValue);
		}

		scope.SetPropertyClass('text', ConstructText, ParseText);
		scope.SetPropertyClass('select', ConstructSelect, ParseDropdown);
		scope.SetPropertyClass('multiSelect', ConstructMultiSelect, ParseDropdown);
		scope.SetPropertyClass('customSelect', ConstructCustomSelect, ParseCustomSelect);
		scope.SetPropertyClass('customMultiSelect', ConstructCustomMultiSelect, ParseCustomSelect);
		scope.SetPropertyClass('hidden', (elementProperty, propertyValue) => `<div data-property="${elementProperty.propertyID}" hidden>${propertyValue}</div>`, $propertyDOM => $propertyDOM.text());
		scope.SetPropertyClass('hiddenLabel', (elementProperty, propertyValue) => `<div data-property="${elementProperty.propertyID}" hidden>${propertyValue}</div>`, $propertyDOM => $propertyDOM.text());
		//Element styles
		scope.SetElementStyle('defaultNode', 'node', {
			color: "#80aef5",
			shape: "ellipse",
			label: 'Узел'
		});
		scope.SetElementStyle('defaultEdge', 'edge', {
			arrows: "to",
			dashes: false,
			color: {inherit: "both"},
		});
		//Element properties
		scope.SetElementProperty('label', 'text', 'Название', 'Узел');
		scope.SetElementProperty('hiddenLabel', 'hiddenLabel', 'Нередактируемое название', 'Узел');
		//Element types
		scope.SetElementType('defaultNode', 'node', 'Узел', 'Стандартный вид', 'blue', ['label'], ['defaultNode']);
		scope.SetElementType('defaultEdge', 'edge', 'Сплошное ребро', 'Обычное ребро', 'hidden', [], ['defaultEdge']);
	}

	function CreateBindings() {
		scope.onUpdateElement.Subscribe(function (element) {
			if (element.elementPropertiesValues.hasOwnProperty('label'))
				element.visTemplate.label = element.elementPropertiesValues.label;
			else if (element.elementPropertiesValues.hasOwnProperty('hiddenLabel'))
				element.visTemplate.label = element.elementPropertiesValues.hiddenLabel;
			else if (element.elementClassArguments.hasOwnProperty('label'))
				element.visTemplate.label = element.elementPropertiesValues.label;
			else {
				let props = Object.keys(element.elementPropertiesValues).filter(propertyID => scope.GetElementProperty(propertyID).propertyClassID.toLowerCase().indexOf('label') !== -1);
				if (props.length)
					element.visTemplate.label = element.elementPropertiesValues[props[0]];
			}
			let elementType = scope.GetElementType(element.elementTypeID);
			if (!!elementType) {
				if (elementType.elementClassID === 'node') scope.engine.SetNode(element.visTemplate);
				else if (elementType.elementClassID === 'edge') scope.engine.SetEdge(element.visTemplate);
			}
			return element;
		});
		scope.onRemoveElement.Subscribe(function (elementIDOrElement) {
			let id = typeof (elementIDOrElement) === 'object' ? elementIDOrElement.elementID : elementIDOrElement;
			let element = scope.GetElement(id);
			if (!!element) {
				let elementType = scope.GetElementType(element.elementTypeID);
				if (!!elementType) {
					if (elementType.elementClassID === 'node') scope.engine.RemoveNode(id);
					else if (elementType.elementClassID === 'edge') scope.engine.RemoveEdge(id);
				}
			}
			return element;
		});
		scope.engine.onCreateEdge.Subscribe(function (visEdge) {
			AssertPropertyOrDefault(visEdge, 'id', GraphEditor.GenerateID());
			if (!scope.GetElement(visEdge.id))
				scope.SetElement(visEdge.id, 'defaultEdge', {}, {from: visEdge.from, to: visEdge.to}, {}, undefined, false);
			return Object.assign({}, scope.GetElement(visEdge.id).visTemplate, visEdge);
		});
		scope.engine.onCreateNode.Subscribe(function (visNode) {
			AssertPropertyOrDefault(visNode, 'id', GraphEditor.GenerateID());
			if (!scope.GetElement(visNode.id))
				scope.SetElement(visNode.id, 'defaultNode', {}, {x: visNode.x, y: visNode.y}, {}, undefined, false);
			// else {
			// 	//update x and y
			// 	let element = scope.GetElement(visNode.id);
			// 	element.visTemplate.x = visNode.x;
			// 	element.visTemplate.y = visNode.y;
			// 	scope.SetElement(element.elementID, element.elementTypeID, element.elementPropertiesValues, element.elementClassArguments, element.nestedGraph, element.cachedTypedPropertiesValues);
			// }
			return Object.assign({}, scope.GetElement(visNode.id).visTemplate, visNode);
		});
		//TODO: bind edge/node vis properties when edited/created.
	}

	function UpdateNodesPositions() {
		let nodes = scope.engine.nodes.get();
		scope.engine.graph.storePositions();
		let positions = scope.engine.nodes.get();
		scope.engine.nodes.update(nodes.map((n, i) => {
			n.x = positions[i].x;
			n.y = positions[i].y;
			return n;
		}));
	}

	let scope = {
		container: jQuery(container).first(),

		//region Serialization
		save: () => ({
			elementClasses: scope.GetElementClass(),
			propertyClasses: scope.GetPropertyClass(),
			elementStyles: scope.GetElementStyle(),
			elementProperties: scope.GetElementProperty(),
			elementTypes: scope.GetElementType(),
			elements: scope.GetElement(),
		}),
		load: savedGraph => {
			scope.clear();
			if (savedGraph.hasOwnProperty('elementClasses'))
				savedGraph.elementClasses.forEach(x => scope.SetElementClass(x.classID, x.visTemplate));
			if (savedGraph.hasOwnProperty('propertyClasses'))
				savedGraph.propertyClasses.forEach(x => scope.SetPropertyClass(x.propertyClassID, x.propertyConstructor, x.propertyParser));
			if (savedGraph.hasOwnProperty('elementStyles'))
				savedGraph.elementStyles.forEach(x => scope.SetElementStyle(x.styleID, x.elementClassID, x.visTemplate));
			if (savedGraph.hasOwnProperty('elementProperties'))
				savedGraph.elementProperties.forEach(x => scope.SetElementProperty(x.propertyID, x.propertyClassID, x.propertyName, x.propertyDefaultValue));
			if (savedGraph.hasOwnProperty('elementTypes'))
				savedGraph.elementTypes.forEach(x => scope.SetElementType(x.typeID, x.elementClassID, x.typeName, x.typeDescription, x.typeColor, x.typePropertiesIDsArray, x.typeStylesIDsArray));
			if (savedGraph.hasOwnProperty('elements'))
				savedGraph.elements.forEach(x => scope.SetElement(x.elementID, x.elementTypeID, x.elementPropertiesValues, x.elementClassArguments, x.nestedGraph, x.cahedTypedPropertiesValues));
			FitZoom();
		},
		clear: () => {
			scope.GetElement().forEach(x => scope.RemoveElement(x));
			scope.GetElementType().forEach(x => scope.RemoveElementType(x));
			scope.GetElementProperty().forEach(x => scope.RemoveElementProperty(x));
			scope.GetElementStyle().forEach(x => scope.RemoveElementStyle(x));
			scope.GetPropertyClass().forEach(x => scope.RemovePropertyClass(x));
			scope.GetElementClass().forEach(x => scope.RemoveElementClass(x));
		},
		serialize: (savedGraph = undefined) => {
			let data = (typeof (savedGraph) === 'undefined' ? scope.save() : savedGraph);
			data.propertyClasses = data.propertyClasses.map(x => ({
				propertyClassID: x.propertyClassID,
				propertyConstructor: SerializeFunction(x.propertyConstructor),
				propertyParser: SerializeFunction(x.propertyParser),
			}));
			return JSON.stringify(data);
		},
		deserialize: serializedGraph => {
			let data = JSON.parse(serializedGraph);
			data.propertyClasses = data.propertyClasses.map(x => ({
				propertyClassID: x.propertyClassID,
				propertyConstructor: DeserializeFunction(x.propertyConstructor),
				propertyParser: DeserializeFunction(x.propertyParser),
			}));
			return scope.load(data);
		},
		download: (serializedGraph = undefined) => {
			let data = typeof (serializedGraph) === 'undefined' ? scope.serialize() : serializedGraph;
			return Download(data, 'graph.json', 'application/json');
		},
		//upload - set in modal builder.
		//endregion


		addNode: (id, type = 0, label, template = {}) => {
			scope.engine.graph.storePositions();
			let pos = {x: 0, y: 0};
			let nodes = scope.data[GraphEditor.ElementClasses.node.classID].get();
			if (nodes.length) {
				pos.x = nodes.map(n => n.x).reduce((a, b) => a + b) / nodes.length;
				pos.y = nodes.map(n => n.y).reduce((a, b) => a + b) / nodes.length;
				pos.x += Math.random() * 100 - 50;
				pos.y += Math.random() * 100 - 50;
			}

			// TODO Вот из-за этой строки всё ломалось: setTimeout(() => StabilizeFitZoom(), 1);
			let element = jQuery.extend(true, scope.types[GraphEditor.ElementClasses.node.classID][type].template, {id: id, type: type, label: label}, pos, template);
			return scope.data[GraphEditor.ElementClasses.node.classID].add(element)[0];
		},
		addEdge: (from, to, id, type = 0, template = {}) => {
			let edge = Object.assign({}, scope.types[GraphEditor.ElementClasses.edge.classID][type].template, {id: id, type: type, from: from, to: to}, template);
			return scope.data[GraphEditor.ElementClasses.edge.classID].add(edge)[0];
		},
		removeNode: id => scope.data[GraphEditor.ElementClasses.node.classID].remove(id),
		removeEdge: id => scope.data[GraphEditor.ElementClasses.edge.classID].remove(id),


		engine: {
			graph: {},
			onStartEditing: CreateEvent('onStartEditing', '(elementClass(node|edge), visElement)->undefined', 'broadcast'),
			onStopEditing: CreateEvent('onStopEditing', '(elementClass(node|edge), visElement)->undefined', 'broadcast'),

			//region Nodes manipulation
			nodes: new vis.DataSet(),
			SetNode: function (visNode, triggerEvents = true) {
				visNode = ValidateVisNode(visNode);
				if (!scope.engine.GetNode(visNode.id)) return scope.engine.nodes.add(ValidateVisNode(triggerEvents ? scope.engine.onCreateNode.Trigger(visNode) : visNode));
				return scope.engine.nodes.update(ValidateVisNode(triggerEvents ? scope.engine.onSetNode.Trigger(visNode) : visNode));
			},
			onCreateNode: CreateEvent('onCreateNode', '(visNode)->visNode', 'pipe'),
			onSetNode: CreateEvent('onSetNode', '(visNode)->visNode', 'pipe'),
			GetNode: function (nodeID) {
				UpdateNodesPositions();
				// let node = scope.engine.nodes.get(nodeID);
				// if (!node) return node;
				// scope.engine.graph.storePositions();
				// let pos = scope.engine.nodes.get(nodeID);
				// node.x = pos.x;
				// node.y = pos.y;
				// scope.engine.nodes.update(node);
				// return node;
				return scope.engine.nodes.get(nodeID);
			},
			RemoveNode: (visNodeOrNodeID, triggerEvents = true) => scope.engine.nodes.remove(triggerEvents ? scope.engine.onRemoveNode.Trigger(visNodeOrNodeID) : visNodeOrNodeID),
			onRemoveNode: CreateEvent('onRemoveNode', '(visNodeOrNodeID)->visNodeOrNodeID', 'pipe'),
			//endregion

			//region Edges manipulation
			edges: new vis.DataSet(),
			SetEdge: function (visEdge, triggerEvents = true) {
				visEdge = ValidateVisEdge(visEdge);
				if (!scope.engine.GetEdge(visEdge.id)) return scope.engine.edges.add(ValidateVisEdge(triggerEvents ? scope.engine.onCreateEdge.Trigger(visEdge) : visEdge));
				return scope.engine.edges.update(ValidateVisEdge(triggerEvents ? scope.engine.onSetEdge.Trigger(visEdge) : visEdge));
			},
			onCreateEdge: CreateEvent('onCreateEdge', '(visEdge)->visEdge', 'pipe'),
			onSetEdge: CreateEvent('onSetEdge', '(visEdge)->visEdge', 'pipe'),
			GetEdge: edgeID => scope.engine.edges.get(edgeID),
			RemoveEdge: (visEdgeOrEdgeID, triggerEvents = true) => scope.engine.edges.remove(triggerEvents ? scope.engine.onRemoveEdge.Trigger(visEdgeOrEdgeID) : visEdgeOrEdgeID),
			onRemoveEdge: CreateEvent('onRemoveEdge', '(visEdgeOrEdgeID)->visEdgeOrEdgeID', 'pipe'),
			//endregion
		},

		//region Element classes manipulation
		elementClasses: {},
		SetElementClass: function (classID, visTemplate, triggerEvents = true) {
			let elemtnClass = {
				classID: classID,
				visTemplate: visTemplate
			};
			let event = !scope.GetElementClass(elemtnClass.classID) ? scope.onCreateElementClass : scope.onSetElementClass;
			scope.elementClasses[elemtnClass.classID] = triggerEvents ? event.Trigger(elemtnClass) : elemtnClass;
			return [elemtnClass.classID];
		},
		onCreateElementClass: CreateEvent('onCreateElementClass', '(elementClass)->elementClass', 'pipe'),
		onSetElementClass: CreateEvent('onSetElementClass', '(elementClass)->elementClass', 'pipe'),
		GetElementClass: classID => typeof (classID) === 'undefined' ? Object.values(scope.elementClasses) : CopyObject(scope.elementClasses[classID]),
		RemoveElementClass: function (classIDOrElementClass, triggerEvents = true) {
			if (triggerEvents) classIDOrElementClass = scope.onRemoveElementClass.Trigger(classIDOrElementClass);
			if (typeof (classIDOrElementClass) === 'undefined') return [];
			let id = typeof (classIDOrElementClass) === 'object' ? classIDOrElementClass.classID : classIDOrElementClass;
			if (!scope.elementClasses.hasOwnProperty(id)) return [];
			delete scope.elementClasses[id];
			return [id];
		},
		onRemoveElementClass: CreateEvent('onRemoveElementClass', '(classIDOrElementClass)->classIDOrElementClass', 'pipe'),
		//endregion

		//region Property classes manipulation
		propertyClasses: {},
		SetPropertyClass: function (propertyClassID, propertyConstructor, propertyParser, triggerEvents = true) {
			let propertyClass = {
				propertyClassID: propertyClassID,
				propertyConstructor: propertyConstructor,
				propertyParser: propertyParser,
			};
			let event = !scope.GetPropertyClass(propertyClass.propertyClassID) ? scope.onCreatePropertyClass : scope.onSetPropertyClass;
			scope.propertyClasses[propertyClass.propertyClassID] = triggerEvents ? event.Trigger(propertyClass) : propertyClass;
			return [propertyClass.propertyClassID];
		},
		onCreatePropertyClass: CreateEvent('onCreatePropertyClass', '(propertyClass)->propertyClass', 'pipe'),
		onSetPropertyClass: CreateEvent('onSetPropertyClass', '(propertyClass)->propertyClass', 'pipe'),
		GetPropertyClass: propertyClassID => typeof (propertyClassID) === 'undefined' ? Object.values(scope.propertyClasses) : CopyObject(scope.propertyClasses[propertyClassID]),
		RemovePropertyClass: function (propertyClassIDOrPropertyClass, triggerEvents = true) {
			if (triggerEvents) propertyClassIDOrPropertyClass = scope.onRemovePropertyClass.Trigger(propertyClassIDOrPropertyClass);
			if (typeof (propertyClassIDOrPropertyClass) === 'undefined') return [];
			let id = typeof (propertyClassIDOrPropertyClass) === 'object' ? propertyClassIDOrPropertyClass.propertyClassID : propertyClassIDOrPropertyClass;
			if (!scope.propertyClasses.hasOwnProperty(id)) return [];
			delete scope.propertyClasses[id];
			return [id];
		},
		onRemovePropertyClass: CreateEvent('onRemovePropertyClass', '(propertyClassIDOrPropertyClass)->propertyClassIDOrPropertyClass', 'pipe'),
		//endregion

		//region Element styles manipulation
		elementStyles: {},
		SetElementStyle: function (styleID, elementClassID, visTemplate, triggerEvents = true) {
			let elementStyle = {
				styleID: styleID,
				elementClassID: elementClassID,
				visTemplate: visTemplate,
			};
			let event = !scope.GetElementStyle(elementStyle.styleID) ? scope.onCreateElementStyle : scope.onSetElementStyle;
			scope.elementStyles[elementStyle.styleID] = triggerEvents ? event.Trigger(elementStyle) : elementStyle;
			return [elementStyle.styleID];
		},
		onCreateElementStyle: CreateEvent('onCreateElementStyle', '(elementStyle)->elementStyle', 'pipe'),
		onSetElementStyle: CreateEvent('onSetElementStyle', '(elementStyle)->elementStyle', 'pipe'),
		GetElementStyle: styleID => typeof (styleID) === 'undefined' ? Object.values(scope.elementStyles) : CopyObject(scope.elementStyles[styleID]),
		RemoveElementStyle: function (styleIDOrElementStyle, triggerEvents = true) {
			if (triggerEvents) styleIDOrElementStyle = scope.onRemoveElementStyle.Trigger(styleIDOrElementStyle);
			if (typeof (styleIDOrElementStyle) === 'undefined') return [];
			let id = typeof (styleIDOrElementStyle) === 'object' ? styleIDOrElementStyle.styleID : styleIDOrElementStyle;
			if (!scope.elementStyles.hasOwnProperty(id)) return [];
			delete scope.elementStyles[id];
			return [id];
		},
		onRemoveElementStyle: CreateEvent('onRemoveElementStyle', '(styleIDOrElementStyle)->styleIDOrElementStyle', 'pipe'),
		//endregion

		//region Element properties manipulation
		elementProperties: {},
		SetElementProperty: function (propertyID, propertyClassID, propertyName, propertyDefaultValue, propertyOptions, triggerEvents = true) {
			let elementProperty = {
				propertyID: propertyID,
				propertyClassID: propertyClassID,
				propertyName: propertyName,
				propertyDefaultValue: propertyDefaultValue,
				propertyOptions: propertyOptions,
			};
			let event = !scope.GetElementProperty(elementProperty.propertyID) ? scope.onCreateElementProperty : scope.onSetElementProperty;
			scope.elementProperties[elementProperty.propertyID] = triggerEvents ? event.Trigger(elementProperty) : elementProperty;
			return [elementProperty.propertyID];
		},
		onCreateElementProperty: CreateEvent('onCreateElementProperty', '(elementProperty)->elementProperty', 'pipe'),
		onSetElementProperty: CreateEvent('onSetElementProperty', '(elementProperty)->elementProperty', 'pipe'),
		GetElementProperty: propertyID => typeof (propertyID) === 'undefined' ? Object.values(scope.elementProperties) : CopyObject(scope.elementProperties[propertyID]),
		RemoveElementProperty: function (propertyIDOrElementProperty, triggerEvents = true) {
			if (triggerEvents) propertyIDOrElementProperty = scope.onRemoveElementProperty.Trigger(propertyIDOrElementProperty);
			if (typeof (propertyIDOrElementProperty) === 'undefined') return [];
			let id = typeof (propertyIDOrElementProperty) === 'object' ? propertyIDOrElementProperty.propertyID : propertyIDOrElementProperty;
			if (!scope.elementProperties.hasOwnProperty(id)) return [];
			delete scope.elementProperties[id];
			return [id];
		},
		onRemoveElementProperty: CreateEvent('onRemoveElementProperty', '(propertyIDOrElementProperty)->propertyIDOrElementProperty', 'pipe'),
		//endregion

		//region Element types manipulation
		elementTypes: {},
		SetElementType: function (typeID, elementClassID, typeName, typeDescription, typeColor, typePropertiesIDsArray, typeStylesIDsArray, triggerEvents = true) {
			let elementType = {
				typeID: typeID,
				elementClassID: elementClassID,
				typeName: typeName,
				typeDescription: typeDescription,
				typeColor: typeColor,
				typePropertiesIDsArray: typePropertiesIDsArray,
				typeStylesIDsArray: typeStylesIDsArray,
			};
			if (triggerEvents)
				elementType = scope.onValidateElementType.Trigger(elementType);
			elementType = ValidateElementType(elementType);
			elementType.visTemplate = Object.assign({}, scope.GetElementClass(elementType.elementClassID).visTemplate, ...elementType.typeStylesIDsArray.map(styleID => scope.GetElementStyle(styleID)).filter(style => !!style).map(style => style.visTemplate));
			elementType.propertiesValues = Object.fromEntries(elementType.typePropertiesIDsArray.map(propertyID => scope.GetElementProperty(propertyID)).filter(property => !!property).map(property => [property.propertyID, property.propertyDefaultValue]));
			// elementType.propertiesValues = Object.fromEntries(elementType.typePropertiesIDsArray.map(propertyID => scope.GetElementProperty(propertyID)).filter(property => !!property).map(property => [property.propertyID, SelectPropertyDefaultValue(property.propertyDefaultValue)])); //TODO: make sure no specifiec default value selector required.
			let event = !scope.GetElementType(elementType.typeID) ? scope.onCreateElementType : scope.onSetElementType;
			elementType = triggerEvents ? event.Trigger(elementType) : elementType;
			scope.elementTypes[elementType.typeID] = ValidateElementType(elementType);
			return [elementType.typeID];
		},
		onValidateElementType: CreateEvent('onValidateElementType', '(rawElementType)->rawElementType', 'pipe'),
		onCreateElementType: CreateEvent('onCreateElementType', '(elementType)->elementType', 'pipe'),
		onSetElementType: CreateEvent('onSetElementType', '(elementType)->elementType', 'pipe'),
		GetElementType: typeID => typeof (typeID) === 'undefined' ? Object.values(scope.elementTypes) : CopyObject(scope.elementTypes[typeID]),
		RemoveElementType: function (typeIDOrElementType, triggerEvents = true) {
			if (triggerEvents) typeIDOrElementType = scope.onRemoveElementType.Trigger(typeIDOrElementType);
			if (typeof (typeIDOrElementType) === 'undefined') return [];
			let id = typeof (typeIDOrElementType) === 'object' ? typeIDOrElementType.typeID : typeIDOrElementType;
			if (!scope.elementTypes.hasOwnProperty(id)) return [];
			delete scope.elementTypes[id];
			return [id];
		},
		onRemoveElementType: CreateEvent('onRemoveElementType', '(typeIDOrElementType)->typeIDOrElementType', 'pipe'),
		//endregion

		//region Elements manipulation
		elements: {},
		SetElement: function (elementID, elementTypeID, elementPropertiesValues = {}, elementClassArguments = {}, nestedGraph = {}, cachedTypedPropertiesValues = undefined, triggerEvents = true) {
			let element = {
				elementID: elementID,
				elementTypeID: elementTypeID,
				elementPropertiesValues: elementPropertiesValues,
				elementClassArguments: elementClassArguments,
				nestedGraph: nestedGraph,
				cachedTypedPropertiesValues: cachedTypedPropertiesValues
			};
			if (triggerEvents)
				element = scope.onValidateElement.Trigger(element);
			element = ValidateElement(element);
			let elementType = scope.GetElementType(element.elementTypeID);
			element.elementPropertiesValues = Object.assign({}, elementType.propertiesValues, element.elementPropertiesValues);
			element.cachedTypedPropertiesValues = jQuery.extend(true, element.cachedTypedPropertiesValues, {[element.elementTypeID]: Object.assign({}, element.elementPropertiesValues)});
			element.visTemplate = Object.assign({}, elementType.visTemplate, elementClassArguments, {id: element.elementID});
			let event = !scope.GetElement(element.elementID) ? scope.onCreateElement : scope.onSetElement;
			element = triggerEvents ? event.Trigger(element) : element;
			scope.elements[element.elementID] = ValidateElement(element);
			return [element.elementID];
		},
		onValidateElement: CreateEvent('onValidateElement', '(rawElement)->rawElement', 'pipe'),
		onCreateElement: CreateEvent('onCreateElement', '(element)->element', 'pipe'),
		onSetElement: CreateEvent('onSetElement', '(element)->element', 'pipe'),
		GetElement: elementID => typeof (elementID) === 'undefined' ? Object.values(scope.elements) : CopyObject(scope.elements[elementID]),
		RemoveElement: function (elementIDOrElement, triggerEvents = true) {
			if (triggerEvents) elementIDOrElement = scope.onRemoveElement.Trigger(elementIDOrElement);
			if (typeof (elementIDOrElement) === 'undefined') return [];
			let id = typeof (elementIDOrElement) === 'object' ? elementIDOrElement.elementID : elementIDOrElement;
			if (!scope.elements.hasOwnProperty(id)) return [];
			delete scope.elements[id];
			return [id];
		},
		onRemoveElement: CreateEvent('onRemoveElement', '(elementIDOrElement)->elementIDOrElement', 'pipe'),
		//endregion


	};
	scope.data = {
		[GraphEditor.ElementClasses.node.classID]: new vis.DataSet(nodesData),
		[GraphEditor.ElementClasses.edge.classID]: new vis.DataSet(edgesData),
	};
	scope.types = {
		[GraphEditor.ElementClasses.node.classID]: nodeStyles ? nodeStyles : GraphEditor.CreateStyles_old(
			GraphEditor.CreateType_old('0', 'Эллипс', 'Синие эллипсы', 'blue', {
				color: '#8dd0f8',
				shape: 'ellipse'
			}),
			GraphEditor.CreateType_old('1', 'Прямоугольник', 'Зелёные прямоугольники', 'green', {
				color: '#82ec93',
				shape: 'box'
			})
		),
		[GraphEditor.ElementClasses.edge.classID]: edgeStyles ? edgeStyles : GraphEditor.CreateStyles_old(
			GraphEditor.CreateType_old('0', 'Сплошное', 'Без штриховки', 'hidden', {
				arrows: 'to',
				dashes: false,
				color: {inherit: 'both'}
			}),
			GraphEditor.CreateType_old('1', 'Штрихованное', 'Равномерная штриховка', 'hidden', {
				arrows: 'to',
				dashes: true,
				color: {inherit: 'both'}
			})
		),
	};

	scope.container.html('<div class="graph-editor"></div>');

	//Nested events
	scope.engine.onUpdateNode = CreateNestedEvent('onUpdateNode', false, scope.engine.onCreateNode, scope.engine.onSetNode);
	scope.engine.onUpdateEdge = CreateNestedEvent('onUpdateEdge', false, scope.engine.onCreateEdge, scope.engine.onSetEdge);
	scope.onUpdateElementClass = CreateNestedEvent('onUpdateElementClass', false, scope.onCreateElementClass, scope.onSetElementClass);
	scope.onUpdatePropertyClass = CreateNestedEvent('onUpdatePropertyClass', false, scope.onCreatePropertyClass, scope.onSetPropertyClass);
	scope.onUpdateElementStyle = CreateNestedEvent('onUpdateElementStyle', false, scope.onCreateElementStyle, scope.onSetElementStyle);
	scope.onUpdateElementProperty = CreateNestedEvent('onUpdateElementProperty', false, scope.onCreateElementProperty, scope.onSetElementProperty);
	scope.onUpdateElementType = CreateNestedEvent('onUpdateElementType', false, scope.onCreateElementType, scope.onSetElementType);
	scope.onUpdateElement = CreateNestedEvent('onUpdateElement', false, scope.onCreateElement, scope.onSetElement);

	CreateBindings();
	CreateDefaults();

	//Properties editor
	/**
	 * Create and show properties editor.
	 * @param elementClassID {'node'|'edge'}
	 */
	function CreateEditor(elementClassID, visElement) {
		let element = scope.GetElement(visElement.id);
		let elementTypes = scope.GetElementType().filter(elementType => elementType.elementClassID === elementClassID);
		let currentType = scope.GetElementType(element.elementTypeID);

		let availableTypesBuff = elementTypes.map(elementType => `<div class="item" data-value="${elementType.typeID}" data-text='
														<div class="ui ${elementType.typeColor} empty circular label"></div> ${elementType.typeName}
													'>
														<div class="ui ${elementType.typeColor} empty circular label"></div> ${elementType.typeName} 
														<span class="description">${elementType.typeDescription}</span>
													</div>`);
		let $editor = jQuery(`<div class="class-editor" hidden>
				<div class="ui raised card">
					<div class="content">
						<div class="elementType">
							<div class="ui inline labeled dropdown">
								<input type="hidden" value="${elementTypes[0].typeID}">
								<div class="text">${elementTypes[0].typeName}</div>
								<i class="dropdown icon"></i>
								<div class="menu">${availableTypesBuff.join('')}</div>
							</div>
						</div>
						<div class="meta">${elementClassID}</div>
						<div class="description">
						</div>
					</div>
					<div class="ui bottom attached buttons">
						<button class="delete ui grey button">Удалить</button>
						<div class="or" data-text="?"></div>
						<button class="save ui positive button">Сохранить</button>
					</div>
				</div>
			</div>`);

		function SelfDestruct(e) {
			scope.engine.onStopEditing.Unsubscribe(destructionID);
			$editor.transition({
				animation: 'fade right',
				onComplete: () => $editor.remove()
			});
			return e;
		}

		function SaveAndCacheProperties() {
			element.elementPropertiesValues = Object.fromEntries($properties.find('>[data-property]').toArray().map(e => {
				let $e = jQuery(e);
				let propertyID = $e.data('property');
				let elementProperty = scope.GetElementProperty(propertyID);
				return [propertyID, scope.GetPropertyClass(elementProperty.propertyClassID).propertyParser($e, elementProperty, element)];
			}));
			AssertPropertyOrDefault(element.cachedTypedPropertiesValues, element.elementTypeID, {});
			// noinspection TypeScriptValidateTypes
			element.cachedTypedPropertiesValues[element.elementTypeID] = element.elementPropertiesValues;
		}

		function CreateProperties() {
			let currentProperties = currentType.typePropertiesIDsArray.map(propertyID => scope.GetElementProperty(propertyID));
			$properties.html('').append(...currentProperties.map(property => jQuery(`<div data-property="${property.propertyID}"></div>`).append(scope.GetPropertyClass(property.propertyClassID).propertyConstructor(property, element.elementPropertiesValues[property.propertyID], element))));
		}


		let $properties = $editor.find('.content>.description');
		CreateProperties();
		let $type = $editor.find('.content>.elementType .dropdown').dropdown().dropdown('set selected', '' + element.elementTypeID).dropdown({
			onChange: function (value, text, $choice) {
				if (value) {
					SaveAndCacheProperties();
					element.elementTypeID = value;
					currentType = scope.GetElementType(element.elementTypeID);
					AssertPropertyOrDefault(element.cachedTypedPropertiesValues, element.elementTypeID, {});
					// noinspection TypeScriptValidateTypes
					element.elementPropertiesValues = Object.assign({}, currentType.propertiesValues, element.cachedTypedPropertiesValues[element.elementTypeID]);
					CreateProperties();
				}
			}
		});
		scope.container.find('.graph-editor').append($editor);
		$editor.transition('fade right');
		let destructionID = scope.engine.onStopEditing.Subscribe(SelfDestruct)[0];
		$editor.find('.save.button').click(function () {
			SaveAndCacheProperties();
			let visTemplate = elementClassID === 'node' ? {x: visElement.x, y: visElement.y} : {from: visElement.from, to: visElement.to};
			scope.SetElement(element.elementID, element.elementTypeID, element.elementPropertiesValues, Object.assign({}, element.elementClassArguments, visTemplate), element.nestedGraph, element.cachedTypedPropertiesValues);
			SelfDestruct();
		});
		$editor.find('.delete.button').click(function () {
			scope.RemoveElement(element);
			SelfDestruct();
		});
	}

	scope.engine.onStartEditing.Subscribe(CreateEditor);


	if (!scope.container.length) throw `Graph editor error: can not find container ${container}.`;


	/**
	 * Crate graph DOM and events, attach to scope. Return jQuery graph object.
	 * @returns {jQuery}
	 */
	function BuildGraph() {
		let $graph = jQuery('<div class="pane"></div>');
		let edgeEditingState = 0;
		let editedElement, editedClass;
		scope.engine.graph = new vis.Network($graph[0],
			{
				nodes: scope.engine.nodes,
				edges: scope.engine.edges
			},
			{
				manipulation: {
					enabled: false,
					editEdge: editable ? function (visEdge, callback) {
						if (visEdge.from === visEdge.to) callback(null);
						else {
							edgeEditingState = 0;
							Incoming(() => scope.engine.graph.disableEditMode());
							scope.engine.onStopEditing.Trigger('edge', visEdge);
							callback(scope.engine.onSetEdge.Trigger(visEdge));
						}
					} : false,
					addNode: editable ? function (visNode, callback) {
						delete visNode.label;
						Incoming(() => scope.engine.graph.disableEditMode());
						scope.engine.onStopEditing.Trigger('node', visNode);
						callback(scope.engine.onCreateNode.Trigger(visNode));
					} : false,
					addEdge: editable ? function (visEdge, callback) {
						delete visEdge.label;
						delete visEdge.title;
						Incoming(() => scope.engine.graph.disableEditMode());
						if (visEdge.from !== visEdge.to) {
							scope.engine.onStopEditing.Trigger('edge', visEdge);
							callback(scope.engine.onCreateEdge.Trigger(visEdge));
						}
					} : false,
				},
				locale: 'ru',
				physics: {
					enabled: false,
					stabilization: {
						fit: false
					}
				},
				layout: {
					hierarchical: hierarchical ? {
						direction: "RL",
						sortMethod: "hubsize",
						// shakeTowards:'leaves',
						levelSeparation: 200,
						nodeSpacing: 50,
					} : false
				}
			});
		if (editable) {
			scope.engine.graph.addEventListener('select', function (e) {
				if (editedClass && editedElement) scope.engine.onStopEditing.Trigger(editedClass, editedElement);
				if (e.nodes.length) {
					//Start editing node
					editedElement = scope.engine.GetNode(e.nodes[0]);
					editedClass = 'node';
					scope.engine.onStartEditing.Trigger(editedClass, editedElement);
				} else if (e.edges.length === 1) {
					//Start editing edge
					scope.engine.graph.editEdgeMode();
					editedElement = scope.engine.GetEdge(e.edges[0]);
					editedClass = 'edge';
					edgeEditingState = 1;
					scope.engine.onStartEditing.Trigger(editedClass, editedElement);
				} else if (editedElement && editedClass) {
					//End editing node/edge.
					editedClass = null;
					editedElement = null;
				}
			});
			$graph.find('canvas').click(function () {
				if (edgeEditingState === 1)
					edgeEditingState = 2;
				else if (edgeEditingState === 2) {
					edgeEditingState = 0;
					scope.engine.onStopEditing.Trigger(editedClass, editedElement);
					editedClass = null;
					editedElement = null;
					scope.engine.graph.disableEditMode();
					scope.engine.graph.unselectAll();
				}
			});
		}
		return $graph;
	}

	function BuildModal() {
		let $modal = jQuery(`<div class="ui mini modal">
				<div class="header">Загрузить граф из файла</div>
				<div class="content">
					<div class="file ui left labeled button">
						<a class="ui basic label">
							Файл не выбран
						</a>
						<div class="ui icon button">
							<i class="file code icon"></i>
							Выбрать файл
						</div>
					</div>
					<input type="file" autocomplete="off" accept="application/json" hidden>
					<div class="ui hidden negative message">
						<p>Невозможно загрузить файл. Проверьте правильность пути, формат или укажите другой файл.</p>
					</div>
				</div>
				<div class="actions">
					<div class="ui negative cancel button">Отмена</div>
					<div class="ui positive ok button">Загрузить</div>
				</div>
			</div>`);

		function ToggleError(hide) {
			if (!hide && hide === $error.is(':visible')) $error.transition('fade up');
			if (hide) $approve.addClass('loading');
			else $approve.removeClass('loading');
		}

		let currentFile;
		let $input = $modal.find('input[type="file"]');
		let $label = $modal.find('.content .file.button .label');
		let $error = $modal.find('.negative.message');
		let $approve = $modal.find('.actions .ok.button');
		$modal.find('.content .file.button').click(() => $input.trigger('click'));
		$input.change(function () {
			currentFile = this.files && this.files[0] ? this.files[0] : false;
			$label.text(currentFile && currentFile.name || 'Выбрать файл');
		});
		$modal.show = () => $modal.modal('show');
		scope.container.find('.graph-editor').append($modal);
		$modal.modal({
			transition: 'horizontal flip',
			blurring: true,
			onApprove: function () {
				if (!currentFile) ToggleError(false);
				else {
					ToggleError(true);
					let reader = new FileReader();
					reader.onerror = reader.onabort = () => ToggleError(false);
					reader.onload = function (e) {
						try {
							scope.deserialize(e.target.result);
							$approve.removeClass('loading');
							$modal.modal('hide');
						} catch (e) {
							ToggleError(false);
						}
					};
					reader.readAsText(currentFile);
				}
				return false;
			},
		});
		return $modal;
	}

	/*
	 item = {
	 name: data-name_attribute,
	 label: displayed_text,
	 icon: semantic_ui (https://semantic-ui.com/elements/icon without 'icon'),
	 click: jquery_callback
	 }
	 */
	function BuildMenu(...items) {
		let $items = items.map(item => jQuery(`<a class="item" data-name="${item.name}">
									<i class="${item.icon} icon"></i>
									${item.label}
								</a>`)
			.click(item.click));
		let $menu = jQuery(`<div class="graph-menu">
						<div class="ui compact labeled icon raised menu">		
						</div>
					</div>`);
		$menu.find('.menu').append(...$items);
		return $menu;
	}

	function BuildEditor(elementClass, elementType, saveCallback, deleteCallback) {
		let elClass = scope.types[elementClass];

		let buf = Object.keys(elClass).map(t => `<div class="item" data-value="${t}" data-text='
														<div class="ui ${elClass[t].color} empty circular label"></div> ${elClass[t].name}
													'>
														<div class="ui ${elClass[t].color} empty circular label"></div> ${elClass[t].name} 
														<span class="description">${elClass[t].description}</span>
													</div>`);
		let labelBuf;
		if (elementClass === GraphEditor.ElementClasses.edge.classID) {
			labelBuf = '<div class="label-text" contenteditable="true" data-placeholder="Введите название">Название</div>';
		} else if (scope.types[elementClass][elementType]['titles']) {
			let tbuf = Object.keys(titles).map(t => `<div class="item" data-value="${t}" data-text='${titles[t]}'>${titles[t]}</span></div>`);
			labelBuf = `<div class="ui search selection dropdown"><input type="hidden" value="0" data-property="title">
								<i class="dropdown icon"></i>
								<div class="label-text text">Название</div>								
								<div class="menu">${tbuf.join('')}</div>
							</div>`;
		} else {
			labelBuf = '<div class="label-text" contenteditable="true" data-placeholder="Введите название">Название</div>';
		}

		let $editor = jQuery(`<div class="class-editor">
				<div class="ui raised card">
					<div class="content">
						<div class="label">${labelBuf}</div>
						<div class="meta">${elementClass}</div>
						<div class="description"><p contenteditable="true" data-placeholder="Введите описание">Описание</p>
							<div class="ui inline labeled dropdown"><input type="hidden" value="0" data-property="type">
								<div class="text">${jQuery(buf[0]).find('.item').data('text')}</div>
								<i class="dropdown icon"></i>
								<div class="menu">${buf.join('')}</div>
							</div>
						</div>
					</div>
					<div class="ui bottom attached buttons">
						<button class="delete ui grey button">Удалить</button>
						<div class="or" data-text="?"></div>
						<button class="save ui positive button">Сохранить</button>
					</div>
				</div>
			</div>`);

		let $label = $editor.find('.content>.label .label-text');
		$editor.find('.content>.label .dropdown').dropdown();
		let $title = $editor.find('.content p[contenteditable="true"]');
		let $type = $editor.find('.content>.description .dropdown').dropdown();
		$editor.load = function (graphObject) {
			$editor.object = graphObject;
			$label.text(graphObject.label || '');
			$title.text(graphObject.title || '');
			$type.dropdown('set exactly', '' + (graphObject.type || '0'));
			$editor.transition($editor.is(":visible") ? 'jiggle' : 'fade right');
			return $editor;
		};
		$editor.hide = function () {
			if ($editor.is(":visible"))
				$editor.transition('fade right');
		};
		$editor.find('.save.button').click(function () {
			SetOrDelete($editor.object, 'label', $label.text().trim());
			SetOrDelete($editor.object, 'title', $title.text());
			$editor.object.type = $type.dropdown('get value')[0];
			$editor.hide();
			saveCallback(elementClass, $editor.object);
		});
		$editor.find('.delete.button').click(function () {
			$editor.hide();
			deleteCallback(elementClass, $editor.object);
		});
		return $editor;
	}

	function SetOrDelete(object, property, value) {
		// TODO Переписать, что удалять если объет содержит такое же свойство, как переданное
		// if (!value && object.hasOwnProperty(property)) delete object[property];
		if (!value) delete object[property];
		else {
			object[property] = value;
		}
		return object;
	}

	function Update(elementClass, element, save) {
		scope.graph.storePositions();
		let pos = scope.data[elementClass].get(element.id);
		element = Object.assign(element, scope.types[elementClass][element.type].template, pos && pos.hasOwnProperty('x') ? {x: pos.x, y: pos.y} : {});
		if (save) {
			scope.data[elementClass].remove(element.id);
			scope.data[elementClass].add(element);
		}
		return element;
	}

	function StabilizeFitZoom() {
		scope.engine.graph.stabilize();
		FitZoom();
	}

	function FitZoom() {
		return scope.engine.graph.fit({animation: true});
		scope.engine.graph.storePositions();
		let nodes = scope.engine.nodes.get();
		let x, y;
		if (!nodes.length) x = y = 0;
		else {
			x = nodes.map(n => n.x).reduce((a, b) => a + b) / nodes.length;
			y = nodes.map(n => n.y).reduce((a, b) => a + b) / nodes.length;
		}
		scope.engine.graph.moveTo({
			position: {x: x, y: y},
			scale: 2,
			animation: true
		});
	}

	function Download(content, fileName, contentType) {
		let a = document.createElement("a");
		let file = new Blob([content], {type: contentType});
		a.href = URL.createObjectURL(file);
		a.download = fileName;
		a.click();
		//TODO: remove this <a>
	}

	let $graph = BuildGraph();
	scope.upload = () => BuildModal().show();
	let $menu = editable ? BuildMenu({
		name: 'addNode',
		label: 'Новый узел',
		icon: 'plus square',
		click: _ => scope.engine.graph.addNodeMode()
	}, {
		name: 'addEdge',
		label: 'Новое ребро',
		icon: 'long arrow alternate right',
		click: _ => scope.engine.graph.addEdgeMode()
	}, {
		name: 'fitZoom',
		label: 'Выровнять',
		icon: 'expand',
		click: _ => FitZoom()
	}, {
		name: 'save',
		label: 'Сохранить',
		icon: 'save',
		click: _ => scope.download()
	}, {
		name: 'load',
		label: 'Загрузить',
		icon: 'folder open',
		click: _ => scope.upload()
	}) : null;
	scope.container.find('.graph-editor').append($graph, $menu);
	FitZoom();
	return scope;
}

function CopyObject(object) {
	if (typeof (object) !== 'object') return null;
	return Object.assign({}, object);
}

function GetArgumentNames(func) {
	return func.toString()
		.replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg, '')
		.match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m)[1]
		.split(/,/);
}

function ZipArrays(arr1, arr2) {
	return arr1.map((k, i) => [k, arr2[i]]);
}

function CreateObjectFromArguments(args) {
	return Object.fromEntries(ZipArrays(GetArgumentNames(args.callee), args));
}

function CreateObjectFromProperties(objectPropertyName, ...objects) {
	return Object.fromEntries(objects.map(o => [o[objectPropertyName], o]));
}

/**
 * Call func right after (not guaranteed) current frame.
 *
 * Use arrow functions instead of bare reference.
 *
 * @return {number}
 */
function Incoming(func) {
	return setTimeout(func, 0);
}


/**
 * Get only unique PRIMITIVE values from array.
 * @param array {any[]}
 * @returns {any[]}
 */
function GetArrayUniques(array) {
	return [...new Set(array)];
}

/**
 * Создать событие.
 * @param eventName
 * @param eventType {'pipe','broadcast'} - Тип события. Pipe: композиция подписчиков, broadcast: независимые подписчики.
 */
function CreateEvent(eventName, eventDescription, eventType) {
	let e = {
		eventName: eventName,
		eventDescription: eventDescription,
		eventType: eventType,
		callbacks: {},
		Subscribe: function (callback, replaceExisting = false, callbackID = undefined) {
			let id = callbackID || GraphEditor.GenerateID();
			if (e.callbacks.hasOwnProperty(id) && !replaceExisting)
				throw `Event ${e.eventName} already has callback with id ${id}. Try to use replaceExisting = true or another callbackID.`;
			e.callbacks[id] = callback;
			return [id];
		},
		Unsubscribe: function (callbackID) {
			if (e.callbacks.hasOwnProperty(callbackID)) {
				delete e.callbacks[callbackID];
				return [callbackID];
			}
			return null;
		},
		Trigger: function (...args) {
			if (e.eventType === 'pipe') {
				let callbacks = Object.values(e.callbacks);
				if (args.length === 0) {
					callbacks.forEach(cb => cb());
					return;
				}
				if (args.length === 1) {
					let buf = args[0];
					callbacks.forEach(cb => buf = cb(buf));
					return buf;
				}
				let buf = args;
				callbacks.forEach(cb => buf = cb(...buf));
				return buf;
			} else if (e.eventType === 'broadcast') return Object.fromEntries(Object.entries(e.callbacks).map(([callbackID, callback]) => [callbackID, callback(...args)]));
			else throw `Unknown event type ${e.eventType}. Can only trigger pipe or broadcast events.`;
		},
	};
	return e;
}

function CreateNestedEvent(eventName, eventDescription = undefined, ...parentEvents) {
	let e = CreateEvent(eventName, eventDescription, 'nested');
	e.parentEvents = parentEvents;
	e.eventDescription = e.eventDescription || GetArrayUniques(e.parentEvents.map(pe => pe.eventDescription)).join('; ');
	delete e.callbacks;
	e.Subscribe = (...eventConstructorArgs) => e.parentEvents.map(pe => pe.Subscribe(...eventConstructorArgs));
	e.Unsubscribe = (...eventConstructorArgs) => e.parentEvents.map(pe => pe.Unsubscribe(...eventConstructorArgs));
	return e;
}


GraphEditor.CreateElementClass = function (classID, visTemplate) { return CreateObjectFromArguments(arguments); };
GraphEditor.CreatePropertyClass = function (propertyClassID, propertyConstructor, propertyParser) { return CreateObjectFromArguments(arguments); };
GraphEditor.CreateElementStyle = function (styleID, elementClass, visTemplate) { return CreateObjectFromArguments(arguments); };
GraphEditor.CreateElementProperty = function (propertyID, propertyClass, propertyName, propertyDefaultValue) { return CreateObjectFromArguments(arguments); };
GraphEditor.CreateElementType = function (typeID, elementClass, typeName, typeDescription, typeColor, typePropertiesArray, typeStylesArray) {
	let otherClasses = typeStylesArray.filter(style => style.elementClass !== elementClass);
	if (otherClasses.length)
		throw `Can not create ${elementClass} ${typeName} type with style(s) ${otherClasses.map(style => style.styleID + '[' + style.elementClass + ']').join(', ')}.`;
	let type = CreateObjectFromArguments(arguments);
	type.visTemplate = Object.assign({}, elementClass.visTemplate, ...typeStylesArray.map(style => style.visTemplate));
	type.propertiesValues = Object.fromEntries(typePropertiesArray.map(prop => [prop.propertyID, prop.propertyDefaultValue]));
	return type;
};
GraphEditor.CreateElement = function (elementID, elementType, elementPropertiesValuesDict = {}, ...elementClassArguments) {
	let propsVals = Object.assign({}, elementType.propertiesValues, elementPropertiesValuesDict);
	return {
		elementID: elementID,
		propertiesValues: propsVals,
		visTemplate: Object.assign({}, elementType.visTemplate, Object.fromEntries(ZipArrays(Object.keys(elementType.elementClass.visTemplate).slice(0, elementClassArguments.length), elementClassArguments))),
		elementType: elementType,
		nestedGraph: {},
		cachedTypedPropertiesValues: {[elementType.typeID]: propsVals},
	};
}
GraphEditor.ElementClasses = CreateObjectFromProperties('classID', GraphEditor.CreateElementClass('node', {x: 0, y: 0}), GraphEditor.CreateElementClass('edge', {from: 0, to: 0})); //INFO: Now only two classes of elements ara available: nodes and edges. So they are hardcoded.
GraphEditor.PropertyClasses = CreateObjectFromProperties('propertyClassID',
	GraphEditor.CreatePropertyClass('text', (elementProperty, propertyValue) => `<div data-property="${elementProperty.propertyID}" title="${elementProperty.propertyName}" contenteditable="true">${propertyValue}</div>`, $elementProperty => $elementProperty.text())
);

GraphEditor.CreateType_old = function (id, name, description, color, template, titles) {
	return {
		id: id,
		template: template,
		name: name,
		color: color,
		description: description,
		titles: titles
	};
};
GraphEditor.CreateStyles_old = function (...types) {
	let styles = {};
	// TODO Тоже более красиво хочется преобразовать в словарь...
	for (let t in types) {
		styles[types[t].id] = types[t];
	}
	return styles
};
GraphEditor.GenerateID = function () {
	let id = [];
	for (let i = 0; i < 40; i++) id.push((Math.random() * 16 | 0).toString(16));
	return id.join('');
}


//BUG #1: spawned two copies of editor for each node.
//TODO #2: default value is not shown when select because it is set to whole array. Add bindings or adapters.
//BUG #3: all ids must be string.


//-----------------------------------------------------------------------------------
/**
 * Data Graph
 * @param graphEditor {GraphEditor}
 * @constructor
 */
function DataGraph(graphEditor) {

	graphEditor.SetElementProperty('pipeData', 'hiddenLabel', 'transmitted data', '*');
	graphEditor.SetElementType('dataPipe', 'edge', 'Data pipe', 'Передаваемые данные', 'blue', ['pipeData'], ['defaultEdge']);

	function DummyHandler(processorData) {return processorData;}

	/**
	 * @param connectionType {'from'|'to'}
	 * @returns {['edge elements IDs']}
	 */
	function GetIOEdges(processorID, connectionType) {
		return scope.graphEditor.GetElement().filter(element => scope.graphEditor.GetElementType(element.elementTypeID).elementClassID === 'edge' && element.visTemplate[connectionType] === processorID);
	}

	function GetProcessorData(processorID, inputElements = undefined, outputElements = undefined) {
		return {
			parameters: Object.fromEntries(Object.entries(scope.graphEditor.GetElement(processorID).elementPropertiesValues).map(([paramID, paramValue]) => [scope.graphEditor.GetElementProperty(paramID).propertyName, paramValue])),
			inputs: (inputElements || scope.GetInputs(processorID)).map(edgeElement => edgeElement.elementPropertiesValues.hiddenLabel),
			outputs: (outputElements || scope.GetOutputs(processorID)).map(edgeElement => edgeElement.elementPropertiesValues.hiddenLabel),
		};
	}

	function CompareObjects(obj1, obj2) {
		return JSON.stringify(obj1) === JSON.stringify(obj2);
	}

	function Callback(processorElement, handlerType) {
		let inputs = scope.GetInputs(processorElement.elementID);
		let outputs = scope.GetInputs(processorElement.elementID);
		let args = GetProcessorData(processorElement.elementID, inputs, outputs);
		let data = callbacks[processorElement.elementTypeID][handlerType](CopyObject(args), processorElement, inputs, outputs);
		if (!CompareObjects(data.parameters, args.parameters)) scope.graphEditor.SetElement(processorElement.elementID, processorElement.elementType, data.parameters, processorElement.elementClassArguments, processorElement.nestedGraph, processorElement.cachedTypedPropertiesValues);
		if (!CompareObjects(data.inputs, args.inputs)) inputs.forEach((element, i) => ge.SetElement(element.elementID, 'dataPipe', {hiddenLabel: data.inputs[i]}, element.elementClassArguments, element.nestedGraph, element.cachedTypedPropertiesValues));
		if (!CompareObjects(data.outputs, args.outputs)) outputs.forEach((element, i) => ge.SetElement(element.elementID, 'dataPipe', {hiddenLabel: data.outputs[i]}, element.elementClassArguments, element.nestedGraph, element.cachedTypedPropertiesValues));
	}

	//TODO: add processorID validation.


	let callbacks = {};
	let scope = {
		graphEditor: graphEditor,
		dummyHandler: DummyHandler,
		GetInputs: processorID => GetIOEdges(processorID, 'to'),
		GetOutputs: processorID => GetIOEdges(processorID, 'from'),
		GetProcessorData: processorID => GetProcessorData(processorID),


		//region Processor type manipulations
		SetProcessorType: function (processorTypeID, processorTypeName, processorTypeDescription, processorTypeColor = 'hidden', processorPropertyClassesIDsDict = {}, processorStylesIDsArray = ['defaultNode'], processorConfigHandler = scope.dummyHandler, processorInputHandler = scope.dummyHandler, processorOutputHandler = scope.dummyHandler, triggerEvents = true) {
			let processorType = {
				processorTypeID: processorTypeID,
				processorTypeName: processorTypeName,
				processorTypeDescription: processorTypeDescription,
				processorTypeColor: processorTypeColor,
				processorPropertyClassesIDsDict: processorPropertyClassesIDsDict, //{Accuracy:[text,'1'],Type:['customSelect',['Upper','Lower']]}
				processorStylesIDsArray: processorStylesIDsArray,
				processorConfigHandler: processorConfigHandler,
				processorInputHandler: processorInputHandler,
				processorOutputHandler: processorOutputHandler,
			}
			if (triggerEvents) {
				if (!scope.graphEditor.GetElementType(processorTypeID))
					processorType = scope.onCreateProcessorType.Trigger(processorType);
				else
					processorType = scope.onSetProcessorType.Trigger(processorType);
			}
			callbacks[processorType.processorTypeID] = {
				processorConfigHandler: processorType.processorConfigHandler,
				processorInputHandler: processorType.processorInputHandler,
				processorOutputHandler: processorType.processorOutputHandler,
			};
			let props = Object.entries(processorType.processorPropertyClassesIDsDict).map(([paramName, paramData]) => {
				let propID = GraphEditor.GenerateID();
				scope.graphEditor.SetElementProperty(propID, paramData[0], paramName, paramData[1]);
				return propID;
			});
			return scope.graphEditor.SetElementType(processorType.processorTypeID, 'node', processorType.processorTypeName, processorType.processorTypeDescription, processorType.processorTypeColor, props, processorType.processorStylesIDsArray);
		},
		onCreateProcessorType: CreateEvent('onCreateProcessorType', '(processorType)->processorType', 'pipe'),
		onSetProcessorType: CreateEvent('onSetProcessorType', '(processorType)->processorType', 'pipe'),
		//endregion
	};


	let onChangeElement = CreateNestedEvent('onChangeElement', false, scope.graphEditor.onUpdateElement, scope.graphEditor.onRemoveElement);
	onChangeElement.Subscribe(function (element) {
		if (callbacks.hasOwnProperty(element.elementTypeID)) Incoming(() => Callback(element, 'processorConfigHandler'));
		else if (scope.graphEditor.GetElementType(element.elementTypeID).elementClassID === 'edge') {
			let toElement = scope.graphEditor.GetElement(element.visTemplate.to);
			if (toElement && callbacks.hasOwnProperty(toElement.elementTypeID)) Incoming(() => Callback(toElement, 'processorInputHandler'));
			let fromElement = scope.graphEditor.GetElement(element.visTemplate.from);
			if (fromElement && callbacks.hasOwnProperty(fromElement.elementTypeID)) Incoming(() => Callback(fromElement, 'processorOutputHandler'));
		}
		return element;
	});
	scope.graphEditor.onRemoveElementType.Subscribe(function (elementType) {
		if (callbacks.hasOwnProperty(elementType.typeID))
			delete callbacks[elementType.typeID];
		return elementType;
	});


	return scope;
}
