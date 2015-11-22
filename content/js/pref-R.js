// SciViews-K R preferences panel functions
// Copyright (c) 2009-2012 Ph. Grosjean (phgrosjean@sciviews.org) & Kamil Barton
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// apps;                                  // Array with supported R applications  
//
//// Utilities /////////////////////////////////////////////////////////////////
// _menuListSetValues(attribute);         // Set the value in a menu list
// _menuListGetValues(attribute);         // Get the selection in a menu
// _populateRInterps();                   // Populate list of supported R apps
//
//// Implementation of the pref-R dialog box ///////////////////////////////////
// PrefR_OnLoad();                        // R preference window loaded
// PrefR_editMenulist(el, value);         // Edit a list for a menu
// PrefR_svRDefaultInterpreterOnSelect(event); // R app selected in the list
// PrefR_svRApplicationOnSelect(event);   // Update list of application
// PrefR_updateCommandLine(update);       // Update the command line label
// PrefR_setExecutable(path);             // Set the path to the R executable
// PrefR_UpdateCranMirrors(localOnly);    // Update the list of CRAN mirrors
//
//// Standard interface for preference pages ///////////////////////////////////
// OnPreferencePageLoading(prefset);      // Code run when the page is loaded
//                                           Note: PrefR_OnLoad() used instead
// OnPreferencePageOK(prefset);           // User clicks OK
////////////////////////////////////////////////////////////////////////////////
//
// Prefs to possibly include later on:
// * Address for remote R (sv.socket.host)?
//   if not localhost - disable source* commands
// * R help: show in tab or in separate window
// * R Site search url (%S replaced by topic)

var sv;
var cancelled = false;

// List of supported R applications
var apps = [
	{id:"r-terminal", label:"in default terminal",
		path:"\"%Path%\" %args%",
        app:"R",
		required:"R",
		platform:"Mac"},
//	{id:"r-terminal-sciviews", label:"in terminal (SciViews version)",
//		path:"\"%Path%\" %args%",
//        app:"svR",
//		required:"svR",
//		platform:"Mac"},
	{id:"r-terminal", label:"in default terminal",
		path:"x-terminal-emulator -e '%Path% %args%'",
        app:"R",
		required:"x-terminal-emulator,R",
		platform:"Lin"},
	{id:"r-terminal", label:"in console window",
		path:"\"%Path%\" %args%",
        app:"R.exe",
		required:"R",
		platform:"Win"},
	{id:"r-gnome-term", label:"in Gnome terminal",
        path:"gnome-terminal --hide-menubar --working-directory='%cwd%' " +
			"-t '%title%' -x '%Path%' %args%",
        app:"gnome-terminal,R",
		required:"gnome-terminal,R",
		platform:"Lin"},
	{id:"r-kde-term", label:"in Konsole",
        path:"konsole --workdir '%cwd%' --title %title% -e \"%Path%\" %args%",
        app:"R",
		required:"konsole,R",
		platform:"Lin"},
	{id:"r-xfce4-term", label:"in XFCE terminal",
        path:"xfce4-terminal --title \"%title%\" -x \"%Path%\" %args%",
        app:"R",
		required:"xfce4-terminal,R",
		platform:"Lin"},
	{id:"r-app", label:"R app",
		path:"open -a \"%Path%\" --args \"%cwd%\" %args%",
        app:"R.app",
		required:"/Applications/R.app",
		platform:"Mac"},
	{id:"r64-app", label:"R64 app",
		path:"open -a \"%Path%\" --args \"%cwd%\" %args%",
        app:"R64.app",
		required:"/Applications/R64.app",
		platform:"Mac"},
	{id:"svr-app", label:"SciViews R app",
		path:"open -a \"%Path%\" --args \"%cwd%\" %args%",
        app:"SciViews R.app",
		required:"/Applications/SciViews R.app",
		platform: "Mac"},
	{id:"svr64-app", label:"SciViews R64 app",
		path:"open -a \"%Path%\" --args \"%cwd%\" %args%",
        app:"SciViews R64.app",
		required:"/Applications/SciViews R64.app",
		platform:"Mac"},
	{id:"r-gui", label:"R GUI",
		path:"\"%Path%\" --sdi %args%",
        app:"Rgui.exe",
		required:"Rgui",
        platform:"Win"},
	{id:"r-tk", label:"R Tk GUI",
		path:"\"%Path%\" --interactive --gui:Tk %args%",
        app:"R",
		required:"R",
		platform:"Lin,Mac"}
];


//// Utilities /////////////////////////////////////////////////////////////////
// Used at startup
function _menuListSetValues (attribute) {
	if (!attribute) attribute = 'items';
	var ml = document.getElementsByTagName('menulist');
	var el, values, v;
	for (var i = 0; i < ml.length; i++) {
		el = ml[i];
		if (el.hasAttribute(attribute)) {
			values = el.getAttribute(attribute).split(/\s+/);
			for (var k in values) {
                v = unescape(values[k]);
                el.appendItem(v, v, null);
			}
		}
	}
}

// Used on closing. Store menulist items in an attribute "value"
function _menuListGetValues (attribute) {
	if (!attribute) attribute = 'values';
	var ml = document.getElementsByTagName('menulist');
	var el, values;
	for (var i = 0; i < ml.length; i++) {
		el = ml[i];
		if (el.hasAttribute(attribute)) {
			values = [];
			for (var k = 0; k < el.itemCount; k++)
				values.push(escape(el.getItemAtIndex(k).value));
			values = sv.tools.array.unique(values);
			var nMax = parseInt(el.getAttribute('maxValues'));
			if(nMax > 0) values = values.slice(0, nMax);
			el.setAttribute(attribute, values.join(" "));
		}
	}
}

// Populate the list of available R interpreters
function _populateRInterps () {
    var prefExecutable = sv.prefs.getPref('sciviews.r.interpreter');
    var rs = new Array();
    var os = Components.classes['@activestate.com/koOs;1']
		.getService(Components.interfaces.koIOs);
    var menu = document.getElementById("sciviews.r.interpreter");

    switch (os.name) { //'posix', 'nt', 'mac', 'os2', 'ce', 'java', 'riscos'.
     case "nt":
        rs = rs.concat(sv.tools.file.whereIs("Rgui"));
        rs = rs.concat(sv.tools.file.whereIs("R"));
        rs.sort(); rs.reverse();
		break;
     case "mac":
	 case "posix": // On Mac OS X, os.name is posix!!!
        rs = ["/Applications/R.app", "/Applications/R64.app",
			  "/Applications/SciViews R.app", "/Applications/SciViews R64.app",
			  sv.tools.file.whereIs("R")]; //, sv.tools.file.whereIs("svR")];
        break;
     default:
        rs = rs.concat(sv.tools.file.whereIs("R"));
    }
    rs.unshift(prefExecutable);

    for (var i in rs) {
        rs[i] = os.path.normpath(rs[i]);
        if (sv.tools.file.exists(rs[i]) == sv.tools.file.TYPE_NONE)
            rs.splice(i, 1);
    }

    rs = sv.tools.array.unique(rs);
	if (rs.indexOf(prefExecutable) == -1) {
		prefset.setStringPref('sciviews.r.interpreter', '');
		rs.unshift('');
	}
    menu.removeAllItems();
    for (var i in rs)
        menu.appendItem(rs[i], rs[i], null);

    if (rs.length > 0)
        document.getElementById("no-avail-interps-message").hidden = true;
}


//// Implementation of the pref-R dialog box ///////////////////////////////////
// For menulists, take the value argument/(or text in the textbox), and append
// it as new element to the list if it is new, otherwise set as selected
function PrefR_OnLoad () {
	try {
		var p = parent;
		while (p.opener && (p = p.opener) && !sv) if (p.sv) sv = p.sv;
		var prefExecutable;
		var prefset = parent.hPrefWindow.prefset;
		var prefName = 'sciviews.r.interpreter';
		var menu = document.getElementById("sciviews.r.batchinterp");
		menu.removeAllItems();
		var platform = navigator.platform.substr(0,3);
		var tmp = {}, required, res;
		for (var i in apps) {
			if (apps[i].platform.split(',').indexOf(platform) != -1) {
				required = apps[i].required.split(',');
				res = true;
				for (var k in required) {
					// Take care that R.app on the Mac is a directory!
					if ((sv.tools.file.whereIs(required[k]) == "") &&
						(sv.tools.file.exists(required[k]) ==
						sv.tools.file.TYPE_NONE)) res = false;
				}			
				if (res) tmp[apps[i].id] = apps[i];
			}
		}
		apps = tmp;
		for (var i in apps)
			menu.appendItem(apps[i].label, i, null);
		// Update CRAN mirror list (first local, then tries remote at CRAN)
		if (!PrefR_UpdateCranMirrors(true)) PrefR_UpdateCranMirrors(false);
		_menuListSetValues(); // Restore saved menu values
		sv.prefs.checkAll(); // Check all preferences are ok, or restore defaults
		_populateRInterps();
		parent.hPrefWindow.onpageload();
		PrefR_updateCommandLine(true);
	} catch (e) {
		sv.log.exception(e, "Unknown error while loading R preferences"
			+ " PrefR_OnLoad():\n\n (" + e + ")", true);
	}
}

// Change a menu list
function PrefR_editMenulist (el, value) {
	try {
		var curValue = (!value)?  sv.tools.strings.trim(el.value) : value;
		if (!curValue) return;
		var values = [], val;
		for (var j = 0; j < el.itemCount; j++) {
			val = el.getItemAtIndex(j).value;
			if (val == curValue) {
				el.selectedIndex = j;
				return;
			}
			values.push(val);
		}
		el.appendItem(curValue, curValue, null);
	} catch (e) {
		sv.log.exception(e, "Unknown error while editing R preferences menu list"
			+ " editMenulist(el, value):\n\n (" + e + ")", true);
	}
}

function PrefR_svRDefaultInterpreterOnSelect (event) {
	try {
		var os = Components.classes['@activestate.com/koOs;1']
			.getService(Components.interfaces.koIOs);
	
		var menuApplication = document.getElementById("sciviews.r.batchinterp");
		var menuInterpreters = document.getElementById("sciviews.r.interpreter");
	
		// Just in case
		if (sv.tools.file.exists(menuInterpreters.value) ==
		   sv.tools.file.TYPE_NONE) {
			ko.dialogs.alert("Cannot find file: " + menuInterpreters.value, null,
				"SciViews-K preferences");
		}
		
		var app = os.path.basename(menuInterpreters.value);
		if (!(menuApplication.value in apps) ||
			apps[menuApplication.value].app != app) {
			var i;
			for (i in apps)
				if (apps[i].app == app) break;
			menuApplication.value = i;
		}
		PrefR_updateCommandLine(true);
	} catch (e) {
		sv.log.exception(e, "Unknown error while selecting default R interpreter"
			+ " PrefR_svRDefaultInterpreterOnSelect(event):\n\n (" + e + ")", true);
	}
}

function PrefR_svRApplicationOnSelect (event) {
	try {
		var menuApplication = document.getElementById("sciviews.r.batchinterp");
		var menuInterpreters = document.getElementById("sciviews.r.interpreter");
		if (!(menuApplication.value in apps)) return;
		var app = apps[menuApplication.value].app;
		//var sel = menuApplication.selectedItem;
		var os = Components.classes['@activestate.com/koOs;1']
			.getService(Components.interfaces.koIOs);
		if (os.path.basename(menuInterpreters.value) != app) {
			//TODO: modify to use with:
			//PrefR_menulistSetValue(menuInterpreters, value, "value", null);
			var item;
			for (var i = 0; i <= menuInterpreters.itemCount; i++) {
				item = menuInterpreters.getItemAtIndex(i);
				if (item) {
					if (os.path.basename(item.getAttribute("value")) == app) {
						menuInterpreters.selectedIndex = i;
						break;
					}
				}
			}
		}
		PrefR_updateCommandLine(true);
	} catch (e) {
		sv.log.exception(e, "Unknown error while selecting R application"
			+ " PrefR_svRApplicationOnSelect(event):\n\n (" + e + ")", true);
	}
}

function PrefR_updateCommandLine (update) {
	try {
		var appId = document.getElementById("sciviews.r.batchinterp").value;
		var appPath = document.getElementById("sciviews.r.interpreter").value;
		if (!appId || !appPath) return("");
		var cmdArgs = document.getElementById("sciviews.r.args").value;
		var args1 = "";
	
		if (document.getElementById("sciviews.pkgs.sciviews").checked)
				args1 += " --svStartPkgs=SciViews";
	
		var cwd = sv.tools.file.path("ProfD", "extensions",
			"sciviewsk@sciviews.org", "defaults");
	
		cmdArgs = cmdArgs.replace(/\s*--mdi/, "");
	
		var argsPos = cmdArgs.indexOf("--args");
		if (argsPos != -1) {
			args1 += " " + sv.tools.strings.trim(cmdArgs.substring(argsPos + 6));
			cmdArgs = cmdArgs.substring(0, argsPos);
		}
	
		args1 = sv.tools.strings.trim(args1);
		if (args1)
			args1 = " --args " + args1;
	
		var cmd = apps[appId].path;
		cmd = cmd.replace("%Path%", appPath).replace("%title%", "SciViews-R")
			.replace("%cwd%", cwd).replace("%args%", cmdArgs) + args1;
	
		if (update)
			document.getElementById('R_command').value = cmd;
	
		return(cmd);
	} catch (e) {
		sv.log.exception(e, "Unknown error while updating R command line"
			+ " PrefR_updateCommandLine(update):\n\n (" + e + ")", true);
		return("???");
	}
}

function PrefR_setExecutable (path) {
    try {
		var menu = document.getElementById("sciviews.r.interpreter");
	
		if (!path || !sv.tools.file.exists(path)) {
			var os = Components.classes['@activestate.com/koOs;1']
				.getService(Components.interfaces.koIOs);
			path = menu.value;
			path = ko.filepicker.openExeFile(os.path.dirname(path),
				os.path.basename(path));
		}
		if (!path) return;
		path = os.path.normpath(path);
		PrefR_editMenulist(menu, path);
		menu.value = path;
	} catch (e) {
		sv.log.exception(e, "Unknown error while setting R executable"
			+ " PrefR_setExecutable(path):\n\n (" + e + ")", true);
	}
}

// Get CRAN mirrors list - independently of R
function PrefR_UpdateCranMirrors (localOnly) {
	try {
		var svFile = sv.tools.file;
	
		// Get data in as CSV
		var csvName = "CRAN_mirrors.csv";
		var localDir = svFile.path("PrefD", "extensions", "sciviewsk@sciviews.org");
		var path, csvContent;
		var arrData;
		if (!localOnly) {
			try {
				csvContent = svFile.readURI("http://cran.r-project.org/" + csvName);
			} catch(e) {}
		}
	
		var nativeJSON = Components.classes["@mozilla.org/dom/json;1"]
			.createInstance(Components.interfaces.nsIJSON);
	
		var jsonFile = svFile.path(localDir, "CRAN_mirrors.json");
		var alreadyCached = false;
		if (!csvContent) {
			// First, check if there is serialized version
			alreadyCached = svFile.exists(jsonFile);
			if (alreadyCached) {
				arrData = nativeJSON.decode(svFile.read(jsonFile));
			} else {
				var localPaths = [ ];
				var platform = navigator.platform.toLowerCase().substr(0,3);
				if (platform == "win")
					localPaths.push(svFile.path(
						sv.prefs.getPref("sciviews.r.interpreter"), "../../doc"));
				else { // Linux or Mac OS X
					localPaths.push("/usr/share/R/doc"); // Linux
					localPaths.push("/usr/local/share/R/doc"); // Linux
					localPaths.push("/Library/Frameworks/R.framework/Versions/" +
						"Current/Resources/doc"); // Mac OS X
				}
				var file;
				for (var i in localPaths) {
					file = svFile.getfile(localPaths[i], csvName);
					if (file.exists()) {
						csvContent = svFile.read(file.path);
						break;
					}
				}
			}
		}
		if (!csvContent && !arrData) return(false);
		// TODO: Add error message when mirrors list cannot be obtained
	
		if (!arrData) {
			// Convert CSV string to Array
			arrData = sv.tools.array.CSVToArray(csvContent);
			var colNames = arrData.shift(1);
			var colName = colNames.indexOf("Name");
			var colURL = colNames.indexOf("URL");
			var colOK = colNames.indexOf("OK");
			var name, url, item;
			for (i in arrData) {
				item = arrData[i];
				if (item[colOK] == "1"
					// Fix for broken entries
					&& (item[colURL].search(/^(f|ht)tp:\/\//) === 0)) {
					arrData[i] = [item[colName], item[colURL]];
				}
			}
			// Add main server at the beginning
			arrData.unshift(["Main CRAN server", "http://cran.r-project.org/"]);
		}
		if (!arrData) return(false);
	
		if (!localOnly || !alreadyCached) {
			// If updated from web, or not cached yet,
			// serialize and save to file for faster later use
			svFile.write(jsonFile, nativeJSON.encode(arrData), 'utf-8');
		}
	
		// Put arrData into MenuList
		var menuList = document.getElementById("r.cran.mirror");
		var value =
			menuList.value? menuList.value : sv.prefs.getPref("r.cran.mirror");
		menuList.removeAllItems();
		for (i in arrData) {
			if (arrData[i][0])
				menuList.appendItem(arrData[i][0], arrData[i][1], arrData[i][1]);
		}
		menuList.value = value;
		return(true);
	} catch (e) {
		sv.log.exception(e, "Unknown error while setting R executable"
			+ " PrefR_UpdateCranMirrors(localOnly):\n\n (" + e + ")", true);
		return(true);
	}
}


//// Standard interface for preference pages ///////////////////////////////////
function OnPreferencePageLoading (prefset) {
	// Nothing to do? PrefR_OnLoad() invoked instead!
}

function OnPreferencePageOK (prefset) {	
	try {
		prefset = parent.hPrefWindow.prefset;
		// Set R interpreter
		prefset.setStringPref("sciviews.r.interpreter",
			document.getElementById("sciviews.r.interpreter").value);
		prefset.setStringPref("sciviews.r.batchinterp",
			document.getElementById('sciviews.r.batchinterp')
				.selectedItem.getAttribute("value"));
		prefset.setStringPref("svRCommand", PrefR_updateCommandLine(false));
		
		// Set decimal and field separator
		var outDec = document.getElementById('r.csv.dec').value;
		var outSep = document.getElementById('r.csv.sep').value;	
		if (outDec == outSep) {
			parent.switchToPanel("svPrefRItem");
			ko.dialogs.alert(
				"Decimal separator cannot be the same as field separator.", null,
				"SciViews-K preferences");
			return(false);
		}
		if (outDec != prefset.getStringPref('r.csv.dec')
			|| outSep != prefset.getStringPref('r.csv.sep')) {
			prefset.setStringPref("r.csv.sep", outSep);
			prefset.setStringPref("r.csv.dec", outDec);
			if (sv.r.running) {
				sv.r.evalHidden('options(OutDec = "' + outDec + '", ' +
				'OutSep = "' + outSep + '")', true);
			}
		}
		
		// Set the R type
		var rType = document.getElementById('sciviews.r.type').value;
		prefset.setStringPref("sciviews.r.type", rType);
		var rPort = parseInt(document.getElementById('sciviews.r.port').value);
		// Allow for both a long or a double for sciviews.r.port
		try {
			prefset.setLongPref("sciviews.r.port", rPort);
		} catch (e) {
			prefset.setDoublePref("sciviews.r.port", rPort);
		}
		// TODO: shouldn't we test for rPort too?
		var rPagePort = parseInt(document
			.getElementById('sciviews.r.page.port').value);
		// Allow for both a long or a double for sciviews.r.page.port
		try {
			prefset.setLongPref("sciviews.r.page.port", rPagePort);
		} catch (e) {
			prefset.setDoublePref("sciviews.r.page.port", rPagePort);
		}
		// TODO: shouldn't we test for rPagePort too?
		// Check if selected item is different from current sv.clientType
		// and if R is running
		if (rType != sv.clientType && sv.r.test()) {
			// R is running, do not change right now
			sv.alert("R server type changed",
				"The R server type you selected will be" +
				" used after restarting R!");
		} else {
			// Change current server type too
			sv.socket.setSocketType(rType);
		}

		_menuListGetValues();
		
		// Restart socket server if running and port or channel changed
		var koType = document.getElementById('sciviews.ko.type').value;
		var koPort = parseInt(document.getElementById('sciviews.ko.port').value);
		var curKoPort; // Either long or double
		try {
			curKoPort = prefset.getLongPref("sciviews.ko.port");
		} catch (e) {
			curKoPort = parseInt(prefset.getDoublePref("sciviews.ko.port"));
		}
		if (koPort != curKoPort || koType != sv.serverType) {
			// Stop server with old config, if it is started
			var isStarted = sv.socket.serverIsStarted;
			if (isStarted) sv.socket.serverStop();
			// Allow for both a long or a double for sciviews.ko.port
			try {
				prefset.setLongPref("sciviews.ko.port", koPort);
			} catch (e) {
				prefset.setDoublePref("sciviews.ko.port", koPort);
			}
			prefset.setStringPref("sciviews.ko.type", koType);
			
			sv.serverType = koType;
			// Start server with new config, if previous one was started
			if (isStarted) sv.socket.serverStart();
			// Change config in R, if it is running and connected
			if (sv.r.running) {
				sv.r.evalHidden('options(ko.kotype = "' + koType + '", ' +
					'ko.port = "' + koPort + '")', true);
			}
		}
		return(true);
	} catch (e) {
		sv.log.exception(e, "Unknown error while setting R preferences"
			+ " OnPreferencePageOK(prefset):\n\n (" + e + ")", true);
		// Should really return false... but then, we don't exit from the page!
		return(true);
	}
}
