/*
 container - селектор/dom-элемент/jQuery, будет использован первый элемент из выборки
 nodeStyles - массив стилей узлов (https://visjs.github.io/vis-network/docs/network/nodes.html)
 edgeStyles - массив стилей рёбер (https://visjs.github.io/vis-network/docs/network/edges.html)
 */
function GraphEditor(container, nodeStyles, titles = ['Новый узел'], edgeStyles, nodesData, edgesData) {
	//TODO: сделать, чтобы изменение graph.types[class] автоматически применялись (переконструировались меню редакторов).

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
	 * Создать событие.
	 * @param eventName
	 */
	function CreateEvent(eventName, eventDescription) {
		let e = {
			eventName: eventName,
			eventDescription: eventDescription,
			callbacks: {},
			Subscribe: function (callback, replaceExisting = false, callbackID = undefined) {
				let id = callbackID || GraphEditor.GenerateID();
				if (e.callbacks.hasOwnProperty(id) && !replaceExisting)
					throw `Event ${e.eventName} already has callback with id ${id}. Try to use replaceExisting = true or another callbackID.`;
				e.callbacks[id] = callback;
			},
			Unsubscribe: function (callbackID) {
				if (e.callbacks.hasOwnProperty(callbackID))
					delete e.callbacks[callbackID];
			},
			TriggerAll: function (...args) {
				return Object.fromEntries(Object.entries(e.callbacks).map(([callbackID, callback]) => [callbackID, callback(...args)]));
			},
			TriggerPipe: function (...args) {
				let buf = args;
				for (let callbackID in e.callbacks)
					buf = e.callbacks[callbackID](buf);
				// Return result not array with result in case of single argument.
				if (args.length === 0)
					return;
				if (args.length === 1)
					return buf[0];
				return buf;
			},
		};
		return e;
	}

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


	let scope = {
		container: jQuery(container).first(),
		save: () => Download(scope.serialize(), 'graph.json', 'application/json'),
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

			//region Nodes manipulation
			nodes: new vis.DataSet(),
			SetNode: function (visNode, triggerEvents = true) {
				visNode = ValidateVisNode(visNode);
				if (!scope.engine.GetNode(visNode.id)) return scope.engine.nodes.add(ValidateVisNode(triggerEvents ? scope.engine.onCreateNode.TriggerPipe(visNode) : visNode));
				return scope.engine.nodes.update(ValidateVisNode(triggerEvents ? scope.engine.onSetNode.TriggerPipe(visNode) : visNode));
			},
			onCreateNode: CreateEvent('onCreateNode', '(visNode)->visNode'),
			onSetNode: CreateEvent('onSetNode', '(visNode)->visNode'),
			GetNode: nodeID => scope.engine.nodes.get(nodeID),
			RemoveNode: (visNodeOrNodeID, triggerEvents = true) => scope.engine.nodes.remove(triggerEvents ? scope.engine.onRemoveNode.TriggerPipe(visNodeOrNodeID) : visNodeOrNodeID),
			onRemoveNode: CreateEvent('onRemoveNode', '(visNodeOrNodeID)->visNodeOrNodeID'),
			onStartEditingNode: CreateEvent('onStartEditingNode', '(visNode)->undefined'),
			//endregion

			//region Edges manipulation
			edges: new vis.DataSet(),
			SetEdge: function (visEdge, triggerEvents = true) {
				visEdge = ValidateVisEdge(visEdge);
				if (!scope.engine.GetEdge(visEdge.id)) return scope.engine.edges.add(ValidateVisEdge(triggerEvents ? scope.engine.onCreateEdge.TriggerPipe(visEdge) : visEdge));
				return scope.engine.edges.update(ValidateVisEdge(triggerEvents ? scope.engine.onSetEdge.TriggerPipe(visEdge) : visEdge));
			},
			onCreateEdge: CreateEvent('onCreateEdge', '(visEdge)->visEdge'),
			onSetEdge: CreateEvent('onSetEdge', '(visEdge)->visEdge'),
			GetEdge: edgeID => scope.engine.edges.get(edgeID),
			RemoveEdge: (visEdgeOrEdgeID, triggerEvents = true) => scope.engine.edges.remove(triggerEvents ? scope.engine.onRemoveEdge.TriggerPipe(visEdgeOrEdgeID) : visEdgeOrEdgeID),
			onRemoveEdge: CreateEvent('onRemoveEdge', '(visEdgeOrEdgeID)->visEdgeOrEdgeID'),
			onStartEditingEdge: CreateEvent('onStartEditingEdge', '(visEdge)->undefined'),
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
			scope.elementClasses[elemtnClass.classID] = triggerEvents ? event.TriggerPipe(elemtnClass) : elemtnClass;
			return [elemtnClass.classID];
		},
		onCreateElementClass: CreateEvent('onCreateElementClass', '(elementClass)->elementClass'),
		onSetElementClass: CreateEvent('onSetElementClass', '(elementClass)->elementClass'),
		GetElementClass: classID => typeof (classID) === 'undefined' ? Object.values(scope.elementClasses) : scope.elementClasses[classID] || null,
		RemoveElementClass: function (classIDOrElementClass, triggerEvents = true) {
			if (triggerEvents) classIDOrElementClass = scope.onRemoveElementClass.TriggerPipe(classIDOrElementClass);
			if (typeof (classIDOrElementClass) === 'undefined') return [];
			let id = typeof (classIDOrElementClass) === 'object' ? classIDOrElementClass.classID : classIDOrElementClass;
			if (!scope.elementClasses.hasOwnProperty(id)) return [];
			delete scope.elementClasses[id];
			return [id];
		},
		onRemoveElementClass: CreateEvent('onRemoveElementClass', '(classIDOrElementClass)->classIDOrElementClass'),
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
			scope.propertyClasses[propertyClass.propertyClassID] = triggerEvents ? event.TriggerPipe(propertyClass) : propertyClass;
			return [propertyClass.propertyClassID];
		},
		onCreatePropertyClass: CreateEvent('onCreatePropertyClass', '(propertyClass)->propertyClass'),
		onSetPropertyClass: CreateEvent('onSetPropertyClass', '(propertyClass)->propertyClass'),
		GetPropertyClass: propertyClassID => typeof (propertyClassID) === 'undefined' ? Object.values(scope.propertyClasses) : scope.propertyClasses[propertyClassID] || null,
		RemovePropertyClass: function (propertyClassIDOrPropertyClass, triggerEvents = true) {
			if (triggerEvents) propertyClassIDOrPropertyClass = scope.onRemovePropertyClass.TriggerPipe(propertyClassIDOrPropertyClass);
			if (typeof (propertyClassIDOrPropertyClass) === 'undefined') return [];
			let id = typeof (propertyClassIDOrPropertyClass) === 'object' ? propertyClassIDOrPropertyClass.propertyClassID : propertyClassIDOrPropertyClass;
			if (!scope.propertyClasses.hasOwnProperty(id)) return [];
			delete scope.propertyClasses[id];
			return [id];
		},
		onRemovePropertyClass: CreateEvent('onRemovePropertyClass', '(propertyClassIDOrPropertyClass)->propertyClassIDOrPropertyClass'),
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
			scope.elementStyles[elementStyle.styleID] = triggerEvents ? event.TriggerPipe(elementStyle) : elementStyle;
			return [elementStyle.styleID];
		},
		onCreateElementStyle: CreateEvent('onCreateElementStyle', '(elementStyle)->elementStyle'),
		onSetElementStyle: CreateEvent('onSetElementStyle', '(elementStyle)->elementStyle'),
		GetElementStyle: styleID => typeof (styleID) === 'undefined' ? Object.values(scope.elementStyles) : scope.elementStyles[styleID] || null,
		RemoveElementStyle: function (styleIDOrElementStyle, triggerEvents = true) {
			if (triggerEvents) styleIDOrElementStyle = scope.onRemoveElementStyle.TriggerPipe(styleIDOrElementStyle);
			if (typeof (styleIDOrElementStyle) === 'undefined') return [];
			let id = typeof (styleIDOrElementStyle) === 'object' ? styleIDOrElementStyle.styleID : styleIDOrElementStyle;
			if (!scope.elementStyles.hasOwnProperty(id)) return [];
			delete scope.elementStyles[id];
			return [id];
		},
		onRemoveElementStyle: CreateEvent('onRemoveElementStyle', '(styleIDOrElementStyle)->styleIDOrElementStyle'),
		//endregion

		//region Element properties manipulation
		elementProperties: {},
		SetElementProperty: function (propertyID, propertyClassID, propertyName, propertyDefaultValue, triggerEvents = true) {
			let elementProperty = {
				propertyID: propertyID,
				propertyClassID: propertyClassID,
				propertyName: propertyName,
				propertyDefaultValue: propertyDefaultValue,
			};
			let event = !scope.GetElementProperty(elementProperty.propertyID) ? scope.onCreateElementProperty : scope.onSetElementProperty;
			scope.elementProperties[elementProperty.propertyID] = triggerEvents ? event.TriggerPipe(elementProperty) : elementProperty;
			return [elementProperty.propertyID];
		},
		onCreateElementProperty: CreateEvent('onCreateElementProperty', '(elementProperty)->elementProperty'),
		onSetElementProperty: CreateEvent('onSetElementProperty', '(elementProperty)->elementProperty'),
		GetElementProperty: propertyID => typeof (propertyID) === 'undefined' ? Object.values(scope.elementProperties) : scope.elementProperties[propertyID] || null,
		RemoveElementProperty: function (propertyIDOrElementProperty, triggerEvents = true) {
			if (triggerEvents) propertyIDOrElementProperty = scope.onRemoveElementProperty.TriggerPipe(propertyIDOrElementProperty);
			if (typeof (propertyIDOrElementProperty) === 'undefined') return [];
			let id = typeof (propertyIDOrElementProperty) === 'object' ? propertyIDOrElementProperty.propertyID : propertyIDOrElementProperty;
			if (!scope.elementProperties.hasOwnProperty(id)) return [];
			delete scope.elementProperties[id];
			return [id];
		},
		onRemoveElementProperty: CreateEvent('onRemoveElementProperty', '(propertyIDOrElementProperty)->propertyIDOrElementProperty'),
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
				elementType = scope.onValidateElementType.TriggerPipe(elementType);
			elementType = ValidateElementType(elementType);
			elementType.visTemplate = Object.assign({}, scope.GetElementClass(elementType.elementClassID).visTemplate, ...elementType.typeStylesIDsArray.map(styleID => scope.GetElementStyle(styleID)).filter(style => !!style).map(style => style.visTemplate));
			elementType.propertiesValues = Object.fromEntries(elementType.typePropertiesIDsArray.map(propertyID => scope.GetElementProperty(propertyID)).filter(property => !!property).map(property => [property.propertyID, property.propertyDefaultValue]));
			let event = !scope.GetElementType(elementType.typeID) ? scope.onCreateElementType : scope.onSetElementType;
			elementType = triggerEvents ? event.TriggerPipe(elementType) : elementType;
			scope.elementTypes[elementType.typeID] = ValidateElementType(elementType);
			return [elementType.typeID];
		},
		onValidateElementType: CreateEvent('onValidateElementType', '(rawElementType)->rawElementType'),
		onCreateElementType: CreateEvent('onCreateElementType', '(elementType)->elementType'),
		onSetElementType: CreateEvent('onSetElementType', '(elementType)->elementType'),
		GetElementType: typeID => typeof (typeID) === 'undefined' ? Object.values(scope.elementTypes) : scope.elementTypes[typeID] || null,
		RemoveElementType: function (typeIDOrElementType, triggerEvents = true) {
			if (triggerEvents) typeIDOrElementType = scope.onRemoveElementType.TriggerPipe(typeIDOrElementType);
			if (typeof (typeIDOrElementType) === 'undefined') return [];
			let id = typeof (typeIDOrElementType) === 'object' ? typeIDOrElementType.typeID : typeIDOrElementType;
			if (!scope.elementTypes.hasOwnProperty(id)) return [];
			delete scope.elementTypes[id];
			return [id];
		},
		onRemoveElementType: CreateEvent('onRemoveElementType', '(typeIDOrElementType)->typeIDOrElementType'),
		//endregion

		//region Elements manipulation
		elements: {},
		SetElement: function (elementID, elementTypeID, elementPropertiesValuesDict = {}, elementClassArguments = {}, triggerEvents = true) {
			let element = {
				elementID: elementID,
				elementTypeID: elementTypeID,
				elementPropertiesValuesDict: elementPropertiesValuesDict,
				elementClassArguments: elementClassArguments,
			}
			if (triggerEvents)
				element = scope.onValidateElement.TriggerPipe(element);
			element = ValidateElement(element);
			let elementType = scope.GetElementType(element.elementTypeID);
			element.propertiesValues = Object.assign({}, elementType.propertiesValues, elementPropertiesValuesDict);
			element.nestedGraph = {};
			element.cachedTypedPropertiesValues = {[element.elementTypeID]: Object.assign({}, element.propertiesValues)};
			element.visTemplate = Object.assign({}, elementType.visTemplate, elementClassArguments);
			let event = !scope.GetElement(element.elementID) ? scope.onCreateElement : scope.onSetElement;
			element = triggerEvents ? event.TriggerPipe(element) : element;
			scope.elements[element.elementID] = ValidateElement(element);
			return [element.elementID];
		},
		onValidateElement: CreateEvent('onValidateElement', '(rawElement)->rawElement'),
		onCreateElement: CreateEvent('onCreateElement', '(element)->element'),
		onSetElement: CreateEvent('onSetElement', '(element)->element'),
		GetElement: elementID => typeof (elementID) === 'undefined' ? Object.values(scope.elements) : scope.elements[elementID] || null,
		RemoveElement: function (elementIDOrElement, triggerEvents = true) {
			if (triggerEvents) elementIDOrElement = scope.onRemoveElement.TriggerPipe(elementIDOrElement);
			if (typeof (elementIDOrElement) === 'undefined') return [];
			let id = typeof (elementIDOrElement) === 'object' ? elementIDOrElement.elementID : elementIDOrElement;
			if (!scope.elements.hasOwnProperty(id)) return [];
			delete scope.elements[id];
			return [id];
		},
		onRemoveElement: CreateEvent('onRemoveElement', '(elementIDOrElement)->elementIDOrElement'),
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

	if (!scope.container.length) throw `Graph editor error: can not find container ${container}.`;


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
					editEdge: function (visEdge, callback) {
						if (visEdge.from === visEdge.to) callback(null);
						else {
							edgeEditingState = 0;
							Incoming(() => scope.engine.graph.disableEditMode());
							callback(scope.engine.onSetEdge.TriggerPipe(visEdge));
						}
					},
					addNode: function (visNode, callback) {
						delete visNode.label;
						Incoming(() => scope.engine.graph.disableEditMode());
						callback(scope.engine.onCreateNode.TriggerPipe(visNode));
					},
					addEdge: function (visEdge, callback) {
						delete visEdge.label;
						delete visEdge.title;
						Incoming(() => scope.engine.graph.disableEditMode());
						if (visEdge.from !== visEdge.to) callback(scope.engine.onCreateEdge.TriggerPipe(visEdge));
					}
				},
				locale: 'ru',
				physics: {
					enabled: true,
					stabilization: {
						fit: false
					}
				},
				layout: {
					hierarchical: {
						direction: "LR",
						sortMethod: "directed",
						shakeTowards: "leaves"
					}
				}
			});
		scope.engine.graph.addEventListener('select', function (e) {
			if (e.nodes.length) {
				//Start editing node
				editedElement = scope.engine.GetNode(e.nodes[0]);
				editedClass = 'node';
				scope.engine.onStartEditingNode.TriggerAll(editedElement);
			} else if (e.edges.length === 1) {
				//Start editing edge
				scope.engine.graph.editEdgeMode();
				editedElement = scope.engine.GetEdge(e.edges[0]);
				editedClass = 'edge';
				edgeEditingState = 1;
				scope.engine.onStartEditingEdge.TriggerAll(editedElement);
			} else if (editedElement && editedClass) {
				//End editing node/edge and set (update) new data.
				if (editedClass === 'node')
					scope.engine.SetNode(editedElement);
				else
					scope.engine.SetEdge(editedElement);
				editedClass = null;
				editedElement = null;
			}
		});
		$graph.find('canvas').click(function () {
			if (edgeEditingState === 1)
				edgeEditingState = 2;
			else if (edgeEditingState === 2) {
				edgeEditingState = 0;
				scope.engine.graph.disableEditMode();
				scope.engine.graph.unselectAll();
			}
		});
		return $graph;
	}

	// loadCallback приинмает загруженные данные. При ошибке должна выбросить исключение.
	function BuildModal(loadCallback) {
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
		$modal.initialize = function () {
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
								loadCallback(e.target.result);
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
		};
		$modal.show = () => $modal.modal('show');
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

	/*
	 returns editor jQuery with load function (graph editing object) -> editor jQuery
	 saveCallback = function (class, graph edited object)
	 deleteCallback = function (class, graph editing object)
	 */
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

	function HideEditors(exclude) {
		Object.getOwnPropertyNames(editors).filter(classValue => classValue !== exclude).forEach(classValue => editors[classValue].hide());
	}


	// noinspection JSCheckFunctionSignatures
	// TODO Теперь editors для каждой комбинации класс:тип
	let classTypeArray = Object.values(GraphEditor.ElementClasses).map(c => Object.keys(scope.types[c.classID]).map(t => [c.classID, t]));
	let editors = Object.fromEntries([].concat(...classTypeArray).map(classType => [
		classType[0] + ':' + classType[1],  // TODO Ужасная конструкция, надо подумать как это сделать по человечески
		BuildEditor(classType[0], classType[1], function (elementClass, element) {
			scope.engine.graph.disableEditMode();
			Update(elementClass, element, true);
		}, function (elementClass, element) {
			scope.engine.graph.disableEditMode();
			scope.data[elementClass].remove(element.id);
		})]));

	let $graph = BuildGraph(function (elementClass, element) {
		HideEditors(elementClass);
		editors[elementClass + ':' + element.type].load(element);  // TODO Ужасная конструкция, надо подумать как это сделать по человечески
	}, function (elementClass, element) {
		HideEditors();
		return Update(elementClass, element, false);
	});
	let $modal = BuildModal(scope.deserialize);
	scope.load = () => $modal.show();
	let $menu = BuildMenu({
		name: 'addNode',
		label: 'Новый узел',
		icon: 'plus square',
		click: function () {
			HideEditors();
			scope.engine.graph.addNodeMode();
		}
	}, {
		name: 'addEdge',
		label: 'Новое ребро',
		icon: 'long arrow alternate right',
		click: function () {
			HideEditors();
			scope.engine.graph.addEdgeMode();
		}
	}, {
		name: 'fitZoom',
		label: 'Выровнять',
		icon: 'expand',
		click: FitZoom
	}, {
		name: 'save',
		label: 'Сохранить',
		icon: 'save',
		click: scope.save
	}, {
		name: 'load',
		label: 'Загрузить',
		icon: 'folder open',
		click: scope.load
	});
	scope.container.html(jQuery('<div class="graph-editor"></div>').append($graph, $modal, $menu, ...Object.values(editors)));
	$modal.initialize();
	FitZoom();
	return scope;
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


//Vis Dataset Monkeypatch
vis.DataSet.prototype._updateItem = function (item) {
	let id = item[this._idProp];
	if (id == null) throw new Error("Cannot update item: item has no id (item: " + JSON.stringify(item) + ")");
	let d = this._data.get(id);
	if (!d) throw new Error("Cannot update item: no item with id " + id + " found");
	Object.getOwnPropertyNames(d).filter(p => p !== 'x' && p !== 'y').forEach(p => delete d[p]);
	Object.getOwnPropertyNames(item).forEach(p => d[p] = item[p]);
	return id;
}
