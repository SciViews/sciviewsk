// SciViews-K R functions
// Define functions to pilot R from Komodo Edit 'sv.r' & 'sv.r.pkg'
// Copyright (c) 2008-2012, Ph. Grosjean (phgrosjean@sciviews.org) & K. Barton
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// sv.r.RMinVersion;       // Minimum R version required
// sv.r.server;            // Kind of R server used? Either 'http' or 'socket'
// sv.r.sep;               // Item separator that R should use returning data.
// sv.r.running;           // Is the linked R interpreter currently running?
// sv.r.width;             // Width of R output (-1 for no change from Komodo)
// sv.r.application(warn); // Is the R executable there?
// sv.r.test(showVersion, testVersion, isStarting); // Check if an R interpreter
//                                                     is communicating with us
// sv.r.closed();          // This is called when R quits
// sv.r.print(text, newline, command, partial); // Print to local R console
// sv.r.eval(cmd);         // Evaluate 'cmd' in R
// sv.r.evalHidden(cmd, earlyExit); // Evaluate 'cmd' in R in a hidden way
// sv.r.evalCallback(cmd, procfun, ...); // Run 'cmd' in R and call 'procfun'
// sv.r.escape(cmd);       // Escape R current calculation or multiline mode
// sv.r.setwd(dir, ask, type); // Set the working dir (various types allowed)
// sv.r.run();             // Run current selection or line in R; goto next line
// sv.r.runEnter(breakLine); // Run current line to pos in R
//                              and add a line feed
// sv.r.source(what);      // Source various part of current buffer to R
// sv.r.send(what);        // Send various part of current buffer to R
// sv.r.calltip(code);     // Calltip for a piece of code (current code if "")
// sv.r.complete(code);    // AutoComplete mechanism for R
// sv.r.display(topic, what); // Display 'topic' according to 'what' type
// sv.r.help(topic, pkg);  // Get help in R for 'topic'; 'package' optional
// sv.r.example(topic);    // Run example in R for 'topic'
// sv.r.search(topic, internal); // Search R help for 'topic'
// sv.r.siteSearch(topic, idxname); // Search R web sites for 'topic'
// sv.r.pager(file, title, cleanUp); // Display the content of a text file
// sv.r.dataList(which);   // List R datasets in "loaded" or "all" packages
// sv.r.data();            // Select one dataset to load
// sv.r.browseVignettes(); // Open a web page listing all installed vignettes
// sv.r.saveWorkspace(file, title);  // Save data in a .Rdata file
// sv.r.loadWorkspace(file, attach, callback, param);
//                         // Load content of a .RData file in R or attach it
// sv.r.saveHistory(file, title); // Save the history in a file
// sv.r.loadHistory(file, title); // Load the history from a file
// sv.r.saveGraph(type, file, title, height, width, method);
//                         // Save the current R graph in different formats
// sv.r.obj(objClass);     // Set active object for objClass (data.frame by def)
// sv.r.saveDataFrame(name, filename, objName, dec, sep); // Save a data frame
// sv.r.refreshSession();  // Refresh MRU lists associated with current session
// sv.r.initSession(dir, datadir, scriptdir, reportdir);
// sv.r.setSession(dir, datadir, scriptdir, reportdir, saveOld, loadNew);
//                         // Initialize R session with those directories
//                         // setSession() also do the change in R and is to
//                         // be used preferably, except at Komodo startup!
//                         // dir: session directory, xxxdir: xxx subdirectory,
//                         // saveOld (true by def): save old session data?
//                         // loadNew (true by def): load data from new session?
// sv.r.switchSession(inDoc); // Switch to another R session;possibly create it
// sv.r.exploreSession();  // Explore the session dirs in default file browser
// sv.r.reloadSession();   // Reload .RData nd .Rhistory files from session dir
// sv.r.clearSession();    // Clear session's .RData and .Rhistory files
// sv.r.quit(save);        // Quit R (ask to save in save in not defined)
// sv.r.kpf2pot(kpfFile);  // Create a translation (.pot) file for a project
// sv.r.kpz2pot(kpzFile);  // Create a translation (.pot) file for a package
// sv.r.kpfTranslate(kpfFile); // Translate a project
// sv.r.kpzTranslate(kpzFile); // Translate a package
//
// Note: sv.robjects is implemented in robjects.js
//       sv.rconsole functions are implemented in rconsole.js
//
// sv.r.pkg namespace: /////////////////////////////////////////////////////////
// sv.r.pkg.repositories(); // Select repositories for installing R packages
// sv.r.pkg.chooseCRANMirror(setPrefString, callback);
//                          // replacement for .CRANmirror
// sv.r.pkg.available();   // List available R packages on selected repository
// sv.r.pkg.installed();   // List installed R packages
// sv.r.pkg.new();         // List new R packages available on CRAN
// sv.r.pkg.old();         // List older installed R packages than on CRAN
// sv.r.pkg.update();      // Update installed R packages from the repositories
// sv.r.pkg.status();      // Show status of installed R packages
// sv.r.pkg.loaded();      // Show which R packages are loaded
// sv.r.pkg.load();        // Load one R package
// sv.r.pkg.unload();      // Unload one R package
// sv.r.pkg.remove();      // Remove one R package
// sv.r.pkg.install(pkgs, repos); // Install R package(s) from local files or
////////////////////////////////////////////////////////////////////////////////
//
// TODO:
// * Look in SciViews-K-dev for another implementation of R communication
// * In overlay: add "source file" context menu item in the places/project tab

// Define the 'sv.r' namespace
if (typeof(sv.r) == 'undefined')
sv.r = {
	RMinVersion: "2.11.1",	// Minimum version of R required
	server: "socket", 		// Default server, defined as socket
	sep: ";;",				// Separator used for items
	running: false,			// Indicate if R is currently running
	width: -1 				// The R output width (set to -1 for no change)
};

// Check where the R executable can be found (for batch running, e.g., linter)
sv.r.application = function (warn) {
	if (warn === undefined) warn = false;

	// Look for R executable for batch processes
	var R = sv.tools.file.whereIs("R", true)
	if (R == null & warn) {
		sv.alert("R is not found", "You should install or reinstall R " +
			"on this machine (see http://cran.r-project.org). Under Windows " +
			"you could also run RSetReg.exe from the /bin subdirectory of R " +
			"install in case R is installed, but not recognized by SciViews).");
	}
	
	// Save the path in r.application prefs
	if (R == null) R = "";
	sv.prefs.setPref("r.application", R, true);
	return(R);
}

// Test if R is running
sv.r.test = function sv_RTest (showVersion /*= false*/, testVersion /*= false*/,
	isStarting /*= false */) {
	if (showVersion === undefined || showVersion == null)
		showVersion = false;
	if (testVersion === undefined || testVersion == null)
		testVersion = false;
	if (isStarting === undefined || isStarting == null)
		isStarting = false;
		
	try {
		// Check that R is still there on the other side of the server port
		// and adjust server type (http or socket) if needed
		var res = sv.socket.rCommandSync(
			'cat(localeToCharset()[1], R.version.string, sep = "%%%")');
		if (res == null) { // If R is not running...
			window.setTimeout("sv.command.updateRStatus(false);", 500);
			// Indicate R should be started, or... is starting!
			if (isStarting) {
				sv.cmdout.message("R is starting... please wait", 0, false);
			} else {
				sv.cmdout.message("R is not running or not connected"
					+ " (use the menu R -> Start R)", 0, false);
			}
			return(false);
		} else {
			// Update menus...
			window.setTimeout("sv.command.updateRStatus(true);", 500);
			
			// Split results
			var result = res.split("%%%");
			// TODO: check we have two results and they match expected strings
			
			// Set charset
			sv.socket.charset = result[0];
			
			// Check version
			var RversionString = result[1];
			var Rversion = sv.tools.strings.trim(RversionString.substr(10, 7));
			sv.log.debug("R version: '" + Rversion + "'");
			if (testVersion &&
				sv._compareVersion(Rversion, sv.r.RMinVersion) < 0) {
				// R version is too low, issue a message
				sv.alert("R version is too old!", "SciViews-K needs R version "
					+ sv.r.RMinVersion + ". You got version " + Rversion +
					".\nContinue at your own risks or (better) upgrade R now!");
			}
			// Change message in R Output
			if (showVersion)
				sv.cmdout.message(RversionString + " is ready!");
			return(true);
		}
	} catch (e) {
		// PhG: this happens when Komodo Edit is still loading...
		// Thus, set ShowMessage to false!
		sv.log.exception(e, "Unknown error while testing R"
			+ " sv.r.test():\n\n (" + e + ")", false);
		return(false);
	}
}

// Function called when R is closed
sv.r.closed = function () {
	window.setTimeout("sv.command.updateRStatus(false);", 500);
	// Blank R output
	sv.cmdout.message("R has quit!", 0, false);
	// Reset statusbar
	sv.prefs.setPref("sciviews.session.dir", "~", true);
	sv.prefs.setPref("r.active.data.frame", "<none>", true);
	sv.prefs.setPref("r.active.lm", "<none>", true);
	ko.statusBar.AddMessage("", "SciViews-K");
	sv.cmdout.clear(false);
	// Reset the objects explorer
	// PhG: this seems to cause problems => don't use this yet!
	//sv.robjects.clearPackageList();
}

// Print some text (command or results) in the local R console
sv.r.print = function (text, newline /* =true*/, command /* =false*/,
partial /* =false*/) {
	// Default values for optional arguments
	if (newline === undefined || newline == null) newline = true;
	if (command === undefined || command == null) command = false;
	if (partial === undefined || partial == null) partial = false;

	// Print something in the R output panel
	if (command) { // This is a R command
		if (partial) {
			// Make sure that all lines start with a continuation prompt
			text = text.replace(/(\r?\n)(:\+ )?/g, "\n:+ ");
			sv.cmdout.append(text, newline);
			sv.cmdout.message("R waits for more input..." +
				" (to exit multiline mode, select menu R " +
				"-> Escape current calculation)", 0, true);
		} else { // This is a new command
			//sv.cmdout.clear(false);
			sv.cmdout.message("Calculating... " +
				"(if it takes too long, switch to the R console:" +
				" it could be waiting for some input, be blocked or closed)!",
				0, true);
			text = ":> " + text;
		}
	} else { // This is some data returned by R
		if (!partial) {
			// First make sure we zap all temporary partial code
			sv.cmdout.exitPartial();
			sv.cmdout.message("...", 0, false);
		}
		sv.cmdout.append(text, newline);
	}
}

// Evaluate code in R
sv.r.eval = function (cmd) {
	// If we thing R is not running, we are better to retest here
	if (!sv.r.running) {
// TODO: propose to start R here!
		if (!sv.r.test()) {
			// Indicate R should be started
			ko.statusBar.AddMessage(
			sv.translate("R must be started for this command (R -> Start R)"),
				"SciViews-K", 5000, true);
			return(null);
		}
	}
	
	cmd = cmd.rtrim();
	// Special case for q() and quit() => use sv.r.quit() instead
	if (cmd.search(/^(?:base::)?q(?:uit)?\s*\(\s*\)$/) > -1)
		return(sv.r.quit());
	
	var res = "";
	sv.r.print(cmd, true, true, sv.socket.partial);
	
	// Do we ask to resize output width?
	if (sv.r.width > -1) {
		// Note, we also escape multiline mode, cf. clear invoked!
		cmd = '<<<esc>>><<<e>>>options(width = ' + sv.r.width + '); ' + cmd;
		// Reset width so that we don't ask change again and again
		sv.r.width = -1;
	} else cmd = '<<<e>>>' + cmd;
	res = sv.socket.rCommand(cmd);
	return(res);
}
// Test: sv.r.eval("ls()");

// Evaluate code in R in a hidden way
sv.r.evalHidden = function (cmd, earlyExit) {
	// If R is not running, do nothing
	if (!sv.r.running) return(null);
	var preCode = "<<<h>>>";
	if (earlyExit) preCode = "<<<H>>>";
	// Evaluate a command in hidden mode (contextual help, calltip, etc.)
	var res = sv.socket.rCommand(preCode + cmd, false);
	return(res);
}
// Tests:
//sv.r.evalHidden("Sys.sleep(5); cat('done\n')");
//sv.r.evalHidden("Sys.sleep(5); cat('done\n')", earlyExit = true);
//sv.r.evalHidden("Sys.sleep(3); cat('done\n');" +
//   " koCmd('alert(\"koCmd is back\");')", earlyExit = true);

// Evaluate R expression and call procfun in Komodo with the result as argument
// - All additional arguments will be passed to procfun,
// - Result will be stored in procfun.value
sv.r.evalCallback = function (cmd, procfun) {
	// If we thing R is not running, we are better to retest here
	if (!sv.r.running) {
// TODO: propose to start R here!
		if (!sv.r.test()) {
			// Indicate R should be started
			ko.statusBar.AddMessage(
			sv.translate("R must be started for this command (R -> Start R)"),
				"SciViews-K", 5000, true);
			return(null);
		}
	}
	
	var res = "";
	// Evaluate a command in hidden mode (contextual help, calltip, etc.)
	// and call 'procfun' at the end of the evaluation
	// Note: with http using RJSONp protocol, this is done automatically!
	// Note2: sv.r.evalCallback() now needs a named function for the http
	// version to work!
	// Treatment is different if we use http or socket
	var args = Array.apply(null, arguments);
	args.splice(0, 1, "<<<h>>>" + cmd, false);
	res = sv.socket.rCommand.apply(sv.socket, args);
	return(res);
}

// Escape R calculation
sv.r.escape = function (cmd) {
	if (cmd === undefined) cmd = "";

	// Since this command is not used very often, one can check R everytime
	// instead of relying on sv.r.running, which could be outdated
	if (!sv.r.test()) return(null);

	// Send an <<<esc>>> sequence that breaks multiline mode
	// Exit partial mode and go back to normal prompt
	sv.cmdout.exitPartial();
	sv.r.print(":> ", false, false, false);
	var res = "";
	sv.socket.partial = false; // Reset this
	res = sv.socket.rCommand('<<<esc>>>' + cmd, false);
	return(res);
}

// Set the current working directory (to current buffer dir, or ask for it)
sv.r.setwd = function (dir, ask, type) {
	// For compatibility with previous versions
	switch (arguments.length) {
	 case 1:
		type = dir;
		dir = null;
		ask = false;
		break;
	 case 2:
		type = dir;
		dir = null;
		break;
	 default:
	}
	var getDirFromR = "";

	if (!dir || (sv.tools.file.exists(dir) == 2)) { // Not there or unspecified
		switch (type) {
		 case "this":
			break;
		 case "session":
			getDirFromR = "getOption(\"R.initdir\")";
			break;
		 case "previous":
			getDirFromR = "if (exists(\".odir\")) .odir else getwd()";
			break;
		 case "init":
			getDirFromR = "getOption(\"R.initdir\")";
			break;
		 case "current":
			getDirFromR = "getwd()";
			ask = true;	// Assume ask is always true in this case
			break;
		 case "file":
			var view = ko.views.manager.currentView;
			if (view) {
				view.setFocus();
				if (!view.koDoc.isUntitled) {
					// If not, look for current file directory
					dir = view.koDoc.file.dirName;
				}
				break;
			} // Fallback: project directory
		 case "project":
		 default:
			dir = "";
			// In Komodo 6, there is the new ko.places API
			if (ko.places === undefined) { // Keep compatibilty with ko5 for now
				// try to set current project dir ar default directory
				var ap = ko.projects.manager.getCurrentProject();
				var kv = ko.views.manager.currentView;
				if (ap != null)
					dir = ko.projects.getDefaultDirectory(ap);
			} else { // ko6 code
				try {
					// TODO: really do this... or use currentPlace all the time?
					var file = ko.places.manager.getSelectedItem().file;
					dir = file.isDirectory? file.path : file.dirName;
				} catch(e) {
					dir = sv.tools.file.pathFromURI(ko.places.manager.currentPlace);
				}
			}
			break;
		}
	}

	var res = "";
	if (getDirFromR) {
		var cmd = "cat(path.expand(" + getDirFromR + "))";
		//ko.statusBar.AddMessage(sv.translate("Asking R for directory..."),
		//	"SciViews-K");
		res = sv.r.evalCallback(cmd, function (curDir) {
			//ko.statusBar.AddMessage("", "SciViews-K");
			if (!curDir) {
				sv.alert(sv.translate("Cannot retrieve directory from R." +
					" Make sure R is running."));
				return(null);
			}
			if (navigator.platform.search(/^Win/) == 0) {
				curDir = curDir.replace(/\//g, '\\');
			}
			return(sv.r.setwd(curDir, ask, "this"));
		});
		return(res);
	}
	
	if (ask || !dir) dir = ko.filepicker.getFolder(dir,
		sv.translate("Choose R working directory"));

	if (dir != null) sv.r.eval(".odir <- setwd(\"" + dir.addslashes() + "\")");
    return(res);
}

// Run current selection or line buffer in R
sv.r.run = function () {
	try {
		var view = ko.views.manager.currentView;
		if (!view) return(false); // No current view, do nothing!
		view.setFocus();

		var text = sv.getTextRange("sel", true);
		if (!text) { // No selection
			var scimoz = view.scimoz;
			var currentLine = scimoz.lineFromPosition(scimoz.currentPos);
			var oText = { value: ''};
			var lineCount =	scimoz.lineCount;
			while (currentLine < lineCount && !(text = oText.value.trim()))
				scimoz.getLine(currentLine++, oText);
			scimoz.gotoLine(currentLine);
			text = oText.value.trim();
		}
		
		if (text) return(sv.r.eval(text));
		return(false);
	} catch(e) { return(e); }
}

// Run current line (or selection) up to position and optionally add line feed
sv.r.runEnter = function (breakLine) {
	try {		
		var view = ko.views.manager.currentView;
		if (!view) return(false); // No current view, do nothing!
		view.setFocus();
		var scimoz = view.scimoz;
		var text = sv.getTextRange("sel", true);
		if (!text) {	// Only proceed if selection is empty
			// Get text from a line and move caret to the eol
			// Do we want to break line here or execute it to the end?
			text = sv.getTextRange(breakLine? "linetobegin" : "line", true);
		}
		ko.commands.doCommand('cmd_newlineExtra');
		var res = sv.r.eval(text);

	} catch(e) { return(e); }
	return(res);
}

// Source the current buffer or some part of it
sv.r.source = function (what) {
	var res = false;
	try {
		var view = ko.views.manager.currentView;
		if (!view) return(false); // No current view, do nothing!
		view.setFocus();
		var scimoz = view.scimoz;
		var doc = view.koDoc; // Was document in pre-Ko7

		var file;
// FIXME: (sometimes?) doc is not defined in ko7!
		if (!doc.isUntitled && doc.file) {
			file = doc.file.path.addslashes();
		} else {
			file = doc.baseName;
		}

		if (!what) what = "all"; // Default value

		// Special case: if "all" and local document is saved,
		// source as the original file
		if (what == "all" && doc.file && doc.file.isLocal &&
			!doc.isUntitled && !doc.isDirty) {
			res = sv.r.eval('source("' + file +  '", encoding = "' +
				view.encoding + '")');
		} else {
			// Save all or part in the temporary file and source that file.
			// After executing, tell R to delete it.
			var code = sv.getTextRange(what);
			if (what == "function") {
				// Old code
				//what += " \"" +
				//	code.match("^.*\\S(?=\\s*(?:=|<-)\\s*function)") + "\"";
				// New code
				var rx = /(([`'"])(.+)\2|([\w\u0100-\uFFFF\.]+))(?=\s*<-\s*function)/;
				var match = code.match(rx);
				what += " \"" + (match? match[3] || match[4] : '') + "\"";
				//	.replace(/^(['"`])(.*)\1/, "$2")
			}
			// Starting from R 2.14, there is a warning if the file does not
			// end with an empty line => add one now!
			code = code + "\n";
			
			// Indicate what is done here
			sv.cmdout.append(':> #source("' + file + '*") # buffer: ' + what);

			var tempFile = sv.tools.file.temp();
			sv.tools.file.write(tempFile, code, 'utf-8', false);
			tempFile = tempFile.addslashes();

			var cmd = 'tryCatch(source("' + tempFile + '", encoding =' +
			' "utf-8"), finally = {unlink("' + tempFile + '")});';

			sv.r.evalCallback(cmd, function (ret) {
				sv.cmdout.append(ret + "\n:>");
			});
		}
	} catch(e) {
		sv.log.exception(e, "Unknown error while sourcing R code in " +
			"sv.r.source():\n\n (" + e + ")", true);
	}
	return(res);
}

// Send whole or a part of the current buffer to R and place cursor at next line
sv.r.send = function (what) {
	//sv.log.debug("sv.r.send " + what);
	var res = false;
	var view = ko.views.manager.currentView;
	if (!view) return(false); // No current view, do nothing!
	view.setFocus();
	var scimoz = view.scimoz;
	
	try {
		if (!what) what = "all"; // Default value

		var cmd = sv.getTextRange(what, what.indexOf("sel") == -1).rtrim();
		if (cmd) {
			// Indent multiline commands
			cmd = cmd.replace(/\r?\n/g, "\n   ")
			res = sv.r.eval(cmd);
		}
		if (what == "line" || what == "linetoend") // || what == "para"
			scimoz.charRight();
	} catch(e) { return(e); }
	return(res);
}

// Get a calltip for a R function
sv.r.calltip = function (code) {
	// If code is not defined, get currently edited code
	if (typeof(code) == "undefined" | code == "")
		code = sv.getTextRange("codefrag");
	var cmd = 'cat(callTip("' + code.replace(/(")/g, "\\$1") +
		'", location = TRUE, description = TRUE, methods = TRUE, width = 80))';
	var res = "";
	res = sv.r.evalCallback(cmd, sv.r.calltip_show);
	return(res);
}

// The callback for sv.r.calltip
// TODO: make private
sv.r.calltip_show = function (tip) {
	if (tip.result !== undefined) tip = tip.result;
	if (tip != "") {
		//ko.statusBar.AddMessage(tip, "SciViews-K", 2000, true);
		var ke = ko.views.manager.currentView.scimoz;
		ke.callTipCancel();
		ke.callTipShow(ke.anchor, tip.replace(/[\r\n]+/g, "\n"));
	}
}

// AutoComplete mechanism for R
// XXX: deprecated??
sv.r.complete = function (code) {
	// If code is not defined, get currently edited code
	if (typeof(code) == "undefined" | code == "")
	code = sv.getTextRange("codefrag");
	code = code.replace(/(")/g, "\\$1");
	// TODO: add and use description too here!
	var cmd = 'completion("' + code +
		'", print = TRUE, types = "scintilla", field.sep = "?")';
	var res = sv.r.evalCallback(cmd, sv.r.complete_show);
	return(res);
}

// The callback for sv.r.complete
// TODO: make private
sv.r.complete_show = function (autoCstring) {
	// In the case of http server, we got a more complex object!
	if (autoCstring.result !== undefined) autoCstring = autoCstring.result;

	var scimoz = ko.views.manager.currentView.scimoz;

	// these should be set only once?:
	scimoz.autoCSeparator = 9;
	scimoz.autoCSetFillUps(" []{}<>/():;%+-*@!\t\n\r=$`");

	var autoCSeparatorChar = String.fromCharCode(scimoz.autoCSeparator);
	autoCstring = autoCstring.replace(/^(.*)[\r\n]+/, "");

	var trigPos = RegExp.$1;

	autoCstring = autoCstring.replace(/\r?\n/g, autoCSeparatorChar);

	// Code below taken from "CodeIntelCompletionUIHandler"
	// TODO: replace this by the same icons as in the object explorer!
	var iface = Components.interfaces.koICodeIntelCompletionUIHandler;
	scimoz.registerImage(iface.ACIID_FUNCTION, ko.markers.
	getPixmap("chrome://komodo/skin/images/ac_function.xpm"));
	scimoz.registerImage(iface.ACIID_VARIABLE, ko.markers.
	getPixmap("chrome://komodo/skin/images/ac_variable.xpm"));
	scimoz.registerImage(iface.ACIID_XML_ATTRIBUTE, ko.markers.
	getPixmap("chrome://komodo/skin/images/ac_xml_attribute.xpm"));
	scimoz.registerImage(iface.ACIID_NAMESPACE, ko.markers.
	getPixmap("chrome://komodo/skin/images/ac_namespace.xpm"));
	scimoz.registerImage(iface.ACIID_KEYWORD, ko.markers.
	getPixmap("chrome://komodo/skin/images/ac_interface.xpm"));
	scimoz.autoCChooseSingle = true;
	scimoz.autoCShow(trigPos, autoCstring);
}

// Display R objects in different ways
// TODO: allow custom methods + arguments + forcevisible + affect to var
// TODO: this duplicates rObjectsTree.do(), so do something with it
sv.r.display = function (topic, what) {
	var res = false;
	if (typeof(topic) == "undefined" | topic == "")
		topic = sv.getTextRange("word");
	if (topic == "") {
		//sv.alert("Nothing is selected!");
	} else {
		// Display data in different ways, depending on what
		switch(what) {
		 case "names":
			res = sv.r.eval("names(" + topic + ")");
			break;
		 case "structure":
			res = sv.r.eval("str(" + topic + ")");
			break;
		 case "summary":
			res = sv.r.eval("summary(" + topic + ")");
			break;
		 case "plot":
			res = sv.r.eval("plot(" + topic + ")");
			break;
		 case "content":
		 case "print":
		 case "show":
		 default:
			res = sv.r.eval(topic);
		}
	}
	return(res);
}

// Get help in R (HTML format)
sv.r.help = function (topic, pkg) {
	var res = false;

	if (typeof(topic) == "undefined" || topic == "")
		topic = sv.getTextRange("word");

	if (topic == "")
		ko.statusBar.AddMessage(sv.translate("Selection is empty..."),
			"SciViews-K", 1000);

	if (!topic && !pkg) {
		return(false);
	} else {
		var cmd = "";
		cmd += pkg ? ' package = "' + pkg + '", ' : "";
		cmd += topic ? ' topic = "' + topic + '", ' : "";
		cmd = 'cat(getHelpURL(help(' + cmd + ' help_type = "html")))';
		res = sv.r.evalCallback(cmd, sv.command.openHelp);
		ko.statusBar.AddMessage(sv.translate("R help asked for \"%S\"", topic),
			"SciViews-K", 5000, true);
	}
	return(res);
}

// Run the example for selected item
sv.r.example = function (topic) {
	var res = false;
	if (typeof(topic) == "undefined" | topic == "")
		topic = sv.getTextRange("word");
	if (topic == "") {
		ko.statusBar.AddMessage(sv.translate("Selection is empty..."),
			"SciViews-K", 1000, false);
	} else {
		res = sv.r.eval("example(" + topic + ")");
		ko.statusBar.AddMessage(sv.translate("R example run for \"%S\"", topic),
			"SciViews-K", 5000, true);
	}
	return(res);
}

// Search R help for topic
sv.r.search = function (topic, internal) {
	var res = false;
	if (!topic) {
		topic = sv.getTextRange("word");
		// Ask for the search string
		topic = ko.dialogs.prompt(sv.translate("Search R objects using a " +
			"regular expression (e.g. '^log' for objects starting with 'log')"),
			sv.translate("Pattern"), topic,
			sv.translate("Search R help"), "okRsearchPattern");
	}
	if (topic) {
		// Get list of matching items and evaluate it with sv.r.search_select()
		var cmd = 'cat(apropos("' + topic + '"), sep = "' + sv.r.sep + '")';
		res = sv.r.evalCallback(cmd, sv.r.search_select);
		ko.statusBar.AddMessage(sv.translate("Searching_R_help_for", topic),
			"SciViews-K", 5000, true);
	}
	return(res);
}

// The callback for sv.r.search
// TODO: make private
sv.r.search_select = function (topics) {
	if (topics.result !== undefined) topics = topics.result;

	ko.statusBar.AddMessage("", "SciViews-K");
	var res = false;
	if (sv.tools.strings.removeLastCRLF(topics) == "") {
		ko.statusBar.AddMessage(sv.translate("R help for %S not found.",
			topics), "SciViews-K");
	} else {	// Something is returned
		var items = topics.split(sv.r.sep);
		if (items.length == 1) {
			// Only one item, show help for it
			res = sv.r.help(sv.tools.strings.removeLastCRLF(topics));
		} else {
			// Select the item you want in the list
			var topic = ko.dialogs.selectFromList("R help topics",
				"Select a topic:", items, "one");
			if (topic != null)
			res = sv.r.help(sv.tools.strings.removeLastCRLF(topic.join("")));
		}
	}
	return(res);
}

// Search R web sites for topic
sv.r.siteSearch = function (topic, idxname) {
	var res = false;
	if (!topic) topic = sv.getTextRange("word");
	topic = topic.trim();

	if (!idxname) {
		idxname = ["Rhelp08", "functions", "views"];
	} else {
		var idxsep = "&idxname=";
		var idxnameAllow = ["Rhelp08", "Rhelp01", "Rhelp02", "functions",
			"views", "R-devel", "R-sig-mixed-models"];

		for (var i in idxname)
			if (idxnameAllow.indexOf(idxname[i]) == -1) idxname.splice(i, 1);
	}

	if (!topic) {
		ko.statusBar.AddMessage(sv.translate("Selection is empty..."),
			"SciViews-K", 1000, false);
		return;
	}
	idxname = idxsep + idxname.join(idxsep);

	// TODO: make it a pref
	var url = "http://search.r-project.org/cgi-bin/namazu.cgi?query=" + topic +
		"&max=20&result=normal&sort=score" + idxname;
	sv.command.openHelp(url);
}

// Display some text from a file
sv.r.pager = function (file, title, cleanUp) {
	var rSearchUrl = "chrome://sciviewsk/content/rsearch.html";
	var content = sv.tools.file.read(file);
	content = content.replace(/([\w\.\-]+)::([\w\.\-\[]+)/ig,
	'<a href="' + rSearchUrl + '?$1::$2">$1::$2</a>');
	content = "<pre id=\"rPagerTextContent\" title=\"" + title + "\">" +
		content + "</div>";
	//var charset = sv.socket.charset;
	sv.tools.file.write(file, content, "utf-8");
	sv.command.openHelp(rSearchUrl + "?file:" + file);
	// Do we clean up the file after use?
	if (cleanUp || cleanUp === undefined)
		window.setTimeout("try { sv.tools.file.getfile('" + file +
			"').remove(false); } catch(e) {}", 10000);
}

// List available datasets ("loaded" or not defined = loaded packages, or "all")
// TODO: display results in RHelp window
sv.r.dataList = function (which) {
	var res = false;
	if (typeof(which) == "undefined" | which == "" | which == "loaded") {
		res = sv.r.eval('data()');
	} else {	// which == "all"
		res = sv.r.eval('data(package = .packages(all.available = TRUE))');
	}
	return(res);
}

// Load one R dataset
sv.r.data = function () {
	var res = false;
	// Get list of all datasets
	var cmd = '.tmp <- data();' +
		'cat(paste(.tmp$results[, "Item"], .tmp$results[, "Title"],' +
		' sep = "\t  -  "), sep = "\n"); rm(.tmp)';
	res = sv.r.evalCallback(cmd, sv.r.data_select);
	ko.statusBar.AddMessage(
		sv.translate("Listing available R datasets... please wait"),
		"SciViews-K", 20000, true);
	return(res);
}

// The callback for sv.r.data
sv.r.data_select = function (data) {
	if (data.result !== undefined) data = data.result;

	ko.statusBar.AddMessage("", "SciViews-K");
	var res = false;
	if (sv.tools.strings.removeLastCRLF(data) == "") {
		sv.alert("Problem retrieving the list of R datasets!");
	} else {	// Something is returned
		var items = data.split("\n");
		// Select the item you want in the list
		var item = ko.dialogs.selectFromList("R Datasets",
			"Select one R dataset:", items, "one");
		if (item != null) {
			// We need to eliminate the definition
			var dat = item[0].split("\t");
			var datname = dat[0];
			// Sometimes, we got 'item (data)' => retrieve 'data' in this case
			datname = datname.replace(/^[a-zA-Z0-9._ ]*[(]/, "");
			datname = datname.replace(/[)]$/, "");
			var cmd = 'data(' + datname + '); cat("' + datname +
				'"); invisible(try(guiRefresh(force = TRUE), silent = TRUE))';
			res = sv.r.evalCallback(cmd, sv.r.obj_select_dataframe);
		}
	}
	return(res);
}

// Open a menu with all installed vignettes in the default web browser
sv.r.browseVignettes = function () {
	var res = sv.r.eval('browseVignettes()');
	return(res);
}

// Save the content of the workspace in a file
sv.r.saveWorkspace = function (file, title) {
	// Ask for the filename if not provided
	if (typeof(file) == "undefined") {
		if (typeof(title) == "undefined") {
			title = 'Save the R workspace in a file';
		}
		file = ko.filepicker.saveFile("", ".RData", title);
		if (file == null) return;	// User clicked cancel
	}
	sv.r.eval('save.image("' + file + '")');
}

// Load the content of a .RData file into the workspace, or attach it
sv.r.loadWorkspace = function (file, attach, callback, param) {
	// Ask for the filename if not provided
	if (!file) {
		file = sv.fileOpen("", ".RData",
			sv.translate("Browse for R workspace file"),
		    [sv.translate("R workspace") + " (*.RData)|*.RData"], true);
	} else if (typeof(file == "string")) {
		file = file.split(/[;,]/);
	}
	if (!file || !file.length) return;

	var load = attach ? "attach" : "load";
	var cmd = [];
	for (var i in file)
	cmd[i] = load + "(\"" + (new String(file[i])).addslashes() + "\")";
	cmd = cmd.join("\n");
	// Note: callback is currently not available with the HTTP server!
	if (callback) {
		sv.r.evalCallback(cmd, callback, param);
	} else {
		sv.r.eval(cmd);
	}
}

// Save the history in a file
sv.r.saveHistory = function (file, title) {
	// Ask for the filename if not provided
	if (typeof(file) == "undefined") {
		if (typeof(title) == "undefined")
		title = 'Save the command history in a file';
		file = ko.filepicker.saveFile("", ".Rhistory", title);
		if (file == null) return;	// User clicked cancel
	}
	sv.r.eval('savehistory("' + file.addslashes() + '")');
}

// Load the history from a file
sv.r.loadHistory = function (file, title) {
	// Ask for the filename if not provided
	if (typeof(file) == "undefined") {
		if (typeof(title) == "undefined")
		file = sv.fileOpen("", ".Rhistory",
			sv.translate("Load an R history from a file"),
		    [sv.translate("R history") + " (*.Rhistory)|*.Rhistory"], false);
		if (!file || !file.length) return;	// User clicked cancel
	}
	sv.r.eval('loadhistory("' + file.addslashes() + '")');
}

// There is also dev.copy2pdf() copy2eps() + savePlot windows
// and X11(type = "Cairo")
sv.r.saveGraph = function (type, file, title, height, width, method) {
	// Default values for the arguments
	if (type === undefined) type = "png256";
	if (height === undefined) height = 'dev.size()[2]';
	if (width === undefined) width = 'dev.size()[1]';
	if (method === undefined) method = "pdf";

	// Get the file extension according to type
	var ext = type.substring(0, 4);
	if (ext != "pgnm" & ext != "tiff" & ext != "jpeg")
		ext = ext.substring(0, 3);
	if (ext.substring(0, 2) == "ps") ext = "ps";
	if (ext == "jpeg") ext = "jpg";

	// Ask for the filename if not provided
	if (typeof(file) == "undefined") {
		if (typeof(title) == "undefined")
			title = 'Save the graph as "' + type + '"';
		file = ko.filepicker.saveFile("", "Rplot." + ext, title);
		if (file == null) return;	// User clicked cancel
	}
	// Save the current device in R using dev2bitmap()... needs gostscript!
	sv.r.eval('dev2bitmap("' + file.addslashes() + '", type = "' + type +
		'", height = ' + height + ', width = ' + width + ', method = "' +
		method + '")');
}

//  TODO: (Suggestion) Replace this mechanism (default data.frame, lm..., etc) with
//  automatic selection of all objects highlighted in the object browser.
//  To do that svMisc::completion should list also contents of these objects.
//  Then all sv.r.obj* functions would not be needed at all.
// Select one object of class 'objClass' from .GlobalEnv
sv.r.obj = function (objClass) {
	// By default, we look at data.frames in .GlobalEnv
	if (objClass === undefined) objClass = "data.frame";
	var res = false;
	// Get list of all objects with such a specification loaded in R
	// If there is a comment attribute, also get it
	var cmd = 'cat("' + objClass + '\n");' +
		'cat(unlist(apply(matrix(objects(pos = 1)), 1, ' +
		'function(x) try(if (inherits(get(x), "' + objClass +
		'")) paste(x, "\t     ",  sub("[\t\n\r].*$", "", ' +
		'comment(get(x))), sep = ""), silent = TRUE))), sep = ",,,")';
	res = sv.r.evalCallback(cmd, sv.r.obj_select);
	ko.statusBar.AddMessage("Listing available '" + objClass +
		"'... please wait", "SciViews-K", 20000, true);
	return(res);
}

// The callback for sv.r.obj
sv.r.obj_select = function (data) {
	ko.statusBar.AddMessage("", "SciViews-K");
	var res = false;
	if (sv.tools.strings.removeLastCRLF(data) == "") {
		sv.alert("Select R objects", "Problem retrieving the list of objects!");
	} else {	// Something is returned
		var res = data.split("\n");
		// First item is objClass, second one is the list of objects
		var objclass = sv.tools.strings.removeLastCRLF(res[0]);
		if (typeof(res[1]) == "undefined") {
			sv.alert("Select R objects", "No object of class '" + objclass +
				"' currently loaded in R memory!");
		} else {	// At least one object, display a selection list
			var items = res[1].split(",,,");
			// TODO: highlight current active object...
			// Select the item you want in the list
			var item = ko.dialogs.selectFromList("Currently loaded '" +
				objclass + "' objects in R",
				"Select one '" + objclass + "' to make it active in Komodo:",
				items, "one");
			if (item != null) {
				// Update default object
				// We need to eliminate the comment first
				var obj = item[0].split("\t");
				var objname = obj[0];
				// The rest of the treatment depends on objClass
				if (objclass == "data.frame") {
					sv.r.obj_select_dataframe(objname);
				} else if (objclass == "lm") {
					sv.r.obj_select_lm(objname);
				} else {
					// Not implemented yet for other objects!
					//alert("Update of MRU lists not implemented yet for " +
					//	"other objects than 'data.frame'");
					// Temporary code: at least set pref value
					sv.prefs.setPref("r.active." + objclass, objname, true);
				}
			}
		}
	}
	return(res);
}

// Display which objects (data frame and lm model, as for Rcmdr) are currently
// active in the Komodo statusbar
sv.r.obj_message = function () {
	// Get the directory of current session
	var ses = sv.prefs.getPref("sciviews.session.dir", "~");
	ses = sv.tools.strings.filename(ses);
	// Get currently active data frame
	var df = sv.prefs.getPref("r.active.data.frame", "<none>");
	if (df == "<df>") df = "<none>";
	// Get currently active 'lm' object
	var lm = sv.prefs.getPref("r.active.lm", "<none>")
	if (lm == "<lm>") lm = "<none>";
	ko.statusBar.AddMessage(sv.translate(
		"R session: %S  data: %S linear model: %S", ses, df, lm), "SciViews-K");
}

// Select one data frame
sv.r.obj_select_dataframe = function (objname) {
	// Refresh the default val and list of vars
	var res = false;
	var cmd = '.active.data.frame <- list(object = "' + objname +
		'", fun = function () {\n' +
		'	if (exists(.active.data.frame$object, envir = .GlobalEnv)) {\n' +
		'		obj <- get(.active.data.frame$object, envir = .GlobalEnv)\n' +
		'		res <- paste(c(.active.data.frame$object, names(obj)), "\t",\n' +
		'		c(class(obj), sapply(obj, class)), "\n", sep = "")\n' +
		'		return(.active.data.frame$cache <<- res)\n' +
		'	} else return(.active.data.frame$cache <<- NULL)\n' +
		'}, cache = "")\n' +
		'cat(.active.data.frame$fun(), sep = "")';
	res = sv.r.evalCallback(cmd, sv.r.obj_refresh_dataframe);
}

// Callback for sv.r.obj_select_dataframe to refresh the associated MRUs
sv.r.obj_refresh_dataframe = function (data) {
	ko.statusBar.AddMessage("", "SciViews-K");
	// If we got nothing, then the object does not exists any more... clear MRUs
	if (data == "<<<data>>>") {
		//var oldobj = sv.prefs.getPref("r.active.data.frame", "");
		sv.prefs.setPref("r.active.data.frame", "<df>", true); // Default
		sv.prefs.setPref("r.active.data.frame.d", "<df>$", true);
		sv.prefs.mru("var", true, "");
		sv.prefs.mru("var2", true, "");
		sv.prefs.mru("x", true, "");
		sv.prefs.mru("x2", true, "");
		sv.prefs.mru("y", true, "");
		sv.prefs.mru("factor", true, "");
		sv.prefs.mru("factor2", true, "");
		sv.prefs.mru("blockFactor", true, "");
		// Update message in the statusbar
		sv.r.obj_message();
		return(false);
	}

	var items = data.split("\n");
	// First item contains the name of the active object and its class
	var item = sv.tools.strings.removeLastCRLF(items[0]).split("\t");
	var objname = item[0];
	var objclass = item[1];
	// Make sure r.active.data.frame pref is set to obj
	sv.prefs.setPref("r.active.data.frame", objname, true);
	sv.prefs.setPref("r.active.data.frame.d", objname + "$", true);
	items.shift(); // Eliminate first item from the array
	// Create three lists: vars collects all var names, nums and facts do so for
	// only numeric and factor variables (separate items by "|")
	var vars = "", nums = "", facts = "";
	for (i in items) {
		item = sv.tools.strings.removeLastCRLF(items[i]).split("\t");
		// Fill the various lists according to the nature of item
		vars = vars + "|" + item[0];
		if (item[1] == "numeric" | item[1] == "integer")
			nums = nums + "|" + item[0];
		if (item[1] == "factor") facts = facts + "|" + item[0];
	}
	// Eliminate first "|"
	vars = vars.substr(1);
	nums = nums.substr(1);
	facts = facts.substr(1);
	// Add these lists in various MRUs
	// vars => var and var2
	sv.prefs.mru("var", true, vars, "|");
	sv.prefs.mru("var2", true, vars, "|");
	// nums => x, x2, y
	sv.prefs.mru("x", true, nums, "|");
	sv.prefs.mru("x2", true, nums, "|");
	sv.prefs.mru("y", true, nums, "|");
	// facts => factor, factor2, blockFactor
	sv.prefs.mru("factor", true, facts, "|");
	sv.prefs.mru("factor2", true, facts, "|");
	sv.prefs.mru("blockFactor", true, facts, "|");
	// Update message in the statusbar
	sv.r.obj_message();
	return(true);
}

// Select one lm object
sv.r.obj_select_lm = function (objname) {
	// Refresh the default lm object in R session
	var res = false;
	var cmd = '.active.lm <- list(object = "' + objname +
		'", fun = function () {\n' +
		'	if (exists(.active.lm$object, envir = .GlobalEnv)) {\n' +
		'		obj <- get(.active.lm$object, envir = .GlobalEnv)\n' +
		'		res <- paste(.active.lm$object, class(obj), sep = "\t")\n' +
		'		return(.active.lm$cache <<- res)\n' +
		'	} else return(.active.lm$cache <<- NULL)\n' +
		'}, cache = "")\n' +
		'cat(.active.lm$fun(), sep = "")';
	res = sv.r.evalCallback(cmd, sv.r.obj_refresh_lm);
}

// Callback for sv.r.obj_select to refresh the MRUs associated with lm objects
sv.r.obj_refresh_lm = function (data) {
	ko.statusBar.AddMessage("", "SciViews-K");
	// If we got nothing, then the object does not exists any more... clear MRUs
	if (data == "<<<data>>>") {
		//var oldobj = sv.prefs.getPref("r.active.lm", "");
		sv.prefs.setPref("r.active.lm", "<lm>", true); // Default value
		// Update message in the statusbar
		sv.r.obj_message();
		return(false);
	}

	var items = data.split("\n");
	// First item contains the name of the active object and its class
	var item = sv.tools.strings.removeLastCRLF(items[0]).split("\t");
	var objname = item[0];
	var objclass = item[1];
	// Make sure r.active.data.frame pref is set to obj
	sv.prefs.setPref("r.active.lm", objname, true);
	// Update message in the statusbar
	sv.r.obj_message();
	return(true);
}

sv.r.saveDataFrame = function _saveDataFrame(name, fileName, objName, dec,
sep) {
	if (!dec) dec = sv.prefs.getPref("r.csv.dec");
	if (!sep) sep = sv.prefs.getPref("r.csv.sep");

	if (!fileName) {
		var filterIndex;
		switch(sep) {
		 case '\\t':
			filterIndex = 1;
			break;
		 case ';':
		 case ',':
			filterIndex = 0;
			break;
		 case ' ':
			filterIndex = 2;
			break;
		 default:
			filterIndex = 3;
		}

		var dir = sv.prefs.getPref("sciviews.session.dir");

		oFilterIdx = {value : filterIndex};
		fileName = sv.fileOpen(dir, objName, "",
			["Comma separated values (*.csv)|*.csv",
			"Tab delimited (*.txt)|*.txt",
			"Whitespace delimited values (*.txt)|*.txt"
			], false, true, oFilterIdx);
		sep = [",", "\\t", " "][oFilterIdx.value];
		if (dec == "," && sep == ",") dec = ";";
	}

	var cmd = 'write.table(' + name + ', file="' +
		sv.tools.strings.addslashes(fileName) +
		'", dec="' + dec + '", sep="' + sep + '", col.names=NA)';
	sv.r.eval(cmd);
	return(cmd);
}

// Refresh MRU lists associated with the current session
sv.r.refreshSession = function () {
	var i;
	// Refresh lists of dataset
	var items = sv.tools.file.list(sv.prefs.getPref("sciviews.data.localdir"),
		/\.[cC][sS][vV]$/, true);
	sv.prefs.mru("datafile", true, items);
	ko.mru.reset("datafile_mru");
	for (i = items.length - 1; i >= 0; i--) {
		if (items[i] != "") ko.mru.add("datafile_mru", items[i], true);
	}

	// Refresh lists of scripts
	items = sv.tools.file.list(sv.prefs.getPref("sciviews.scripts.localdir"),
		/\.[rR]$/, true);
	sv.prefs.mru("scriptfile", true, items);
	ko.mru.reset("scriptfile_mru");
	for (i = items.length - 1; i >= 0; i--) {
		if (items[i] != "") ko.mru.add("scriptfile_mru", items[i], true);
	}

	// Refresh lists of reports
	items = sv.tools.file.list(sv.prefs.getPref("sciviews.reports.localdir"),
		/\.[oO][dD][tT]$/, true);
	sv.prefs.mru("reportfile", true, items);
	ko.mru.reset("reportfile_mru");
	for (i = items.length - 1; i >= 0; i--) {
		if (items[i] != "") ko.mru.add("reportfile_mru", items[i], true);
	}
}

// Initialize R session preferences in Komodo
// use sv.r.setSession() except at startup!
sv.r.initSession = function (dir, datadir, scriptdir, reportdir) {
	// Initialize the various arguments
	if (typeof(dir) == "undefined")
		dir = sv.prefs.getPref("sciviews.session.dir", "~");
	if (typeof(datadir) == "undefined")
		datadir = sv.prefs.getPref("sciviews.session.data", "");
	if (typeof(scriptdir) == "undefined")
		scriptdir = sv.prefs.getPref("sciviews.session.scripts", "");
	if (typeof(reportdir) == "undefined")
		reportdir = sv.prefs.getPref("sciviews.session.reports", "");

	var localdir = sv.tools.file.path(dir);
	var sep = "/";

	// Refresh preferences
	sv.prefs.setPref("sciviews.session.dir", dir, true);
	sv.prefs.setPref("sciviews.session.localdir", localdir, true);
	// Subdirectories for data, reports and scripts
	sv.prefs.setPref("sciviews.session.data", datadir, true);
	sv.prefs.setPref("sciviews.session.scripts", scriptdir, true);
	sv.prefs.setPref("sciviews.session.reports", reportdir, true);
	// Combination of these to give access to respective dirs
	if (datadir == "") {
		sv.prefs.setPref("sciviews.data.dir", dir, true);
		sv.prefs.setPref("sciviews.data.localdir", localdir, true);
	} else {
		sv.prefs.setPref("sciviews.data.dir", dir + sep + datadir, true);
		sv.prefs.setPref("sciviews.data.localdir",
			sv.tools.file.path(localdir, datadir), true);
	}
	if (scriptdir == "") {
		sv.prefs.setPref("sciviews.scripts.dir", dir, true);
		sv.prefs.setPref("sciviews.scripts.localdir", localdir, true);
	} else {
		sv.prefs.setPref("sciviews.scripts.dir", dir + sep + scriptdir, true);
		sv.prefs.setPref("sciviews.scripts.localdir",
			sv.tools.file.path(localdir, scriptdir), true);
	}
	if (reportdir == "") {
		sv.prefs.setPref("sciviews.reports.dir", dir, true);
		sv.prefs.setPref("sciviews.reports.localdir", localdir, true);
	} else {
		sv.prefs.setPref("sciviews.reports.dir", dir + sep + reportdir, true);
		sv.prefs.setPref("sciviews.reports.localdir",
			sv.tools.file.path(localdir, reportdir), true);
	}

	var DIRECTORY_TYPE = Components.interfaces.nsIFile.DIRECTORY_TYPE;

	// Look if the session directory exists, or create it
	var file = sv.tools.file.getfile(localdir);

	if (!file || !file.exists() || !file.isDirectory()) {
		sv.log.debug( "Creating session directory... " );
		try {
			file.create(DIRECTORY_TYPE, 511);
		} catch(e) {
			// XXX
			sv.log.warn("sv.r.initSession: " + e + "\nfile.create " + file.path);
		}
	}
	// ... also make sure that Data, Script and Report subdirs exist
	var subdirs = [datadir, scriptdir, reportdir];
    for (var i in subdirs) {
		if (subdirs[i] != "") {
            var file = sv.tools.file.getfile(sv.tools.file.path(dir,
				subdirs[i]));
            // TODO: check for error and issue a message if file is not a dir
			if (!file.exists() || !file.isDirectory())
				try {
					file.create(DIRECTORY_TYPE, 511);
				} catch(e) {
					// XXX
					sv.log.warn("sv.r.initSession: " + e + "\nfile.create " +
						file.path);
				}
            delete(file);
        }
	}
	// refresh lists of data, scripts and reports found in the session
	sv.r.refreshSession();
	return(dir);
}

//TODO: Allow also for dirs outside Home directory (useful on windows)
// Set a R session dir and corresponding dir preferences both in R and Komodo
sv.r.setSession = function (dir, datadir, scriptdir, reportdir, saveOld,
loadNew) {
	// Set defaults for saveOld and loadNew
	if (saveOld === undefined) saveOld = true;
	if (loadNew === undefined) loadNew = true;

	// cmd is the command executed in R to switch session (done asynchronously)
	var cmd = "";

	// If dir is the same as current session dir, do nothing
	if (typeof(dir) != "undefined" && sv.tools.file.path(dir) ==
		sv.tools.file.path(sv.prefs.getPref("sciviews.session.dir", "")))
		return(false);

	// Before switching to the new session directory, close current one
	// if R is running
	if (saveOld) {
		// Save .RData & .Rhistory in the the session directory and clean WS
		// We need also to restore .required variable (only if it exists)
		cmd += 'if (exists(".required")) assignTemp(".required", .required)\n' +
			'if(existsTemp(".Last.sys", "function")) TempEnv()$.Last.sys()\n' +
			'save.image()\nsavehistory()\nrm(list = ls())\n' +
			'.required <- getTemp(".required")\n';
	} else {
		// Clear workspace (hint, we don't clear hidden objects!)
		cmd += 'rm(list = ls())\n.required <- getTemp(".required")'
	}
	// TODO: possibly close the associated Komodo project

	// Initialize the session
	dir = sv.r.initSession(dir, datadir, scriptdir, reportdir);

	// Switch to the new session directory in R
	cmd += 'setwd("' + dir.addslashes() + '")\noptions(R.initdir = "' +
	dir.addslashes() + '")\n';

	var svFile = sv.tools.file;

	// Do we load .RData and .Rhistory?
	// TODO: loadhistory APPENDS a history. Make R clear the current history first.
	// Note: there seems to be no way to clear history without restarting R!
	if (loadNew) {
		cmd += 'if (file.exists(".RData")) load(".RData");\n' +
			'if (file.exists(".Rhistory")) loadhistory();\n';

		// Look for .Rprofile, in current, then in user directory
		// (where else R looks for it?). If it exists, source the first one.
		var Rprofile = [
			svFile.path(sv.prefs.getPref("sciviews.session.dir", "~"),
				".Rprofile"),
			svFile.path("~", ".Rprofile")
		]

		for (i in Rprofile) {
			if (svFile.exists(Rprofile[i])) {
				cmd += 'source("' + (Rprofile[i]).addslashes() + '");\n';
				break;
			}
		}
	}

	// Execute the command in R (TODO: check for possible error here!)
	// TODO: run first in R; make dirs in R; then change in Komodo!
	sv.r.evalCallback(cmd, function(data) {
		sv.cmdout.append(data);

		// Indicate everything is fine
		ko.statusBar.AddMessage(sv.translate("R session directory set to '%S'",
			dir), "SciViews-K", 20000, true);
		// Break possible partial multiline command in R from previous session
		// and indicate that we are in a new session now in the R console
		// TODO: Breaking should be done *before* the last command
		// TODO: report if we load something or not
		sv.r.evalCallback('cat("Session directory is now", dQuote("' +
			dir.addslashes() + '"), "\\n", file = stderr())', null);
		// Refresh active objects support and object explorer, ...
		// KB: on Win, Komodo socket server gets stuck constantly,
		// and below causes problems. So temporarily commented out
		sv.r.evalHidden("try(guiRefresh(force = TRUE), silent = TRUE)");
	});
	// TODO: possibly open the Komodo project associated with this session
	return(true);
}

// Switch to another R session (create it if it does not exists yet)
sv.r.switchSession = function (inDoc) {
	var baseDir = "";
	var sessionDir = "";
	// Base directory is different on Linux/Mac OS X and Windows
	if (navigator.platform.indexOf("Win") == 0) {
		baseDir = "~";
	} else {
		baseDir = "~/Documents";
	}
	if (inDoc) {
		// Ask for the session subdirectory
		var Session = "SciViews R Session"
		Session = ko.dialogs.prompt(sv.translate("Session in my documents " +
			"(use '/' for subdirs, like in 'dir/session')"),
		sv.translate("Session"), Session,
		sv.translate("Switch to R session"), "okRsession");
		if (Session != null & Session != "") {
			// Make sure that Session does not start with /, or ./, or ../
			Session = Session.replace(/\^.{0,2}\//, "");
			// Construct session dir
			sessionDir = baseDir + "/" + Session;
		} else sessionDir = "";
	} else {
		// Ask for the session path
		sessionDir = ko.filepicker
			.getFolder(baseDir, sv.translate("Choose session directory"));
	}
	if (sessionDir != null & sessionDir != "") {
		// Subdirectories for data, scripts and reports
		var datadir = "";
		var scriptdir = "";
		var reportdir = "";
		var cfg = "";
		var cfgfile = sv.tools.file.path(sessionDir, ".svData");
		var filefound = false;
		// Look if this directory already exists and contains a .svData file
		if (sv.tools.file.exists(sessionDir) == 2 &
			sv.tools.file.exists(cfgfile) == 1) {
			// Try reading .svData file
			try {
				cfg = sv.tools.file.read(cfgfile, "utf-8");
				filefound = true;
				// Actualize values for datadir, scriptdir and reportdir
				cfg = cfg.split("\n");
				var key, value;
				for (i in cfg) {
					key = cfg[i].split("=");
					if (key[0].trim() == "datadir") datadir = key[1].trim();
					if (key[0].trim() == "scriptdir") scriptdir = key[1].trim();
					if (key[0].trim() == "reportdir") reportdir = key[1].trim();
				}
			} catch (e) { }
		}
		// If no .svData file found, ask for respective directories
		if (!filefound) {
			datadir = ko.dialogs.prompt(
				sv.translate("Subdirectory for datasets (nothing for none):"),
				"", "data", sv.translate("R session configuration"),
				"okRsesData");
			if (datadir == null) return(false);
			scriptdir = ko.dialogs.prompt(
				sv.translate("Subdirectory for R scripts (nothing for none):"),
				"", "R", sv.translate("R session configuration"),
				"okRsesScript");
			if (scriptdir == null) return(false);
			reportdir = ko.dialogs.prompt(
				sv.translate("Subdirectory for reports (nothing for none):"),
				"", "doc", sv.translate("R session configuration"),
				"okRsesReport");
			if (reportdir == null) return(false);
		}
		// Now create or switch to this session directory
		sv.r.setSession(sessionDir, datadir, scriptdir, reportdir);
		// If there were no .svData file, create it now
		if (!filefound) {
			// Save these informations to the .svData file in the session dir
			sv.tools.file.write(cfgfile, "datadir=" + datadir + "\nscriptdir=" +
				scriptdir + "\nreportdir=" + reportdir, "utf-8", false);
		}
		return(true);
	}
	return(false);
}

// Show the session directory in the file explorer, finder, nautilus, ...
// TODO: Show session directory in Places instead (this is already done in
// session manager)
sv.r.exploreSession = function () {
	var dataDir = sv.prefs.getPref("sciviews.session.localdir", "~");
	var file = Components.classes["@mozilla.org/file/local;1"]
		.createInstance(Components.interfaces.nsILocalFile);
	file.initWithPath(dataDir);
	if (file.exists() == true) {
		try {
			file.reveal();
		} catch(e) { // On Linux, this does not work...
			// First try nautilus, and then, try konqueror
			try {
				ko.run.runEncodedCommand(window,
					'nautilus "' + file.path + '" & ');
			} catch(e) {
				ko.run.runEncodedCommand(window,
					'konqueror --profile filemanagement "' + file.path
					+ '" & ');
			}
		}
	}
}

// Reload .RData and .Rhistory files from session directory
sv.r.reloadSession = function () {
	// Ask for confirmation first
	if (ko.dialogs.okCancel("Are you sure you want to delete all objects " +
		"and reload them from disk?", "OK", "You are about to delete all " +
		"objects currently in R memory, and reload the initial content from " +
		"disk (.RData and .Rhistory files)...", "Reload session") == "OK") {
		// Switch temporarily to the session directory and try loading
		// .RData and Rhistory files
		var dir = sv.prefs.getPref("sciviews.session.dir", "");
		var cmd = 'rm(list = ls(pattern = "[.]active[.]", all.names = TRUE))\n' +
			'rm(list = ls()); .savdir. <- setwd("' + dir + '")\n' +
			'if (file.exists(".RData")) load(".RData")\n' +
			'if (file.exists(".Rhistory")) loadhistory()\n' +
			'setwd(.savdir.); rm(.savdir.)\n' +
			'try(guiRefresh(force = TRUE), silent = TRUE)';
		sv.r.evalHidden(cmd);
	}
}

// Clear .RData and .Rhistory files from session directory
sv.r.clearSession = function () {
	// Ask for confirmation first
	if (ko.dialogs.okCancel("Are you sure you want to delete .RData and " +
		".Rhistory files from disk?", "OK", "You are about to delete the data" +
		" saved in .RData and the command history saved in .Rhistory for the " +
		"current session...", "Clear session") == "OK") {
		// Delete .RData and Rhistory files
		var dir = sv.prefs.getPref("sciviews.session.dir", "");
		var cmd = '.savdir. <- setwd("' + dir + '")\n' +
			'unlink(".RData"); unlink(".Rhistory")\n' +
			'setwd(.savdir.); rm(.savdir.)';
		sv.r.evalHidden(cmd);
	}
}

// Quit R
sv.r.quit = function (save) {
	if (typeof(save) == "undefined") {
		// Ask for saving or not
		var response = ko.dialogs.customButtons("Do you want to save the" +
			" workspace (.RData) and the command history (.Rhistory) in" +
			" the session directory first?", ["Yes", "No", "Cancel"], "No",
			null, "Exiting R");
		if (response == "Cancel") return;
	} else response = save ? "yes" : "no";
	// Quit R
	// In R >= 2.11, R.app 1.33 q() is not usable any more... one has to
	// be more explicit with base::q()
	sv.r.evalHidden('base::q("' + response.toLowerCase() + '")');
	// Clear the R-relative statusbar message
	ko.statusBar.AddMessage("", "SciViews-K");
	// Clear the objects browser
	sv.robjects.clearPackageList();
	// TODO: from SciViews-K-dev... adapt here?
	//setTimeout(function() sv.command.updateRStatus(
	//	sv.rconn.testRAvailability()), 1000);
}

// Create a translation (.pot) file for a project
sv.r.kpf2pot = function (kpfFile) {
	try {
		// Ask for the filename if not provided
		if (typeof(kpfFile) == "undefined") {
			var title = 'Select a Komodo project file (.kpf) to make .pot file';
			var Filters = [];
			Filters.push("Komodo Project");
			// TODO: in Ko6, openFile() is deprecated in favor of browseForFile()
			kpfFile = ko.filepicker.openFile("", "project.kpf", title,
				null, Filters);
		}
		if (kpfFile == null) return;	// User clicked cancel
		sv.r.eval('require(svIDE); (kpf2pot("' + kpfFile + '"))');
	} catch(e) {
		sv.log.exception(e, "Unknown error while creating .pot file with"
			+ " sv.r.kpf2pot(). (" + e + ")", true);
	}
}

// Create a translation (.pot) file for a package
sv.r.kpz2pot = function (kpzFile) {
	try {
		// Ask for the filename if not provided
		if (typeof(kpzFile) == "undefined") {
			var title = 'Select a Komodo package file (.kpz) to make .pot file';
			var Filters = [];
			Filters.push("Komodo Package");
			// TODO: in Ko6, openFile() is deprecated in favor of browseForFile()
			kpzFile = ko.filepicker.openFile("", "package.kpz", title,
				null, Filters);
		}
		if (kpzFile == null) return; // User clicked cancel
		sv.r.eval('require(svIDE); (kpz2pot("' + kpzFile + '"))');
	} catch(e) {
		sv.log.exception(e, "Unknown error while creating .pot file with"
			+ " sv.r.kpz2pot(). (" + e + ")", true);
	}
}

// Translate a project
sv.r.kpfTranslate = function (kpfFile) {
	try {
		// Ask for the filename if not provided
		if (typeof(kpfFile) == "undefined") {
			var title = 'Select a Komodo project file (.kpf) to translate';
			var Filters = [];
			Filters.push("Komodo Project");
			// TODO: in Ko6, openFile() is deprecated in favor of browseForFile()
			kpfFile = ko.filepicker.openFile("", "project.kpf", title,
				null, Filters);
		}
		if (kpfFile == null) return;	// User clicked cancel
		sv.r.eval('require(svIDE); (kpfTranslate("' + kpfFile + '"))');
	} catch(e) {
		sv.log.exception(e, "Unknown error while translating a project file " +
			"with sv.r.kpfTranslate(). (" + e + ")", true);
	}
}

// Translate a package
sv.r.kpzTranslate = function (kpzFile) {
	try {
		// Ask for the filename if not provided
		if (typeof(kpzFile) == "undefined") {
			var title = 'Select a Komodo package file (.kpz) to translate';
			var Filters = [];
			Filters.push("Komodo Package");
			// TODO: in Ko6, openFile() is deprecated in favor of browseForFile()
			kpzFile = ko.filepicker.openFile("", "package.kpz", title,
				null, Filters);
		}
		if (kpzFile == null) return;	// User clicked cancel
		sv.r.eval('require(svIDE); (kpzTranslate("' + kpzFile + '"))');
	} catch(e) {
		sv.log.exception(e, "Unknown error while translating package file " +
			"with sv.r.kpzTranslate(). (" + e + ")", true);
	}
}


//// Define the 'sv.r.pkg' namespace ///////////////////////////////////////////
if (typeof(sv.r.pkg) == 'undefined') sv.r.pkg = new Object();

// Select repositories
// TODO: a Komodo version of this that returns pure R code
sv.r.pkg.repositories = function () {
	var res = sv.r.eval('setRepositories(TRUE)');
	return(res);

	// On Linux, try reading data from: "<HOME>/.R/repositories",
	// "/usr/lib/R/etc/repositories", "usr/local/lib/R/etc/repositories"
	// On Windows, "<HOME>/.R/repositories", "<R_installPath>/etc/repositories"
}

// Select CRAN mirror, with optional callback
sv.r.pkg.chooseCRANMirror = function (setPrefString, callback) {
	var res = false;

	var cmd = 'assignTemp("cranMirrors", getCRANmirrors(all = FALSE, ' +
		'local.only = FALSE)); write.table(getTemp("cranMirrors")[, ' +
		'c("Name", "URL")], col.names = FALSE, quote = FALSE, sep ="' +
		sv.r.sep + '", row.names = FALSE)';

	res = sv.r.evalCallback(cmd, function (repos) {
		var res = false;

		if (repos.trim() == "") {
			sv.alert("Error getting CRAN Mirrors list.");
			return("");
		} else {
			repos = repos.split(/[\n\r]+/);
			var names = [], urls = [];
			for (i in repos) {
				var m = repos[i].split(sv.r.sep);
				names.push(m[0]);
				urls.push(m[1]);
			}
			var items = ko.dialogs.selectFromList(sv.translate("CRAN mirrors"),
				sv.translate("Select CRAN mirror to use:"), names, "one");
			if (!items) return(null);
			
			repos = urls[names.indexOf(items[0])].replace(/\/$/, "");
			ko.statusBar.AddMessage(
				sv.translate("Current CRAN mirror is set to %S",
				repos), "SciViews-K", 5000, false);

			sv.r.eval('with(TempEnv(), {repos <- getOption("repos");' +
				'repos["CRAN"] <- "' + repos + '"; ' +
				'options(repos = repos)})');
			if (setPref) sv.prefs.setPref("r.cran.mirror", repos, true);
			if (callback) callback(repos);
		}
		return(res);
	});
	ko.statusBar.AddMessage(sv.translate(
		"Retrieving CRAN mirrors list... please wait."), "SciViews-K",
		20000, true);
	return(res);
}

// List available packages on the selected repositories
sv.r.pkg.available = function () {
	var res = sv.r.eval('.pkgAvailable <- available.packages()\n' +
	'as.character(.pkgAvailable[, "Package"])');
	ko.statusBar.AddMessage(sv.translate(
	"Looking for available R packages... please wait"),
	"SciViews-K", 5000, true);
	return(res);
}

// List installed packages
sv.r.pkg.installed = function () {
	var res = sv.r.eval('.pkgInstalled <- installed.packages()\n' +
		'as.character(.pkgInstalled[, "Package"])');
	ko.statusBar.AddMessage(sv.translate(
		"Looking for installed R packages... please wait"),
		"SciViews-K", 5000, true);
	return(res);
}

// List new packages in the repositories
sv.r.pkg.new = function () {
	var res = sv.r.eval('(.pkgNew <- new.packages())');
	ko.statusBar.AddMessage(sv.translate(
		"Looking for new R packages... please wait"), "SciViews-K", 5000, true);
	return(res);
}

// List installed packages which are older than those in repository (+ versions)
sv.r.pkg.old = function () {
	var res = sv.r.eval('.pkgOld <- old.packages()\n' +
		'if (is.null(.pkgOld)) cat("none!\n") else\n' +
		'    noquote(.pkgOld[, c("Installed", "ReposVer")])');
	ko.statusBar.AddMessage(sv.translate(
		"Looking for old R packages... please wait"), "SciViews-K", 5000, true);
	return(res);
}

// Update installed packages
sv.r.pkg.update = function () {
	var res = sv.r.eval('update.packages(ask = "graphics")');
	ko.statusBar.AddMessage(sv.translate(
		"Updating R packages... please wait"), "SciViews-K", 5000, true);
	return(res);
}

// Some statistics about R packages
sv.r.pkg.status = function () {
	var res = sv.r.eval('(.pkgStatus <- packageStatus())');
	ko.statusBar.AddMessage(sv.translate(
		"Compiling R packages status... please wait"), "SciViews-K",
			5000, true);
	return(res);
}

// Which R packages are currently loaded?
sv.r.pkg.loaded = function () {
	var res = sv.r.eval('(.packages())');
	ko.statusBar.AddMessage(sv.translate(
		"Listing loaded R packages... please wait"), "SciViews-K", 5000, true);
	return(res);
}

// Load one R package
sv.r.pkg.load = function () {
	var res = false;
	ko.statusBar.AddMessage(sv.translate("ListingPackages"),
		"SciViews-K", 20000, true);

	// Get list of installed R packages that are not loaded yet
	res = sv.r.evalCallback('.tmp <- .packages(all.available = TRUE);' +
		'cat(.tmp[!.tmp %in% .packages()], sep = "' + sv.r.sep + '"); rm(.tmp)',
		function (pkgs) {
			ko.statusBar.AddMessage("", "SciViews-K");
			var res = false;
			if (pkgs.trim() == "") {
				sv.alert("All installed R packages seem to be already loaded!");
			} else {	// Something is returned
				var items = pkgs.split(sv.r.sep);
				// Select the item you want in the list
				var topic = ko.dialogs.selectFromList(
				sv.translate("Load R package"),
				sv.translate("Select R package(s) to load") + ":", items);
				if (topic != null) {
					// TODO: make a R function in svMisc instead!
					res = sv.r.evalCallback('cat(paste(lapply(c("' +
						topic.join('", "') + '"), function(pkg) { res <- try('
						+ 'library(package = pkg, character.only = TRUE)); ' +
						'paste("Package", sQuote(pkg), if (inherits(res,' +
						' "try-error")) "could not be loaded" else "loaded")' +
						'}), collapse = "\\n"), "\\n")', sv.cmdout.append);
				}
			}
			return(res);
		});
	return(res);
}

// Unload one R package
sv.r.pkg.unload = function () {
	var res = false;
	// Get list of loaded packages, minus required ones we cannot unload
	var cmd = '.tmp <- .packages(); cat(.tmp[!.tmp %in%' +
		' c(if (exists(".required")) .required else NULL, "base")],' +
		' sep = "' + sv.r.sep + '"); rm(.tmp)';
	res = sv.r.evalCallback(cmd, sv.r.pkg.unload_select);
	ko.statusBar.AddMessage(sv.translate(
		"Listing loaded R packages... please wait"), "SciViews-K", 20000, true);
	return(res);
}

// The callback for sv.r.pkg.unload
// TODO: make private
sv.r.pkg.unload_select = function (pkgs) {
	ko.statusBar.AddMessage("", "SciViews-K");
	var res = false;
	if (sv.tools.strings.removeLastCRLF(pkgs) == "") {
		sv.alert("None of the loaded packages are safe to unload!");
	} else {	// Something is returned
		var items = pkgs.split(sv.r.sep);
		// Select the item you want in the list
		var topic = ko.dialogs.selectFromList("Unload R package",
			"Select one R package to unload:", items, "one");
		if (topic != null)
		res = sv.r.eval("detach(\"package:" + topic[0].trim()+ "\")");
	}
	return(res);
}

// Remove one R package
sv.r.pkg.remove = function () {
	var res = false;
	// Get list of all packages, minus required/recommended we cannot remove
	var cmd = '.tmp <- installed.packages(); ' +
		'.tmp <- rownames(.tmp)[is.na(.tmp[, "Priority"])]; ' +
		'cat(.tmp[!.tmp %in% c(if (exists(".required")) .required else NULL,' +
		' "svMisc", "svIDE", "svGUI", "svHttp", "svSocket", "svIO", ' +
		' "svViews", "svKomodo", "svWidgets", "svDialogs")], sep = "' +
		sv.r.sep + '"); rm(.tmp)';
	res = sv.r.evalCallback(cmd, sv.r.pkg.remove_select);
	ko.statusBar.AddMessage(sv.translate(
		"Listing removable R packages... please wait"), "SciViews-K",
		20000, true);
	return(res);
}

// The callback for sv.r.pkg.remove
sv.r.pkg.remove_select = function (pkgs) {
	ko.statusBar.AddMessage("", "SciViews-K");
	var res = false;
	if (sv.tools.strings.removeLastCRLF(pkgs) == "") {
		sv.alert(sv.translate(
			"None of the installed R packages are safe to remove!"));
	} else {	// Something is returned
		var items = pkgs.split(sv.r.sep);
		// Select the item you want in the list
		var topic = ko.dialogs.selectFromList("Remove R package",
			"Select one R package to remove:", items, "one");
		if (topic != null) {
			var pkg = (sv.tools.strings.removeLastCRLF(topic.join('')));
			var response = ko.dialogs.customButtons(
				"You are about to remove the '" + pkg +
				"' R package from disk! Are you sure?",
				["&Continue...", "Cancel"], "Continue...", null,
				"Removing an R package");
			if (response == "Cancel") return(res);

			res = sv.r.eval('remove.packages("' + pkg +
				'", lib = installed.packages()["' + pkg + '", "LibPath"])');
		}
	}
	return(res);
}

// sv.r.pkg.install - install R packages
// examples:
// sv.r.pkg.install() // use default CRAN mirror
// sv.r.pkg.install("", true) // re-set CRAN mirror
// sv.r.pkg.install(["boot", "lme4"])
// sv.r.pkg.install("", "local") // local installation popups "Open file" dialog
// sv.r.pkg.install("/path/to/packages", "local") // with initial path
// sv.r.pkg.install("sciviews") // install all sciViews packages
// sv.r.pkg.install("sciviews", "r-forge") // ... from R-Forge
// sv.r.pkg.install("sciviews", "http://r.meteo.uni.wroc.pl") // different CRAN
sv.r.pkg.install = function (pkgs, repos) {
	// Just in case, to prevent infinite callbacks but such should never happen
	var allowCCM = arguments.length < 3;

	var res = false;
	var reset = (repos === true);
	if (reset) repos = undefined;

	function _installCallback() {
		sv.r.pkg.install(pkgs, defaultRepos, true);
	};
	
	
	if (!repos && defaultRepos) {
		repos = defaultRepos;
	} else if (reset && allowCCM) {
		res = sv.r.pkg.chooseCRANMirror(true, _installCallback);
		return;
	} else if (!repos && allowCCM) {
		res = sv.r.evalCallback("cat(getOption(\"repos\")[\"CRAN\"])",
			function (cran) {
				var res = false;
				cran = cran.trim();
				if (cran == "@CRAN@") {
					res = sv.r.pkg.chooseCRANMirror(true, _installCallback);
				} else {
					sv.prefs.setPref("r.cran.mirror", cran, true);
					res = sv.r.pkg.install(pkgs, cran, true);
				}
				return;
			}
		);
		return;
	}	
	
	// At this point repos should be always set
	sv.cmdout.append(sv.translate("Using repository at %S", repos));
	repos = repos.toLowerCase();

	var startDir = null;
	// TODO: allow for array of package files
	if (typeof pkgs == "string" &&
		sv.tools.file.exists(pkgs) == sv.tools.file.TYPE_DIRECTORY) {
		repos = "local";
		startDir = pkgs;
	}

	// No packages provided, popup a list with available ones and callback again
	if (!pkgs && repos != "local") {
		ko.statusBar.AddMessage(sv.translate("Listing available packages..."),
			"SciViews-K", 5000, true);
		res = sv.r.evalCallback('cat(available.packages(contriburl=contrib.url("'
		+ repos + '", getOption("pkgType")))[,1], sep="' +
		sv.r.sep + '")', function (pkgs) {
			ko.statusBar.AddMessage("", "SciViews-K");

			var res = false;
			if (pkgs.trim() != "") {
				pkgs = pkgs.split(sv.r.sep);
				if (pkgs.length < 3) {
					ko.dialogs.alert('Listing available packages, R said:',
						pkgs.join(''), 'SciViews-K');
					return;
				}		
				
				// Case insensitive sorting:
				pkgs.sort(function(a,b) a.toUpperCase() > b.toUpperCase());

				pkgs = ko.dialogs.selectFromList(
					sv.translate("Install R package"),
					sv.translate("Select package(s) to install") + ":", pkgs);
				if (pkgs != null)
					res = sv.r.pkg.install(pkgs, repos, true);
			}
		});
		return;
	}

	// Expand short names
	if (repos == "r-forge") {
		repos = "http://r-forge.r-project.org";
	} else if (repos == "local") {
		repos = "NULL";

		if (!pkgs || startDir) {
			// Get list of files to install
			pkgs = sv.fileOpen(startDir, null,
			sv.translate("Select package(s) to install"),
				['Zip archive (*.zip)|*.zip',
				'Gzip archive (*.tgz;*.tar.gz)|*.tgz;*.tar.gz'], true);
			if (pkgs == null) return;
			for (var i in pkgs) pkgs[i] = pkgs[i].addslashes();
		}
	}

	if (repos != "NULL") repos = "\"" + repos + "\"";

	if (typeof(pkgs) == "string") {
		if (pkgs.toLowerCase() == "sciviews") {
			pkgs = ["SciViews", "svMisc", "svSocket", "svHTTP", "svGUI",
				"svIDE", "svKomodo", "svDialogs", "svWidgets", "svSweave",
				"svTools", "svUnit", "tcltk2"];
		} else {
			pkgs = [pkgs];
		}
	}
	var cmd = "install.packages(c(\"" + pkgs.join('", "') + "\"), repos = " +
		repos + ")";
	sv.r.eval(cmd);
}
////////////////////////////////////////////////////////////////////////////////


// Temporary code - for memory only
//sv.r.RinterpreterTrial = function (code) {
//	var R = Components
//		.classes["@sciviews.org/svRinterpreter;1"]
//		.getService(Components.interfaces.svIRinterpreter);
//
//	return R.calltip(code);
//}

// Initialize the default (last used) R session
sv.r.initSession();

// Detect where R is located now...
sv.r.application(true); // Warn if not found!
