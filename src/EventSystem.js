/**
 * Создать событие.
 * @param eventName
 * @param eventType {'pipe','broadcast'} - Тип события. Pipe: композиция подписчиков, broadcast: независимые подписчики.
 */
export function Event(eventName, eventDescription, eventType) {
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
	let e = Event(eventName, eventDescription, 'nested');
	e.parentEvents = parentEvents;
	e.eventDescription = e.eventDescription || GetArrayUniques(e.parentEvents.map(pe => pe.eventDescription)).join('; ');
	delete e.callbacks;
	e.Subscribe = (...eventConstructorArgs) => e.parentEvents.map(pe => pe.Subscribe(...eventConstructorArgs));
	e.Unsubscribe = (...eventConstructorArgs) => e.parentEvents.map(pe => pe.Unsubscribe(...eventConstructorArgs));
	return e;
}

