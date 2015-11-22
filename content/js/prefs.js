// SciViews-K preference code
// SciViews-K preferences management ('sv.prefs' namespace)
// Define default preferences values for SciViews-K and MRU lists
// Copyright (c) 2008-2012, Ph. Grosjean (phgrosjean@sciviews.org)
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// sv.prefs.defaults;             // Default preference values
// sv.prefs.getPref(prefName, defaultValue);
//                                // Get a preference, use 'def' is not found
// sv.prefs.setPref(prefName, value, overwrite, asInt);
//                                // Set a preference
// sv.prefs.setPref(prefName);    // Delete a preference
// sv.prefs.askPref(pref, defvalue); // Ask for the value of a preference
// sv.prefs.checkAll();           // Check all preferences
// sv.prefs.mru(mru, reset, items, sep); //Simplify update of MRU lists
//                                         history a text entries in dialog box
// sv.prefs.tip(arg, tip);        // Default tooltips for interpolation queries
//
// Definition of various preferences for SciViews-K
////////////////////////////////////////////////////////////////////////////////

if (sv.prefs === undefined) sv.prefs = {};

(function () {
	
	var prefset = Components.classes["@activestate.com/koPrefService;1"]
		.getService(Components.interfaces.koIPrefService).prefs;
	this.prefset = prefset;
	var _this = this;

	// sv.prefs.defaults[preferenceName] = preferenceValue
	this.defaults = {
		"sciviews.ko.id": "SciViewsK",
		"sciviews.ko.type": "socket",
		"sciviews.ko.port": 7052,
		"sciviews.r.type": "http",
		"sciviews.r.port": 8888,
		"sciviews.r.page.port": 7680,
		"sciviews.r.host": "127.0.0.1",
		"sciviews.r.interpreter": "",
		"sciviews.r.args": "--quiet",
		//"sciviews.r.auto-start": false,
		"sciviews.r.batchinterp": "",
		"sciviews.pkgs.sciviews": true,
		"r.csv.dec": ".",
		"r.csv.sep": ",",
		"r.application": "",
		"r.cran.mirror": "http://cran.r-project.org/"
		//"r.help.command": "javascript:sv.r.help(\"%w\")",
		//"r.help.open.in": [tab, window],
		//"r.help.remote": "http://finzi.psych.upenn.edu/R/"
	}

	// Get a preference, or default value
	this.getPref = function (prefName, defaultValue) {
		var ret, typeName, type;
		if (prefset.hasPref(prefName)) {
			type = ['long', 'double', 'boolean', 'string']
				.indexOf(prefset.getPrefType(prefName));
			if (type == -1) return(undefined);
			typeName = ['Long', 'Double', 'Boolean', 'String'][type];
			ret = prefset['get' + typeName + 'Pref'](prefName);
		} else ret = defaultValue;
		return(ret);
	}
	
	// Set a preference
	this.setPref = function (prefName, value, overwrite, asInt) {
		var typeName, type;
		if (prefset.hasPref(prefName)) {
			if (overwrite === false) return("");
			type = prefset.getPrefType(prefName);
		} else {
			type = typeof(value);
			if (type == 'number') type = asInt? "long" : "double";
		}
		type = ['double', 'long', 'boolean', 'string'].indexOf(type);
		if (type == -1 || type == null) return(undefined);
		typeName = ['Double', 'Long', 'Boolean', 'String'][type];
		try {
			prefset['set' + typeName + 'Pref'](prefName, value);
		} catch (e) {
			// If typeName is Long, try using Double instead
			if (typeName == "Long") {
				prefset['setDoublePref'](prefName, value);
			} else { // Retry
				prefset['set' + typeName + 'Pref'](prefName, value);
			}
		}
		return(typeName);
	}
	
	// TODO: eliminate this, once I have found where setString() is still used
	//       and replaced by setPref()
		// Set a preference
	this.setString = function (prefName, value, overwrite, asInt) {
		var typeName, type;
		if (prefset.hasPref(prefName)) {
			if (overwrite === false) return("");
			type = prefset.getPrefType(prefName);
		} else {
			type = typeof(value);
			if (type == 'number') type = asInt? "long" : "double";
		}
		type = ['double', 'long', 'boolean', 'string'].indexOf(type);
		if (type == -1 || type == null) return(undefined);
		typeName = ['Double', 'Long', 'Boolean', 'String'][type];
		prefset['set' + typeName + 'Pref'](prefName, value);
		return(typeName);
	}
	
	// Delete a preference
	this.deletePref = function (prefName) {
		prefset.deletePref(prefName);
		return(prefset.hasPref(prefName));
	}
	
	// Display a dialog box to change a preference string
	this.askPref = function (pref, defvalue) {
		// If defvalue is defined, use it, otherwise, use current pref value
		var prefExists = prefset.hasPref(pref);
		if (defvalue == null) {
			defvalue = prefExists ? this.getPref(pref) : "";
		}
		var prefType = prefExists ? prefset.getPrefType(pref) : 'undefined';
		var validator = {
			'double': function (win, x)
				(/^[+-]?\d+\.\d*([eE][+-]?\d+)?$/).test(x),
			'long': function (win,x)
				x == parseInt(x),
			'boolean': function (win, x)
				["true", "false", "0", "1"].indexOf(x.toLowerCase()) != -1,
			'string': function (win, x)
				true,
			'undefined': function (win, x)
				true
		}
		// Display a dialog box to change the preference value
		var newVal = ko.dialogs.prompt("Change preference value" +
			(prefType == 'undefined' ? "" : " (" + prefType + ")") +
			" for:", pref, 	defvalue, "SciViews-K preference", "svPref" + pref,
			validator[prefType]);
	
		if (prefType == 'undefined') {
			for (prefType in validator)
				if (validator[prefType](null, newVal)) break;
		}
		switch(prefType) {
		 case 'boolean':
			newVal = !!eval(newVal.toLowerCase());
			break;
		 case 'long':
			newVal = parseInt(newVal);
			break;
		 case 'double':
			newVal = parseFloat(newVal);
			break;
		}
		if (newVal != null) this.setPref(pref, newVal);
	}
	
	// Set default preferences
	this.checkAll = function sv_checkAllPref (revert) {
		for (var i in _this.defaults) {
			var el;
			var p = _this.defaults[i];
			switch(typeof(p)) {
			 case "number":
				el = (parseInt(p) == p)? "Long" : "Double";
				break;
			 case "boolean":
				el = "Boolean";
				break;
			 case "string":
			 default:
				el = "String";
				p = p.toString();
			}
			if (revert // take all
				|| !prefset.hasPref(i) // if missing at all
				|| (prefset["has" + el + "Pref"](i) // has right type, but empty
				&& !prefset["get" + el + "Pref"](i))) {
				_this.deletePref(i); // To avoid _checkPrefType error
				prefset["set" + el + "Pref"](i, p);
			};
		}
	}

	// Simplify update of MRU lists
	this.mru = function (mru, reset, items, sep) {
		var mruList = "dialog-interpolationquery-" + mru + "Mru";
		// Do we reset the MRU list?
		if (reset === undefined) reset = false;
		if (reset == true) ko.mru.reset(mruList);
	
		// Do we need to split items (when sep is defined)?
		if (sep !== undefined) items = items.split(sep);
	
		// Add each item in items in inverse order
		for (var i = items.length - 1; i >= 0; i--) {
			if (items[i] != "")
				ko.mru.add(mruList, items[i], true);
		}
	}
	
	// Simplify storage of default tooltips for arguments in interpolation queries
	this.tip = function (arg, tip) {
		_this.setPref("dialog-tip-" + arg, tip, true);
	}

}).apply(sv.prefs);


// Preferences (default values, or values reset on each start)
sv.prefs.checkAll(false);

// Try getting a reasonable default R interpreter, if none is defined
var svRDefaultInterpreter = sv.prefs.getPref("sciviews.r.interpreter", "");
// Is this R interpreter still there?
if (svRDefaultInterpreter != "" &&
	sv.tools.file.exists(svRDefaultInterpreter) == sv.tools.file.TYPE_NONE) {
	// We don't warn the user that current R is not found here because Komodo
	// is still loading. Will be rechecked on time in sv.command.startR()
	sv.prefs.setPref("sciviews.r.interpreter", "", true);
	svRDefaultInterpreter = "";
}
// If no default R interpreter defined, try to get reasonable default one
if (svRDefaultInterpreter == "") {
	// This is platform-dependent...
	if (navigator.platform.indexOf("Win") === 0) {
		svRDefaultInterpreter = sv.tools.file.whereIs("Rgui");
		if (svRDefaultInterpreter) {
			sv.prefs.setPref("sciviews.r.interpreter", svRDefaultInterpreter,
				true);
			sv.prefs.setPref("sciviews.r.batchinterp", "r-gui", true);		
		}
	} else { // Linux or Mac OS X
		svRDefaultInterpreter = sv.tools.file.whereIs("R");
		if (svRDefaultInterpreter) {
			// Check if GnomeTerm Konsole or xfce4term are there, use them
			if (sv.tools.file.exists("gnome-terminal") !=
				sv.tools.file.TYPE_NONE) {
				sv.prefs.setPref("sciviews.r.batchinterp", "r-gnome-term",
					true);
			} else if (sv.tools.file.exists("konsole") !=
				sv.tools.file.TYPE_NONE) {
				sv.prefs.setPref("sciviews.r.batchinterp", "r-kde-term",
					true);
			} else if (sv.tools.file.exists("xfce4-terminal") !=
				sv.tools.file.TYPE_NONE) {
				sv.prefs.setPref("sciviews.r.batchinterp", "r-xfce4-term",
					true);
			} else { // Use default terminal
				sv.prefs.setPref("sciviews.r.batchinterp", "r-terminal",
					true);
			}
			sv.prefs.setPref("sciviews.r.interpreter", svRDefaultInterpreter,
				true);
		}
	}
}

// This is required by sv.helpContext() for attaching help to snippets
// Create empty preference sets to be used with snippet help system hack
// [[%pref:R-help:value]] which displays nothing when the snippet is used
// but can be used to retrieve value to display a particular snippet help page
// Help page triggered by a given URL
sv.prefs.setPref("URL-help", "", true);
// R HTML help pages triggered with '?topic'
sv.prefs.setPref("R-help", "", true);
// Help page on the R Wiki
sv.prefs.setPref("RWiki-help", "", true);

// Default working directory for R and default subdirs the first time SciViews-K
// is used... the rest of session dirs is set in r.js with sv.r.setSession()
sv.prefs.setPref("sciviews.session.dir", "~", false);

// Where do we want to display R help? In internal browser or not?
sv.prefs.setPref("sciviews.r.help", "internal", false);

// This is the base path for the R Wiki context help feature sv.helpContext()
sv.prefs.setPref("sciviews.rwiki.help.base",
	"http:/wiki.r-project.org/rwiki/doku.php?id=", false);

// Set default dataset to 'df'
// Should be reset to a more useful value during first use of R
sv.prefs.setPref("r.active.data.frame", "<df>", true);
sv.prefs.setPref("r.active.data.frame.d", "<df>$", true);
sv.prefs.setPref("r.active.lm", "<lm>", true);
sv.prefs.setPref("r.active.pcomp", "<pcomp>", true);
sv.prefs.mru("var", true, "");
sv.prefs.mru("var2", true, "");
sv.prefs.mru("x", true, "");
sv.prefs.mru("x2", true, "");
sv.prefs.mru("y", true, "");
sv.prefs.mru("factor", true, "");
sv.prefs.mru("factor2", true, "");
sv.prefs.mru("blockFactor", true, "");

//// (re)initialize a series of MRU for snippets' %ask constructs //////////////
// dec argument, like in read.table()
sv.prefs.mru("dec", true, '"."|","', "|");

// sep argument, like in read.table()
sv.prefs.mru("sep", true, '" "|";"|","|"\\t"', "|");

// header argument, like in read.table()
sv.prefs.mru("header", true, 'TRUE|FALSE', "|");

// Various examples of pkgdata (indeed, data frames in datatasets 2.9.1) ///////
sv.prefs.mru("pkgdata", false,
	'airquality|anscombe|attenu|attitude|beaver1|beaver2|BOD|cars|' +
	'ChickWeight|chickwts|CO2|DNase|esoph|faithful|Formaldehyde|freeny|' +
	'Indometh|infert|InsectSprays|iris|LifeCycleSavings|Loblolly|longley|' +
	'morley|mtcars|Orange|OrchardSprays|PlantGrowth|pressure|Puromycin|' +
	'quakes|randu|rock|sleep|stackloss|swiss|Theoph|ToothGrowth|trees|' +
	'USArrests|USJudgeRatings|warpbreaks|women', "|");

//// Various examples of formulas //////////////////////////////////////////////
sv.prefs.mru("formula", false,
	'y ~ x,y ~ x + x2,y ~ x + I(x^2),y ~ x - 1,' +
	'y ~ factor,y ~ x | factor,y ~ factor + factor2,y ~ factor * factor2', ",");

//// Various examples of quantiles and probs ///////////////////////////////////
sv.prefs.mru("quantiles", false, '1|c(1, 3)', "|");
sv.prefs.mru("probs", false, '0.5|c(0.01, 0.25, 0.5, 0.75, 0.99)', "|");
sv.prefs.mru("lower.tail", true, 'TRUE|FALSE', "|");
sv.prefs.mru("na.rm", true, 'TRUE|FALSE', "|");
sv.prefs.mru("var.equal", true, 'TRUE|FALSE', "|");
sv.prefs.mru("conf.level", true, '0.90|0.95|0.99|0.999', "|");
sv.prefs.mru("alternative", true, '"two.sided"|"less"|"greater"', "|");
sv.prefs.mru("breaks", true, '"Sturges"|"Scott"|"Freedman-Diaconis"|10', "|");
sv.prefs.mru("corMethod", true, '"pearson"|"kendall"|"spearman"', "|");

// Var.equal (for t-test)
sv.prefs.mru("var.equal", true, 'TRUE|FALSE', "|");

// For multivariate stats with 'pcomp' object in the SciViews package
sv.prefs.mru("scale", true, 'TRUE|FALSE', "|");
sv.prefs.mru("loadings", true, 'TRUE|FALSE', "|");
sv.prefs.mru("sort.loadings", true, 'TRUE|FALSE', "|");
sv.prefs.mru("screetype", true, '"barplot"|"lines"', "|");
sv.prefs.mru("pc.biplot", true, 'TRUE|FALSE', "|");
sv.prefs.mru("choices", true, '1:2|2:3|c(1, 3)|c(1, 4)|c(2, 4)|3:4', "|");
sv.prefs.mru("text.pos", true, '1|2|3|4|NULL', "|");
sv.prefs.mru("labels", false, 'NULL|FALSE|<factor>|list(group = <factor>)', "|");

//// Various graph parameters //////////////////////////////////////////////////
// Colors
sv.prefs.mru("col", true,
    '1|2|3|4|5|6|7|8|"#838383"|' +
    '"black"|"red"|"blue"|"green"|"gray"|"darkred"|"darkblue"|"darkgreen"|' +
	'"darkgray"|"mistyrose"|"lightblue"|"lightgreen"|"lightgray"|"gray10"|' +
    '"gray20"|"gray30"|"gray40"|"gray50"|"gray60"|"gray70"|"gray80"|"gray90"|' +
    '"white"|"transparent"|"wheat"|"cornsilk"|"yellow"|"orange"|"tan"|' +
    '"tomato"|"firebrick"|"magenta"|"pink"|"salmon"|"violet"|"purple"|' +
    '"plum"|"cyan"|"lightcyan"|"lavender"|"navy"|"azure"|"aquamarine"|' +
    '"turquoise"|"khaki"|"gold"|"bisque"|"beige"|"brown"|"chocolate"', "|");

// Type
sv.prefs.mru("type", true, '"p"|"l"|"b"|"c"|"o"|"h"|"s"|"S"|"n"', "|");

// Log
sv.prefs.mru("log", true, '""|"x"|"y"|"xy"', "|");

// Add
sv.prefs.mru("add", true, 'TRUE|FALSE', "|");

// Pch
sv.prefs.mru("pch", true,
    '0|1|2|3|3|4|5|6|7|8|9|10|11|12|13|14|15|15|17|18|19|20|21|22|23|24|25|' +
    '"."|"+"|"-"|"*"', "|");

// Lty
sv.prefs.mru("lty", true,
    '"solid"|"dashed"|"dotted"|"dotdash"|"longdash"|"twodash"|"blank"', "|");

// Lwd
sv.prefs.mru("lwd", true, '1|2|3', "|");

// Notch (for boxplot)
sv.prefs.mru("notch", true, 'TRUE|FALSE', "|");

//// various mrus for 'car' graphs /////////////////////////////////////////////
sv.prefs.mru("reg.line", true, 'FALSE|lm', "|");
sv.prefs.mru("smooth", true, 'TRUE|FALSE', "|");
sv.prefs.mru("diagonal", true,
	'"density"|"histogram"|"boxplot"|"qqplot"|"none"', "|");
sv.prefs.mru("envelope", true, '0.90|0.95|0.99|0.999', "|");
