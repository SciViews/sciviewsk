// SciViews-K R objects explorer functions
// Define the 'sv.robjects' tree and implement RObjectsOverlay functions
// Copyright (c) 2009-2012, K. Barton & Ph. Grosjean (phgrosjean@sciviews.org)
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// sv.robjects namespace (not intended for external use)
//TODO: list of functions here...
//
////////////////////////////////////////////////////////////////////////////////
//TODO: identify packages by pos rather than name (allow for non-unique names)
//TODO: context menu for search-paths list
//TODO: renaming objects on the list - editable names
//TODO: add context menu item for environments: remove all objects
//TODO: add a checkbutton to show also hidden objects (starting with a dot)
//TODO: delegate context menu calculation to R
//TODO: smart refresh: keep opened nodes, preserve scrolling
//TODO: automatic refresh of the objects browser from R
////////////////////////////////////////////////////////////////////////////////

/*
JSON transport:

var nativeJSON = Components.classes["@mozilla.org/dom/json;1"]
	.createInstance(Components.interfaces.nsIJSON);
var result = sv.rconn.evalAtOnce('cat(toJSON(apply(sv_objList(compare=F), 1, as.list)))')
var objects = nativeJSON.decode(result)

for(i in objects) {
 objects[i]
// Fields: Class, Dims, Full.name, Group, Name, Recursive
}
*/
//var sv = parent.sv;

sv.robjects = {};

// sv.robjects constructor
(function () {
	// Item separator for objList
	var sep = ";;";

	var cmdPattern = 'print(objList(id = "%ID%_%ENV%_%OBJ%", envir = "%ENV%",' +
		' object = "%OBJ%", all.info = FALSE, compare = FALSE), sep = "' + sep +
		'", eol = "\\n")';

	var print = sv.cmdout.append;	/// XXX DEBUG
	var clear = sv.cmdout.clear;	/// XXX DEBUG

	// This should be changed if new icons are added
	var iconTypes = ['array', 'character', 'data.frame', 'Date', 'dist',
		'empty', 'factor', 'function', 'glm', 'htest', 'integer', 'list',
		'lm', 'lme', 'logical', 'matrix', 'nls', 'numeric', 'object', 'objects',
		'package', 'standardGeneric', 'S3', 'S4', 'ts', 'environment',
		'formula'];

	// Used in .contextOnShow
	var nonDetachable = [".GlobalEnv", "SciViews:TempEnv", "tools:RGUI",
		"package:svKomodo", "package:svMisc", "package:svSocket",
		"package:svHttp", "package:base"];

	// Reference to parent object for private functions
	var _this = this;
	var filterBy = 0; // Filter by name by default
	var isInitialized = false;

	// Set debug mode
	this.debug = sv.log.isAll(); 	// Set debug mode

	this.visibleData = [];
	this.treeData = [];
	this.treeBox = null;
	this.selection = null;

	var atomSvc = Components.classes["@mozilla.org/atom-service;1"]
		.getService(Components.interfaces.nsIAtomService);

	this.__defineGetter__ ('rowCount', function () {
		return(this.visibleData.length);
	});

	function _createVisibleData () {
		//if (!isInitialized) throw new Error("treeData not initialized");
		if (!isInitialized) return;
		
		var rowsBefore = _this.visibleData.length;
		var firstVisibleRow =  _this.treeBox?
			_this.treeBox.getFirstVisibleRow() : 0;
		
		_this.visibleData = [];
		_addVItems(_this.treeData, -1, 0);
		
		var rowsChanged = _this.visibleData.length - rowsBefore;
		if (rowsChanged) _this.treeBox.rowCountChanged(0, rowsChanged);
		
		// PhG: in ko7, _this.treeBox.view is not defined!
		//if (_this.treeBox.view.rowCount > _this.visibleData.length)
		//	throw new Error("Whoops....");

		if (firstVisibleRow < _this.visibleData.length)
			_this.treeBox.scrollToRow(firstVisibleRow);

		_this.treeBox.invalidateRange(
			_this.treeBox.getFirstVisibleRow(),
			_this.treeBox.getLastVisibleRow());
	};

	// RObjectLeaf constructor
	function RObjectLeaf (env, obj, arr, index, parentElement) {
		var type = parentElement?
			((parentElement.type == "environment")? 'object' :
			(parentElement.group == "function" ? "args" : "sub-object")) :
			'environment';
	
		var dimNumeric = 1;
		var pos = index;
		this.index = index;
		this.type = type;
		if (obj) { /// Objects
			dimNumeric = 1;
			var dimRegExp = /^(\d+x)*\d+$/;
			if (dimRegExp.test(arr[2])) {
				var dim = arr[2].split(/x/);
				for (var j in dim) dimNumeric *= parseInt(dim[j]);
			}
			this.name = arr[0];
			this.fullName = arr[1];
			this.dims = arr[2];
			this.group = arr[3];
			try {
				this.class = arr[4];
				this.env = env;
				this.list = (arr[5] == "TRUE");
				if (this.list) this.children = [];
				this.sortData = [this.name.toLowerCase(), dimNumeric,
					this.class.toLowerCase(),
					this.group.toLowerCase(), index];
			} catch(e) {
				print(e); //DEBUG
				print(arr);
			}
			this.parentObject = parentElement;
		} else { /// Environment
			pos = _this.searchPath.indexOf(env);
			this.name = this.fullName = env;
			this.children = [];
			this.class = "package";
			this.dims = dimNumeric = pos;
			this.sortData = [this.name.toLowerCase(), pos,
				this.class.toLowerCase(),
				this.type.toLowerCase()];
			this.isOpen = true;
		}
	}
	
	RObjectLeaf.prototype = {
		name: null,				fullName: null,
		children: undefined,	type: "environment",
		class: "package",		group: "",
		env: null,				list: false,
		isOpen: false,			dims: 0,
		sortData: [],			index: -1,
		parentObject: this.treeData,	
		//toString: function () {
		//	ret = [];
		//	for (var i in this)
		//		if(typeof this[i] != "function")
		//			ret.push(i + ":" + this[i]);
		//	return ret.join(" * ");
		//}
		toString: function () {
			return(this.env + "::" + this.fullName + " (" +
				(this.isOpen? "+" : ".") + ")" +
				(this.isOpen? "->" + this.children : ''));
		},
		childrenLoaded: false
		//get childrenLength() this.children ? this.children.length : 0,
		//set childrenLength(x) null
	}
	
	this.getRObjTreeLeafByName = function (name, env) {
		var root = this.treeData;
		if (!root.length) return(null);
		var j;
		for (j in root)
			if (root[j].fullName == env)
				if (!name) return(root[j]); else break;
		if (!name) return(null); // Package not found, nothing to do.
		return(_objTreeCrawler(name, root[j]));
	}
	
	_this.getRowByName = function (name, env) {
		var vd = _this.visibleData;
		var i;
		for (i = 0; i < vd.length; i++)
			if (name == vd[i].labels[4] && env == vd[i].origItem.env) break;
		return(i >= vd.length ? undefined : i);
	}
	
	function _objTreeCrawler (name, root) {
		var branch = root.children;
		for(var i in branch) {
			var bFullName = branch[i].fullName;
			if (bFullName == name) return(branch[i]);
			if ((name.indexOf(bFullName) == 0) &&
				("@$[".indexOf(name[bFullName.length]) != -1))
				return(_objTreeCrawler(name, branch[i]));
		}
		return(null);
	}
	
	// This replaces old _parseObjectList & _parseSubObjectList:
	this.parseObjListResult = function _parseObjListResult (data, rebuild,
		scrollToRoot) {
	
		var closedPackages = {};
		var currentPackages = _this.treeData.map(function (x) {
			closedPackages[x.name] = !x.isOpen;
			return(x.name);
		});
	
		if (rebuild) _this.treeData = [];
		var envName, objName, line, sep = ';;';
		var treeBranch, lastAddedRootElement;
		data = data.trim();
		if (!data) return;
		var lines = data.split(/[\r\n]{1,2}/);
	
		for (var i = 0; i < lines.length; i++) {
			if (lines[i].indexOf(sep) == -1) { // Parse list header
				if (lines[i].indexOf("Env=") == 0) {
					envName = lines[i].substr(4).trim();
					if (lines[i + 1].indexOf("Obj=") != 0)
						throw new Error("Expected 'Obj=' after 'Env='");
					objName = lines[i + 1].substr(4).trim();
					treeBranch = _this.getRObjTreeLeafByName(objName, envName);
					if (!treeBranch && !objName) { // This is environment
						treeBranch = new RObjectLeaf(envName, false);
						_this.treeData.push(treeBranch);
						if (currentPackages.indexOf(envName) == -1)
							lastAddedRootElement = treeBranch;
					}
					if (treeBranch) {
						var isEmpty = (lines.length == i + 2) || (lines[i + 2]
							.indexOf('Env') == 0);
						if (!objName) {
							if (closedPackages[envName])
								treeBranch.isOpen = false;
						} else treeBranch.isOpen = true;
						treeBranch.children = [];
						treeBranch.childrenLoaded = true;
					}
				}
				i += 2; // advance to object list
			}
			if (!treeBranch) continue; // Object missing, skip all children
			if (i >= lines.length) break;
			if (lines[i].indexOf('Env') == 0) {
				i--;
				continue;
			}
			try {
				var leaf = new RObjectLeaf(envName, true, lines[i].split(sep),
					i, treeBranch);
				treeBranch.children.push(leaf);
			} catch(e) { sv.log.exception(e); }
		}
	
		_this.sort(); // .index'es are generated here
	
		if (scrollToRoot && lastAddedRootElement) {
			// Only if rebuild, move the selection
			var idx = lastAddedRootElement.index;
			if (idx != -1) {
				//_this.treeBox.ensureRowIsVisible(idx);
				_this.treeBox.scrollToRow(Math.min(idx, _this.rowCount -
					_this.treeBox.getPageLength()));
				_this.selection.select(idx);
			}
		}
	}
	
	this.getOpenItems = function (asRCommand) {
		var vd = this.visibleData;
		var ret = [];
		for (var i in vd) {
			if (_this.isContainerOpen(i)) {
				var oi = vd[i].origItem;
				var env = oi.env || oi.fullName;
				var objName = oi.type == "environment"? "" : oi.fullName;
				ret.push(
					asRCommand? _getObjListCommand(env, objName) : oi.fullName);
			}
		}
		return(ret);
	}
	
	function _getObjListCommand (env, objName) {
		var id = sv.prefs.getPref("sciviews.ko.id", "SciviewsK");
		var cmd = cmdPattern.replace(/%ID%/g, id)
			.replace(/%ENV%/g, new String(env).addslashes())
			.replace(/%OBJ%/g, objName? objName.replace(/\$/g, "$$$$") : "");
		return(cmd);
	};
	
	this._getObjListCommand = _getObjListCommand; // XXX
	
	this.smartRefresh = function (force) {
		_this.getPackageList();
	
		var cmd, data, init;
		init = force || !_this.treeData.length || !_this.treeBox;
	
		if (init) {
			this.getPackageList();
			cmd = _this._getObjListCommand(".GlobalEnv", "");
		} else {
			var cmd1 = this.getOpenItems(true);
			var cmd2 = this.treeData.map(function (x)
				_getObjListCommand(x.fullName,""));
			cmd = sv.tools.array.unique(cmd1.concat(cmd2)).join("\n");
		}
	
		isInitialized = true;
		if (init) {
			//var tree = document.getElementById("sciviews_robjects_objects_tree");
			// In ko7, we need a different code!
			//if (tree == null) tree = document	
			//	.getElementById("sciviews_robjects_tab").contentDocument
			//	.getElementById("sciviews_robjects_objects_tree");
			var tree = ko.widgets.getWidget("sciviews_robjects_tab")
				.contentDocument
				.getElementById("sciviews_robjects_objects_tree");
			tree.view = this;
		}
	
		//print(cmd);
		// cmd, callback, hidden
		sv.r.evalCallback(cmd, this.parseObjListResult);
	}	
	// END NEW =====================================================================

	function _removeObjectList (pack) {
		for (var i = 0; i < _this.treeData.length; i++) {
			if (_this.treeData[i].name == pack) {
				_this.treeData.splice(i, 1);
				break;
			}
		}
		_createVisibleData();
	};

	function _addObject (env, objName, callback, obj) {
		//sv.r.evalCallback(_getObjListCommand(env, objName), callback, obj);
		// callback is always 'parseObjListResult' so far.
		var scrollToRoot = !objName; // if no object name, we add a package
								     // so, scroll to its item
		sv.r.evalCallback(_getObjListCommand(env, objName), callback,
			// args for callback: data, rebuild, scrollToRoot
			false, scrollToRoot);
	};

	// Allow for filtering by exclusion: prepend with "!"
	function _getFilter () {
		//var tb = document.getElementById("sciviews_robjects_filterbox");
		// In ko7, we need a different code!
		//if (tb == null) tb = document	
		//	.getElementById("sciviews_robjects_tab").contentDocument
		//	.getElementById("sciviews_robjects_filterbox");
		var tb = ko.widgets.getWidget("sciviews_robjects_tab")
			.contentDocument.getElementById("sciviews_robjects_filterbox");
		var obRx, text, not;
		text = tb.value;
		not = (text.substring(0, 1) == "!")
		if (not) text = text.substring(1);
		if (!text) return(function (x) true);
		try {
			obRx = new RegExp(text, "i");
			tb.className = "";
			if (not) {
				return(function (x) !(obRx.test(x)));
			} else {
				return(function (x) obRx.test(x));
			}
		} catch (e) {
			tb.className = "badRegEx";
			return (function (x) (x.indexOf(text) > -1));
		}
	};

	this.applyFilter = function () {
		_this.filter = _getFilter();
		_createVisibleData();
	};

	this.filter = function (x) true;

	function _addVItems (item, parentIndex, level) {
		if (item === undefined) return(parentIndex);
		if (!parentIndex) parentIndex = 0;
		if (level === undefined) level = -1;

		var idx = parentIndex;
		var len = item.length;
		
		//print("_addVItems = " + item);
		for (var i = 0; i < len; i++) {
			//item[i].class != "package" &&
			if (level == 1 && !_this.filter(item[i].sortData[filterBy])) {
				item[i].index = -1;
				continue;
			}
			idx++;
			var vItem = _getVItem(item[i], idx, level,
				i == 0, i == len - 1, parentIndex);
			_this.visibleData[idx] = vItem;

			if (vItem.isContainer && vItem.isOpen && vItem.childrenLength > 0) {
				var idxBefore = idx;
				idx = _addVItems(item[i].children, idx, level + 1);

				// No children is visible
				if (idxBefore == idx) {
					vItem.isContainerEmpty = true;
				}
			}
		}
		return(idx);
	};

	// Attach one level list of child items to an item
	function _addVIChildren (vItem, parentIndex, isOpen) {
		var children = vItem.origItem.children;
		vItem.isOpen = isOpen;
		var len = children.length;
		vItem.children = [];
		var idx = parentIndex;
		for (var i = 0; i < len; i++) {
			if (vItem.level == 0 && !_this.filter(children[i].name)) {
				children[i].index = -1;
				continue;
			}
			idx++;
			vItem.children.push(_getVItem(children[i], idx, vItem.level + 1,
				i == 0, i == len - 1,
				// Closed subtree elements have 0-based parentIndex
					isOpen ? parentIndex : 0));
		}
		vItem.isContainerEmpty = vItem.children.length == 0;
	};

	function _getVItem (obj, index, level, first, last, parentIndex) {
		var vItem = {};

		if (obj.group == "list" || obj.group == "function" || obj.list) {
			vItem.isContainer = true;
			vItem.isContainerEmpty = false;
			vItem.childrenLength = obj.children ? obj.children.length : 0;
			vItem.isOpen = (typeof(obj.isOpen) != "undefined") && obj.isOpen;
			vItem.isList = true;
		} else {
			vItem.isContainer = typeof(obj.children) != "undefined";
			vItem.isContainerEmpty = vItem.isContainer &&
				(obj.children.length == 0);
			vItem.childrenLength =  vItem.isContainer? obj.children.length : 0;
			vItem.isList = false;
		}
		vItem.isOpen = (typeof(obj.isOpen) != "undefined") && obj.isOpen;
		vItem.parentIndex = parentIndex;
		vItem.level = level;
		vItem.first = first;
		vItem.last = last;
		vItem.labels = [obj.name, obj.dims, obj.group, obj.class, obj.fullName];
		vItem.origItem = obj;
		vItem.origItem.index = index;
		return(vItem);
	};

	//function _VisibleTreeItem (oi, index, parentIndex) {
	//	this.isList = (oi.group == "list") || (oi.group == "function")
	//		|| (oi.list);
	//	this.isContainer = this.isList || (oi.children !== undefined);
	//	this.isContainerEmpty = this.isContainer && (oi.children.length == 0);
	//
	//	var level;
	//	for (var obj1 = oi, level = 0;
	//		obj1.parentObject && (obj1 = obj1.parentObject) != _this.treeData;
	//		level++);
	//	this.level = level;
	//
	//	this.first = oi == oi.parentObject.children[0];
	//	this.last = oi == oi.parentObject.children[oi.parentObject
	//		.children.length - 1];
	//	this.labels = [oi.name, oi.dims, oi.group, oi.class, oi.fullName];
	//	this.origItem = oi;
	//	this.parentIndex = parentIndex;
	//	this.origItem.index = index;
	//};
	//_VisibleTreeItem.prototype = {
	//	isContainer:  true,
	//	isContainerEmpty:  false,
	//	get isOpen() this.origItem.isOpen,
	//	set isOpen(open) {
	//		this.origItem.isOpen = open;
	//		this.parentIndex = open? ......
	//		},
	//	get childrenLength() (this.isContainer? (this.origItem.children ?
	//		this.origItem.children.length : 0) : 0),
	//	isList: false,
	//	parentIndex:  -1,
	//	level:  -1,
	//	first:  true,
	//	last:  false,
	//	labels:  null,
	//	origItem:  null
	//}

	this.sort =  function (column, root) {
		var columnName, currentElement, tree, sortDirection, realOrder, order,
			sortDirs;
		//tree = document.getElementById("sciviews_robjects_objects_tree");
		// In ko7, we need a different code!
		//if (tree == null) tree = document	
		//	.getElementById("sciviews_robjects_tab").contentDocument
		//	.getElementById("sciviews_robjects_objects_tree");
		tree = ko.widgets.getWidget("sciviews_robjects_tab")
			.contentDocument.getElementById("sciviews_robjects_objects_tree");
		sortDirection = tree.getAttribute("sortDirection");
		sortDirs = ["descending", "natural", "ascending", "descending"];
		realOrder = sortDirs.indexOf(sortDirection) - 1;

		try {
			currentElement = this.visibleData[this.selection.currentIndex]
				.origItem;
		} catch (e) {
			currentElement = null;
		}

		// If the column is passed and sort already done, reverse it
		if (column) {
			columnName = column.id;
			if (tree.getAttribute("sortResource") == columnName) {
				realOrder = ((realOrder + 2) % 3) - 1;
			} else {
				realOrder = 1;
			}
		} else {
			columnName = tree.getAttribute("sortResource");
		}

		var colNames = ["r-name", "r-dims",  "r-class", "r-group", "r-fullName",
			"r-position"];
		var sCol = colNames.indexOf(columnName);
		var defaultSortCol = 0;
		if (typeof(sCol) == "undefined") sCol = 0;

		// Sort using original element order
		if (realOrder == 0) {
			sCol = 4;
			order = 1;
		} else {
			order = realOrder;
		}

		function _sortCompare (a, b) {
			if (a.sortData[sCol] > b.sortData[sCol]) return 1 * order;
			if (a.sortData[sCol] < b.sortData[sCol]) return -1 * order;

			if (sCol != defaultSortCol) {
				if (a.sortData[defaultSortCol] > b.sortData[defaultSortCol])
					return(1);
				if (a.sortData[defaultSortCol] < b.sortData[defaultSortCol])
					return(-1);
			}
			return(0);
		}

		function _sortComparePkgs (a, b) {
			// Index 1 is the package's position in the search path
			if (a.sortData[1] > b.sortData[1]) return(1);
			if (a.sortData[1] < b.sortData[1]) return(-1);
			return(0);
		}

		function _sortRecursive (arr) {
			arr.sort(_sortCompare);
			for (var i in arr) {
				if (typeof (arr[i].children) == "object") {
					_sortRecursive(arr[i].children);
				}
			}
		}

		sortDirection = sortDirs[realOrder + 1];

		// Setting these will make the sort option persist
		tree.setAttribute("sortDirection", sortDirection);
		tree.setAttribute("sortResource", columnName);

		var cols = tree.getElementsByTagName("treecol");
		for (var i = 0; i < cols.length; i++)
			cols[i].removeAttribute("sortDirection");
		//var columnWidget = document.getElementById(columnName);
		// In ko7, we need a different code!
		//if (columnWidget == null) columnWidget = document	
		//	.getElementById("sciviews_robjects_tab").contentDocument
		//	.getElementById(columnName);
		var columnWidget = ko.widgets.getWidget("sciviews_robjects_tab")
				.contentDocument.getElementById(columnName);
		columnWidget.setAttribute("sortDirection", sortDirection);

		if (!root || root == _this.treeData) {
			// Sort packages always by name
			this.treeData.sort(_sortComparePkgs);
			for (var i in this.treeData) {
				if (typeof (this.treeData[i].children) == "object")
					_sortRecursive(_this.treeData[i].children);
			}
		} else if (root.children) _sortRecursive(root.children);

		_createVisibleData();

		if (currentElement) {
			this.selection.select(currentElement.index);
			this.treeBox.ensureRowIsVisible(currentElement.index);
		}
	};

	this.foldAll = function (open) {
		if (!this.rowCount) return;

		var idx = this.selection.currentIndex;
		if (idx == -1) idx = 0;

		var curItem = this.visibleData[idx].origItem;
		var parentObject = curItem.parentObject;
		if (parentObject) {
			var siblings;
			if (parentObject.children) {
				siblings = parentObject.children;
			} else {
				siblings = parentObject;
			}
			for (var i = 0; i < siblings.length; i++) {
				if (siblings[i].isOpen == open)
					this.toggleOpenState(siblings[i].index);
			}
		}
	};

	this.toggleOpenState = function (idx) {
		var vd = this.visibleData;
		var item = vd[idx];
		if (!item) return;
		
		_this.selection.select(idx);
		if (item.isList && !item.origItem.isOpen &&
			!item.origItem.childrenLoaded) {
			_addObject(item.origItem.env, item.origItem.fullName,
				this.parseObjListResult, item);
			return;
		}
		var rowsChanged;
		var iLevel = item.level;

		if (!item.childrenLength) {
			item.isContainer = item.origItem.isOpen = false;
			return;
		}

		if (item.origItem.isOpen) { // Closing subtree
			var k;
			for (k = idx + 1; k < vd.length && vd[k].level > iLevel; k++) { }
			rowsChanged = k - idx - 1;
			item.children = vd.splice(idx + 1, rowsChanged);

			// Make parentIndexes of child rows relative
			for (var i = 0; i < item.children.length; i++)
				item.children[i].parentIndex -= idx;

			// Decrease parentIndexes of subsequent rows
			for (var i = idx + 1; i < vd.length; i++) {
				if (vd[i].parentIndex > idx)
					vd[i].parentIndex -= rowsChanged;
				vd[i].origItem.index = i;
			}
		} else { // Opening subtree
			if (typeof(item.children) == "undefined")
				_addVIChildren(item, idx, false);

			// Filter child items
			var insertItems = [];
			for (var i = 0; i < item.children.length; i++) {
				//if (this.filter(item.children[i].origItem.name)) {
					insertItems.push(item.children[i]);
				//}
			}

			rowsChanged = insertItems.length;
			// Change parentIndexes of child rows from relative to absolute
			for (var i = 0; i < insertItems.length; i++) {
				insertItems[i].parentIndex += idx;
				insertItems[i].origItem.index = i + idx + 1;
			}

			var vd2 = vd.slice(0, idx + 1).concat(insertItems, vd.slice(idx + 1));
			// Increase parentIndexes of subsequent rows:
			for (var i = idx + 1 + insertItems.length; i < vd2.length; i++) {
				if (vd2[i].parentIndex > idx)
					vd2[i].parentIndex += rowsChanged;
				vd2[i].origItem.index = i;
			}
			this.visibleData = vd2;
			item.children = null;
		}
		item.origItem.isOpen = !item.origItem.isOpen;
		if (rowsChanged)
			this.treeBox.rowCountChanged(idx + 1,
				(item.origItem.isOpen? 1 : -1) * rowsChanged);
		this.treeBox.invalidateRow(idx);
	};

	this.setTree = function (treeBox) {
		this.treeBox = treeBox;
	};

	this.setCellText = function (idx, col, value) {
		this.visibleData[idx].labels[col.index] = value;
	};

	this.setCellValue = function (idx, col, value) { };

	this.getCellText = function (idx, column) {
		return(_this.visibleData[idx].labels[column.index]);
	};

	this.isContainer = function (idx) {
		return(_this.visibleData[idx].isContainer);
	};

	this.isContainerOpen = function (idx) {
		return(_this.visibleData[idx].origItem.isOpen);
	};

	this.isContainerEmpty = function (idx) {
		return(_this.visibleData[idx].isContainerEmpty);
	};

	this.isSeparator = function (idx) {
		return(false);
	};

	this.isSorted = function () {
		return(false);
	};

	this.isEditable = function (idx, column) {
		return(false);
	};

	this.getParentIndex = function (idx) {
		return(idx in _this.visibleData ?
			_this.visibleData[idx].parentIndex : -1);
	};

	this.getLevel = function (idx) {
		return(_this.visibleData[idx].level);
	};

	this.hasNextSibling = function (idx, after) {
		return(!_this.visibleData[idx].last);
	};

	this.getImageSrc = function (row, col) {
		if (col.index == 0) {
			var Class = this.visibleData[row].origItem.class;
			if (Class == "package" && this.visibleData[row].origItem.name
				.indexOf("package") != 0) {
				Class = "package_green";
			} else if (iconTypes.indexOf(Class) == -1) {
				Class = this.visibleData[row].origItem.group;
				if (iconTypes.indexOf(Class) == -1) return("");
			}
			return("chrome://sciviewsk/skin/images/" + Class + ".png");
		} else return("");
	};

	this.getCellValue = function (idx, column) {
		return(1);
	};

	this.getColumnValue = function (idx, column) {
		return(1);
	}
	
	this.cycleHeader = function (col, elem) { };

	this.selectionChanged = function () { };

	this.cycleCell = function (idx, column) { };

	this.performAction = function (action) { };

	this.performActionOnCell = function (action, index, column) { };

	this.getRowProperties = function (idx, props) {
		if (!(idx in _this.visibleData)) return;
		var item = this.visibleData[idx]
		var origItem = item.origItem;

		props.AppendElement(atomSvc.getAtom("type-" + origItem.type));
		props.AppendElement(atomSvc.getAtom("class-" + origItem.class));

		if (item.last) props.AppendElement(atomSvc.getAtom("lastChild"));
		if (item.first) props.AppendElement(atomSvc.getAtom("firstChild"));
	};

	this.getCellProperties = function (idx, column, props) {
		if (column.id == "r-name") {
			props.AppendElement(atomSvc.getAtom("icon"));
			var item = this.visibleData[idx]
			var origItem = item.origItem;
			props.AppendElement(atomSvc.getAtom("type-" + origItem.type));
			props.AppendElement(atomSvc.getAtom("class-" + origItem.class));
			props.AppendElement(atomSvc.getAtom("group-" + origItem.group));

			if (item.isContainerEmpty && origItem.class == "package")
				props.AppendElement(atomSvc.getAtom("empty_package"));
		}
	};

	this.getColumnProperties = function (column, element, prop) { };

	this.getSelectedRows = function () {
		var start = new Object();
		var end = new Object();
		var rows = new Array();
		var numRanges = this.selection.getRangeCount();
		for (var t = 0; t < numRanges; t++) {
			_this.selection.getRangeAt(t, start, end);
			for (var v = start.value; v <= end.value; v++)
				rows.push(v);
		}
		return(rows);
	};

	// Drag'n'drop support
	this.listObserver = {
		onDragStart: function (event, transferData, action) {
			_this.onEvent(event);
			var namesArr = _this.getSelectedNames(event.ctrlKey, event.shiftKey);
			transferData.data = new TransferData();
			transferData.data.addDataForFlavour("text/unicode",
				namesArr.join(', '));
			return(true);
		},

		onDrop: function (event, transferData, session) {
			var path, pos;
			var data = transferData;
			if (transferData.flavour.contentType == "text/unicode") {
				path = new String(transferData.data).trim();
			} else {
				return(false);
			}
			pos = _this.searchPath.indexOf(path);
			if (pos == -1) return(false);

			//var listWidget = document
			//	.getElementById("sciviews_robjects_searchpath_listbox");
			// In ko7, we need a different code!
			//if (listWidget == null) listWidget = document	
			//	.getElementById("sciviews_robjects_tab").contentDocument
			//	.getElementById("sciviews_robjects_searchpath_listbox");
			var listWidget = ko.widgets.getWidget("sciviews_robjects_tab")
				.contentDocument
				.getElementById("sciviews_robjects_searchpath_listbox");
			listWidget.getItemAtIndex(pos).checked = true;
			_addObject(path, "", _parseObjectList, path);
			return(true);
		},

		onDragOver: function (event, flavour, session) {
			session.canDrop = flavour.contentType == 'text/unicode'
				|| flavour.contentType == 'text/x-r-package-name';
		},

		getSupportedFlavours: function () {
			var flavours = new FlavourSet();
			flavours.appendFlavour("text/x-r-package-name");
			flavours.appendFlavour("text/unicode");
			return(flavours);
		}
	};

	this.canDrop = function () {
		return(false);
	};

	this.drop = function (idx, orientation) { };

	//this.init = function () {
	//	this.visibleData = [];
	//	_addObject(".GlobalEnv", "", _parseObjectList, ".GlobalEnv");
	//	this.getPackageList();
	//
	//	isInitialized = true;
	//
	//// var objTree = document.getElementById("sciviews_robjects_objects_tree");
	//// In ko7, we need a different code!
	////if (objTree == null) objTree = document	
	////	.getElementById("sciviews_robjects_tab").contentDocument
	////	.getElementById("sciviews_robjects_objects_tree");
	//var objTree = ko.widgets.getWidget("sciviews_robjects_tab")
	//		.contentDocument.getElementById("sciviews_robjects_objects_tree");
	//objTree.view = this;
	//	this.treeBox.scrollToRow(0);
	//};

	// Get the list of packages on the search path from R
	this.getPackageList =  function () {	
		var cmd = 'cat(objSearch(sep = "' + sep + '", compare = FALSE))';
		sv.r.evalCallback(cmd, _this.processPackageList);
	};

	// Callback to process the list of packages in the search path from R
	this.processPackageList = function _processPackageList (data) {
		if (data == "") return;
		_this.searchPath = data.replace(/[\n\r]/g, "").split(sep);
		_this.displayPackageList();
	};

	// Display the list of packages in the search path
	this.displayPackageList = function () {
		var pack;
		//var node = document
		//	.getElementById("sciviews_robjects_searchpath_listbox");
		// In ko7, we need a different code!
		//if (node == null) node = document	
		//	.getElementById("sciviews_robjects_tab").contentDocument
		//	.getElementById("sciviews_robjects_searchpath_listbox");
		var node = ko.widgets.getWidget("sciviews_robjects_tab")
			.contentDocument
			.getElementById("sciviews_robjects_searchpath_listbox");
				
		var selectedLabel = node.selectedItem ?
			node.selectedItem.getAttribute("label") : null;
		
		while (node.firstChild)
			node.removeChild(node.firstChild);
		var packs = _this.searchPath;
		var selectedPackages = _this.treeData.map(function(x) x.name);
		// Display at least .GlobalEnv
		if (!selectedPackages.length) selectedPackages.push(".GlobalEnv");
		for(var i = 0; i < packs.length; i++) {
			pack = packs[i];
			var item = document.createElement("listitem");
			item.setAttribute("type", "checkbox");
			item.setAttribute("label", pack);
			item.setAttribute("checked", selectedPackages.indexOf(pack) != -1);
			node.appendChild(item);
		}

		if (selectedLabel != null) {
			for (var i = 0; i < node.itemCount; i++) {
				if (node.getItemAtIndex(i).getAttribute("label") == selectedLabel) {
					node.selectedIndex = i;
					break;
				}
			}
		} else {
			node.selectedIndex = 0;
		}
	};

	// Clear the list of packages on the search path (when quitting R)
	this.clearPackageList =  function () {
		_this.searchPath = [];
		_this.displayPackageList();
		_this.parseObjListResult("Env=.GlobalEnv\nObj=\n");
	}

	this.toggleViewSearchPath = function (event) {
		var what = event.target.tagName;
		var broadcaster = document
			.getElementById("cmd_robjects_viewSearchPath");
		//var box = document.getElementById(broadcaster.getAttribute("box"));
		// In ko7, we need a different code!
		//if (box == null) box = document	
		//	.getElementById("sciviews_robjects_tab").contentDocument
		//	.getElementById(broadcaster.getAttribute("box"));
		var box = ko.widgets.getWidget("sciviews_robjects_tab")
			.contentDocument.getElementById(broadcaster.getAttribute("box"));

		if (what == "splitter" || what == "grippy") {
			//var splitter = document.getElementById("sciviews_robjects_splitter");
			// In ko7, we need a different code!
			//if (splitter == null) splitter = document	
			//	.getElementById("sciviews_robjects_tab").contentDocument
			//	.getElementById("sciviews_robjects_splitter");
			var splitter = ko.widgets.getWidget("sciviews_robjects_tab")
				.contentDocument.getElementById("sciviews_robjects_splitter");
			var state = splitter.getAttribute("state");
			broadcaster.setAttribute("checked", state != "collapsed");
		} else {
			box.collapsed = !box.collapsed;
			broadcaster.setAttribute("checked", !box.collapsed);
			broadcaster.setAttribute("state",
				box.collapsed ? "collapsed" : "open");
		}

		if (!box.collapsed) {
			//if (!_this.searchPath.length) _this.getPackageList();
			_this.smartRefresh();
		}
	}

	// Change the display status of a package by clicking an item in the list
	this.packageSelectedEvent = function (event) {
		var el = event.target;
		var pack = el.getAttribute("label");
		if (!pack) return;
		if (el.checked) {
			//_addObject(pack, "", _parseObjectList, pack);
			_addObject(pack, "", _this.parseObjListResult);
		} else {
			_removeObjectList(pack);
		}
	};
	
	this.refreshAll = _this.smartRefresh; /// XXX - merge all *refresh* into one

	this.refreshGlobalEnv = function refreshGlobalEnv (data) {
		if (!data) {
			_addObject(".GlobalEnv", "", _this.parseObjListResult);
		} else {
			_this.parseObjListResult(data);
		}
	}

	this.removeSelected = function (doRemove) {
		var item, type, name, vItem, cmd = [];
		var rmItems = {}, ObjectsToRemove = {}, envToDetach = [];
		var ObjectsToSetNull = {};
		var rows = this.getSelectedRows();
		if (rows.length == 0) return(false);

		var rxBackticked = /^`.*`$/;

		for (i in rows) {
			vItem = this.visibleData[rows[i]];
			item = vItem.origItem;
			name = item.fullName;
			type = item.type;

			// Remove backticks from names, as they are used as strings anyway
			if (rxBackticked.test(name)) name = name.substr(1, name.length - 2);

			switch (type) {
			 case "environment":
				if (name != ".GlobalEnv" && name != "SciViews:TempEnv")
					envToDetach.push(name);
				break;
			 case "object":
			 case "sub-object":
				var env = item.env;
				thisItem:
				if (envToDetach.indexOf(env) == -1) {
					var parent = vItem;
					while (parent && parent.parentIndex &&
						parent.parentIndex != -1) {
							parent = this.visibleData[parent.parentIndex]
								.origItem;

							if (!parent || (rmItems[env] &&
								(rmItems[env].indexOf(parent.fullName) != -1))
								|| (parent.type == "environment" &&
								(envToDetach.indexOf(parent.name) != -1)))
								break thisItem;
					}
					if (typeof(rmItems[env]) == "undefined")
						rmItems[env] = [];
					rmItems[env].push(name);

					if (type == "sub-object") {
						if (typeof(ObjectsToSetNull[env]) == "undefined")
							ObjectsToSetNull[env] = [];
						ObjectsToSetNull[env].push(name);
					} else {
						if (typeof(ObjectsToRemove[env]) == "undefined")
							ObjectsToRemove[env] = [];
						ObjectsToRemove[env].push(name);
					}

					var siblings = item.parentObject.children;
					for (var j in siblings) {
						if (siblings[j] == item) {
							siblings.splice(j, 1);
							break;
						}
					}
				}
				break;
			 default:
			}
		}

		for (var i in envToDetach) {
			cmd.push('detach("' + envToDetach[i].addslashes() +
				'", unload = TRUE)');
			for (var j in _this.treeData) {
				if (_this.treeData[j].name == envToDetach[i]) {
					_this.treeData.splice(j, 1);
					break;
				}
			}
		}

		for (var env in ObjectsToRemove)
			cmd.push('rm(list = c("' + ObjectsToRemove[env].join('", "') +
				'"), pos = "' + env + '")');

		for (var env in ObjectsToSetNull) {
			cmd.push('eval(expression(' +
				ObjectsToSetNull[env].join(" <- NULL, ") +
				' <- NULL), envir = as.environment("' + env + '"))');
		}

		_createVisibleData();

		if (!cmd.length) return(false);

		if (doRemove) {
			// Remove immediately
			sv.r.evalCallback(cmd.join("\n"), function(res) {
				print(res);
				if (envToDetach.length) _this.smartRefresh();
			});
		} else {
			// Insert commands to current document
			var view = ko.views.manager.currentView;
			if (!view) return(false);
			//view.setFocus();
			var scimoz = view.scimoz;
			var nl = ";" + ["\r\n", "\n", "\r"][scimoz.eOLMode];
			scimoz.scrollCaret();
			scimoz.insertText(scimoz.currentPos, cmd.join(nl) + nl);
		}

		_this.selection.select(Math.min(rows[0], _this.rowCount - 1));
		//_this.selection.clearSelection();
		return(true);
	}

	this.getSelectedNames = function (fullNames, extended) {
		if (extended === undefined) extended = false;
		var rows = this.getSelectedRows();
		var namesArr = new Array();
		var cellText, item;
		var name = fullNames ? "fullName" : "name";
		var selectedItemsOrd = _this.selectedItemsOrd;
		for (var i in selectedItemsOrd) {
			item = selectedItemsOrd[i];
			cellText = item[name];

			if (cellText) {
				if ((!fullNames || item.type == "object")
					&& cellText.search(/^[a-z\.][\w\._]*$/i) == -1)
					cellText = "`" + cellText + "`";
				if (!fullNames && extended) {
					if (item.type == "sub-object") {
						cellText = '"' + cellText + '"';
					} else if (item.group == "function") {
						cellText += "()";
					} else if (item.type == "args") {
						cellText += "="; // Attach '=' to function args
					}
				}
			}
			namesArr.push(cellText);
		}
		return(namesArr);
	}

	this.insertName = function (fullNames, extended) {
		// TODO: `quote` non-syntactic names of 1st level (.type = 'object')
		// extended mode: object[c('sub1', 'sub2', 'sub3')]
		var view = ko.views.manager.currentView;
		if (!view) return;
		var text = _this.getSelectedNames(fullNames, extended).join(', ');
		//view.setFocus();
		var scimoz = view.scimoz;
		// Sometimes, scimoz could not be defined
		try {
			var length = scimoz.length;

			if (scimoz.getWCharAt(scimoz.selectionStart - 1)
				.search(/^[\w\.\u0100-\uFFFF"'`,\.;:=]$/) != -1)
				text = " " + text;
			if (scimoz.getWCharAt(scimoz.selectionEnd)
				.search(/^[\w\.\u0100-\uFFFF"'`]$/) != -1)
				text += " ";

			scimoz.insertText(scimoz.currentPos, text);
			scimoz.currentPos += scimoz.length - length;
			scimoz.charRight();
		} catch (e) { } // TODO: do something here?
	}

	this.setFilterBy = function (menuItem, column) {
		var newFilterBy = ['name', 'dims', 'class', 'group', 'fullName']
			.indexOf(column);
		if (newFilterBy == -1) return;

		if (newFilterBy != filterBy) {
			var items = menuItem.parentNode.getElementsByTagName("menuitem");
			for (var i = 0; i < items.length; i++)
				items[i].setAttribute("checked", items[i] == menuItem);

			filterBy = newFilterBy;
			this.applyFilter();
		} else {
			menuItem.setAttribute("checked", true);
		}

		//var filterBox = document.getElementById("sciviews_robjects_filterbox");
		// In ko7, we need a different code!
		//if (filterBox == null) filterBox = document
		//	.getElementById("sciviews_robjects_tab").contentDocument
		//	.getElementById("sciviews_robjects_filterbox");
		var filterBox = ko.widgets.getWidget("sciviews_robjects_tab")
			.contentDocument.getElementById("sciviews_robjects_filterbox");
		filterBox.emptyText = menuItem.getAttribute("label") + "...";
		filterBox.focus();

		//filterBox.setAttribute("emptytext", menuItem.getAttribute("label"));
		//sv.alert(filterBox.getAttribute("emptytext"));
		return;
	}

	this.contextOnShow = function (event) {
		var currentIndex = _this.selection.currentIndex;
		if (currentIndex == -1) return;

		var isEnvironment, isPackage, isInPackage, noDelete, isFunction;
		var item, type, name;
		item = _this.visibleData[currentIndex].origItem;
		type = item.class;
		name = item.fullName;

		isEnvironment = item.type == "environment";
		isPackage = isEnvironment && (item.name.indexOf("package:") == 0);
		isInPackage = !isPackage && item.env &&
			(item.env.indexOf("package:") == 0);

		noDelete = (isEnvironment && (nonDetachable.indexOf(name) != -1))
			|| isInPackage;
		isFunction = type == "function";

		var cannotSaveToFile = ["data.frame", "matrix", "table"]
			.indexOf(item.class) == -1;
		var cannotSave = _this.selectedItemsOrd.filter(function (x)
			x.type == 'object' && x.group != 'function').length == 0;

		var multipleSelection = _this.selection.count > 1;

		// Help can be shown only for one object:
		var noHelp = !isPackage || !isInPackage;

		////var menuNode = document.getElementById("rObjectsContext");
		//// In ko7, we need a different code!
		////if (menuNode == null) menuNode = document
		////	.getElementById("sciviews_robjects_tab").contentDocument
		////	.getElementById("rObjectsContext");
		//var menuNode = ko.widgets.getWidget("sciviews_robjects_tab")
		//	.contentDocument.getElementById("rObjectsContext");
		var menuItems = event.target.childNodes;
		var testDisableIf, disable = false;


		for (var i = 0; i < menuItems.length; i++) {
			if (!menuItems[i].hasAttribute('testDisableIf')) continue;
			testDisableIf = menuItems[i].getAttribute('testDisableIf')
				.split(/\s+/);
			disable = false;

			for (var j = 0; j < testDisableIf.length && !disable; j++) {
				switch(testDisableIf[j]){
				 case 't:multipleSelection':
					disable = multipleSelection;
					break;
				 case 't:noHelp':
					disable = noHelp;
					break;
				 case 't:isFunction':
					disable = isFunction;
					break;
				 case 't:isEnvironment':
					disable = isEnvironment;
					break;
				 case 't:isPackage':
					disable = isPackage;
					break;
				 case 't:cannotSaveToFile':
					disable = cannotSaveToFile;
					break;
				 case 't:cannotSave':
					disable = cannotSave;
					break;
				 case 't:noDelete':
					disable = noDelete;
					break;
				 default: ;
				}
			}
			//print( menuItems[i].id + ": " + testDisableIf + " = " + disable);
			menuItems[i].setAttribute('disabled', disable);
		}
	}

	this.do = function (action) {
		var obj = _this.selectedItemsOrd;
		
		switch(action) {
		 case 'save':
			// Select only objects:
			obj = obj.filter(function (x) {
				if (x.type != "object") {
					_this.selection.toggleSelect(x.index); return(false)
				} else {
					return(true);
				}
			});

			var dup = sv.tools.array.duplicates(obj.map(function(x) x.name));
			if (dup.length && ko.dialogs.okCancel(
				"Objects with the same names from different environments " +
				"selected. Following object will be taken from the " +
				"foremost location in the search path: " + dup.join(', '),
				"Cancel") == "Cancel") return;

			var fileName = (obj.length == 1)? obj[0].name
				.replace(/[\/\\:\*\?"<>\|]/g, '_') : '';

			try {
				var dir = sv.tools.file
					.pathFromURI(ko.places.manager.currentPlace);
				// In the code in SciViews-K-dev, current R working dir is used
				//var dir = sv.tools.file.path(sv.rconn.evalAtOnce("cat(getwd())"));
			} catch(e) { return; }


			fileName = sv.fileOpen(dir, fileName + '.RData', '',
				["R data (*.RData)|*.RData"], false, true, oFilterIdx = {});

			if (!fileName) return;
			// PhG: I want the simplest syntax as possible
			//var cmd = 'save(list = c(' + obj.map(function(x) '"' + x.name + '"')
			//	.join(',')	+ '), file = "' + fileName.addslashes() + '")';
			var cmd = 'save(list=c(' + obj.map(function(x) '"' + x.name + '"')
				.join(',')	+ '), file = "' + fileName.addslashes() + '")';
			sv.r.eval(cmd);
			break;
		
		 // Special handling for help
		 case 'help':
			for (i in obj) {
				// Help only for packages and objects inside a package
				if (obj[i].fullName.indexOf("package:") == 0) {
					sv.r.help("", obj[i].fullName.replace(/^package:/, ''));
				} else if (obj[i].env.indexOf("package:") == 0) {
					sv.r.help(obj[i].fullName, obj[i].env
						.replace(/^package:/, ''));
				} else {
					sv.r.help(obj[i].fullName);
				}
			}
			break;

		 //TODO: dump data for objects other than 'data.frame'
		 case 'write.table':
		 case 'writeToFile':
			var expr;

			for (i in obj) {
				// PhG: I want the simplest expression as possible
				if (obj[i].env == ".GlobalEnv") {
					expr = 	obj[i].fullName;
				} else {
					expr = "evalq(" + obj[i].fullName +
						", envir = as.environment(\"" +
						obj[i].env.addslashes() + "\"))";
				}
				sv.r.saveDataFrame(expr, '', obj[i].name);
			}
			break;

		 // Default is to just execute command and display results
		 case 'summary':
		 case 'plot':
		 case 'str':
		 case 'names':
		 default:
			var cmds = [];
			for (var i in obj) {
				// PhG: I want the simplest expression as possible
				if (obj[i].env == ".GlobalEnv") {
					cmds.push(action + "(" + obj[i].fullName + ")");
				} else {
					cmds.push(action + "(evalq(" + obj[i].fullName +
						", envir = as.environment(\"" +
// FIXME: in 'print' or 'structure' applied to .GlobalEnv, I got obj[i].env is null
// Should the 'print' or 'structure' menu item apply to it???
						obj[i].env.addslashes() + "\")))");
				}
			}
			sv.r.eval(cmds.join("\n"));
		}

		//var view = ko.views.manager.currentView;
		//if (!view) return;
		//var scimoz = view.scimoz;
		//view.setFocus();
		//scimoz.insertText(scimoz.currentPos, res.join(";" +
		//    ["\r\n", "\n", "\r"][scimoz.eOLMode]));
	}

	this.selectedItemsOrd = [];

	this.onEvent = function on_Event(event) {
		switch (event.type) {
		 case "select":
			var selectedRows = _this.getSelectedRows();
			var selectedItems = [];

			if (selectedRows.some(function(x) x >= _this.visibleData.length))
				return(false);

			for (var i = 0; i < selectedRows.length; i++)
				selectedItems.push(_this.visibleData[selectedRows[i]].origItem);
			var curRowIdx = selectedRows.indexOf(_this.selection.currentIndex);

			// This maintains array of selected items in order they were
			// added to selection
			var prevItems = _this.selectedItemsOrd;
			var newItems = [];
			for (var i = 0; i < prevItems.length; i++) {
				var j = selectedItems.indexOf(prevItems[i]);
				if (j != -1) // Present in Prev, but not in Cur
					newItems.push(prevItems[i])
			}
			for (var i = 0; i < selectedItems.length; i++) {
				if (prevItems.indexOf(selectedItems[i]) == -1) {
					// Present in Cur, but not in Prev
					newItems.push(selectedItems[i]);
				}
			}
			_this.selectedItemsOrd = newItems;

			return(false);
		
		 case "keyup":
		 case "keypress":
			var key = event.keyCode ? event.keyCode : event.charCode;
			switch (key) {
			 case 46: // Delete key
				_this.removeSelected(event.shiftKey);
				event.originalTarget.focus();
				return(false);
			
			 case 45: // Insert
			 case 32: // Space
				//sv.log.debug("Insert");
				break;
			
			 case 65: // Ctrl + A
			 case 97: // Ctrl + a
				if (event.ctrlKey) {
					if (event.shiftKey) {
						_this.selectAllSiblings(_this.selection.currentIndex,
							false);
					} else {
						_this.selection.selectAll();
					}
				}
			 
			 case 0:
				return(false);
			 
			 case 93:
				// Windows context menu key
				//var contextMenu = document.getElementById("rObjectsContext");
				// In ko7, we need a different code!
				//if (contextMenu == null) contextMenu = document
				//	.getElementById("sciviews_robjects_tab").contentDocument
				//	.getElementById("rObjectsContext");
				var contextMenu = ko.widgets.getWidget("sciviews_robjects_tab")
					.contentDocument.getElementById("rObjectsContext");
				_this.treeBox.ensureRowIsVisible(_this.selection.currentIndex);
				var y = ((2 + _this.selection.currentIndex -
					_this.treeBox.getFirstVisibleRow())
					* _this.treeBox.rowHeight)	+ _this.treeBox.y;
				var x = _this.treeBox.x;
				contextMenu.openPopup(null, "after_pointer", x, y, true);

			 // TODO: Escape key stops retrieval of R objects
			 
			 default:
				return(false);
			}
			break;
		
		 case "dblclick":
			if (event.button != 0) return false;
			if (_this.selection && (_this.selection.currentIndex == -1
				|| _this.isContainer(_this.selection.currentIndex)))
				return(false);
			break;
		 
		 case "click":
		 case "draggesture":
			return(false);
		 default:
		}

		// Default action: insert selected names
		_this.insertName(event.ctrlKey, event.shiftKey);

		// This does not have any effect
		////var listWidget = document
		////	.getElementById("sciviews_robjects_searchpath_listbox");
		//// In ko7, we need a different code!
        ////if (listWidget == null) listWidget = document
        ////    .getElementById("sciviews_robjects_tab").contentDocument
		////	.getElementById("sciviews_robjects_searchpath_listbox");
		//var listWidget = ko.widgets.getWidget("sciviews_robjects_tab")
		//		.contentDocument
		//		.getElementById("sciviews_robjects_searchpath_listbox");
		//listWidget.focus();
		event.originalTarget.focus();
		return(false);
	}

	// Drag & drop handling for search paths list
	this.packageListObserver = {
		onDrop : function (event, transferData, session) {
			var data = transferData;
			sv.log.debug("dropped object was " +
				transferData.flavour.contentType);
			var path;
			if (transferData.flavour.contentType == "application/x-moz-file") {
				path = transferData.data.path;
			} else if (transferData.flavour.contentType == "text/unicode") {
				path = new String(transferData.data).trim();
			}
			
			// Attach the file if it is an R workspace
			if (path.search(/\.RData$/i) > 0) {
				//sv.alert("will attach: " + path);
				sv.r.loadWorkspace(path, true, function (message) {
					_this.getPackageList();
					sv.alert(sv.translate("Attach workspace, R said:"), message);
				});
			} else {
				path = path.replace(/^package:/, "");

				sv.r.evalCallback("tryCatch(library(\"" + path +
					"\"), error = function(e) {cat(\"<error>\"); message(e)})",
					function (message) {
						if (message.indexOf('<error>') > -1) {
							message = message.replace('<error>', '');
						} else {
							_this.getPackageList();
						}
						if (message) {
							sv.alert(sv.translate("Load library, R said:"),
								message);
						}
					}
				);
			}
			return(true);
		},
		
		//onDragEnter: function (event, flavour, session) {
		//	sv.log.debug(event.type + ":" + session);
		//	//sv.xxx = session;
		//},

		//onDragExit: function (event, session) {
		//	//sv.log.debug(event.type + ":" + session);
		//},

		onDragStart: function (event, transferData, action) {
			if (event.target.tagName != 'listitem')
				return(false);

			//var listWidget = document
			//	.getElementById("sciviews_robjects_searchpath_listbox");
			// In ko7, we need a different code!
            //if (listWidget == null) listWidget = document
            //	.getElementById("sciviews_robjects_tab").contentDocument
			//	.getElementById("sciviews_robjects_searchpath_listbox");
			var listWidget = ko.widgets.getWidget("sciviews_robjects_tab")
				.contentDocument
				.getElementById("sciviews_robjects_searchpath_listbox");
			var text = _this.searchPath[listWidget.selectedIndex];
			transferData.data = new TransferData();
			transferData.data.addDataForFlavour("text/unicode", text);
			return(true);
		},

		onDragOver: function (event, flavour, session) {
			session.canDrop = flavour.contentType == 'text/unicode'
				|| flavour.contentType == 'application/x-moz-file';
		},

		getSupportedFlavours: function () {
			var flavours = new FlavourSet();
			flavours.appendFlavour("application/x-moz-file","nsIFile");
			flavours.appendFlavour("text/unicode");
			return(flavours);
		}
	}  // End .packageListObserver

	this.packageListKeyEvent = function (event) {
		var keyCode = event.keyCode;
		switch(keyCode) {
		 case 46: // Delete key
			var listbox = event.target;
			var listItem = listbox.selectedItem;
			var pkg = listItem.getAttribute("label");

			if (pkg == ".GlobalEnv" || pkg == "SciViews:TempEnv" || pkg == "Autoloads")
				return;

			sv.r.evalCallback(
				'tryCatch(detach("' + pkg.addslashes() +
				'", unload = TRUE), error = function (e) cat("<error>"));',
				function _packageListKeyEvent_callback (data) {
					sv.log.debug(data);
					if (data.trim() != "<error>") {
						_removeObjectList(pkg);
						listbox.removeChild(listItem);
						print(sv.translate("Database \"%S\" detached.", pkg));
					} else {
						print(sv.translate(
							"Database \"%S\" could not be detached.", pkg));
					}
			});
			return;
		
		 default:
			return;
		}
	}

	this.selectAllSiblings = function (idx, augment) {
		var startIndex = _this.visibleData[idx].parentIndex + 1;
		var curLvl = _this.visibleData[idx].level;
		var endIndex;
		for (endIndex = startIndex;
			endIndex < _this.visibleData.length &&
			_this.visibleData[endIndex].level >= curLvl;
			endIndex++) { }
		endIndex--;
		_this.selection.rangedSelect(startIndex, endIndex, augment)
	}

	this.focus = function() { }

	//_setOnEvent("sciviews_robjects_searchpath_listbox", "ondragdrop",
	//		"nsDragAndDrop.drop(event, sv.robjects.packageListObserver);"
	//		);
	
	//_setOnEvent("sciviews_robjects_searchpath_listbox", "ondragover",
	//		"nsDragAndDrop.dragOver(event, sv.robjects.packageListObserver);"
	//		);
	
	//_setOnEvent("sciviews_robjects_searchpath_listbox", "ondragexit",
	//		"nsDragAndDrop.dragExit(event, sv.robjects.packageListObserver);"
	//		);
	
	//_setOnEvent("sciviews_robjects_searchpath_listbox", "ondraggesture",
	//		"nsDragAndDrop.startDrag(event, sv.robjects.packageListObserver);"
	//		);
	
	//_setOnEvent("sciviews_robjects_objects_tree_main", "ondragover",
	//		"nsDragAndDrop.dragOver(event, sv.robjects.listObserver);"
	//		);
	
	//_setOnEvent("sciviews_robjects_objects_tree_main", "ondragdrop",
	//		"nsDragAndDrop.drop(event, sv.robjects.listObserver);"
	//		);

}).apply(sv.robjects);
