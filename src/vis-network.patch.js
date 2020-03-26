vis.DataSet.prototype._updateItem = function _updateItem(item) {
	//Monkeypatch 1.1
	let id = item[this._idProp];
	if (id == null) throw new Error("Cannot update item: item has no id (item: " + JSON.stringify(item) + ")");
	let d = this._data.get(id);
	if (!d) throw new Error("Cannot update item: no item with id " + id + " found");
	Object.getOwnPropertyNames(d).filter(p => p !== 'x' && p !== 'y').forEach(p => delete d[p]);
	Object.getOwnPropertyNames(item).forEach(p => d[p] = item[p]);
	return id;
};
