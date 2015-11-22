// SciViews-K general functions
// Define the basic 'sv' namespace, plus 'sv.cmdout', 'sv.log'
// Copyright (c) 2008-2012, Ph. Grosjean (phgrosjean@sciviews.org)
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// _(); // A fake function used only to tag strings to be translated in projects
//         and toolbox macros
//
// sv.version;        // Get current SciViews-K version (major.minor.release)
// sv.showVersion;    // Do we display version in an alert() box or just set it?
// sv.checkVersion(version); // Check the SciViews-K extension version is fine
// sv.alert(header, text); // Own alert box; text is optional
// sv.getTextRange(what, gotoend, select, range, includeChars);
//                    // Get a part of text in the buffer, do not select
// sv.marginClick(modifiers, position, margin); // Custom margin click behaviour
// sv.fileOpen(directory, filename, title, filter, multiple, save, filterIndex);
//                    // File open, more customizable than ko.filepicker.open()
// sv.browseURI(URI, internal); // Show URI in internal or external browser
// sv.showFile(path, readonly); // Show a file in Komodo, possibly as read-only
// sv.helpURL(URL);   // Display URL help in the default browser
// sv.helpContext();  // Get contextual help for selected word in buffer in R or
//                       for active snippet in toolbox (see Help context)
// sv.translate(textId); // translate messages using data from
//                          chrome://sciviewsk/locale/main.properties
// sv.addNotification(msg, severity, timeout); // Notification message as in ko7
//                                                or statusbar message
// sv.checkToolbox(); // Check SciViews-K & R reference toolboxes are installed
// sv.toggleById(id, hide); // Show/hide UI element by id
// sv.checkById(id, hide);  // Check/uncheck UI element by id
// sv.askUI(change);  // Change the whole Komodo UI (simplify for useRs)
// sv.reworkUI(level);// Function that performs Komodo UI change
//
// SciViews-K Command Output management ('sv.cmdout' namespace) ////////////////
// sv.cmdout.append(str, newline, scrollToEnd); // Append to Command Output
// sv.cmdout.clear(all); // Clear the Command Output pane
// sv.cmdout.message(msg, timeout, highlight); // Message in Command Output
// sv.cmdout.exitPartial(); // Eliminate temporary multiline code
//
// SciViews-K logging feature ('sv.log' namespace) /////////////////////////////
// sv.log.logger;           // The SciViews-K Komodo logger object
// sv.log.exception(e, msg, showMsg); // Log an exception with error message
//                                       and stack. If showMsg == true, also
//                                       display the msg in an alert box
// sv.log.critical(msg);    // Log a critical error
// sv.log.error(msg);       // Log an error
// sv.log.warn(msg);        // Log a warning
// sv.log.warnStack(msg);   // Log a warning and print the calling stack
// sv.log.info(msg);        // Log an info message (if sv.log.isAll() == true)
// sv.log.debug(msg);       // Log a debug message (if sv.log.isAll() == true)
// sv.log.all(debug);       // Toggle logging of debug/info messages on/off
// sv.log.isAll();          // Do we currently log all messages?
// sv.log.show();           // Show the Komodo log file
////////////////////////////////////////////////////////////////////////////////
//
// TODO: look at sv.cmdout in SciViews-K-dev... but these are two separate forks
//       really => not easy to mix!
// TODO: use sv.addNotification(msg, severity, timeout); instead of
//       ko.statusbar.addMessage()!!!
////////////////////////////////////////////////////////////////////////////////


// This function is used to tag strings to be translated in projects/toolbox
var _ = function (str) { return(str) }

if (typeof(sv) == "undefined") var sv = {};

// Create the 'sv.tools' namespace
if (typeof(sv.tools) == "undefined") sv.tools = {};

// Version management
try { // Komodo 7
	Components.utils.import("resource://gre/modules/AddonManager.jsm");
	AddonManager.getAddonByID("sciviewsk@sciviews.org", function (addon) {
		sv._version = addon.version; });
} catch(e) {
	sv._version = Components.classes["@mozilla.org/extensions/manager;1"]
		.getService(Components.interfaces.nsIExtensionManager)
		.getItemForID("sciviewsk@sciviews.org").version;
}

sv.__defineGetter__("version", function () sv._version);

sv.showVersion = true;

sv._compareVersion = function(a, b) Components
	.classes["@mozilla.org/xpcom/version-comparator;1"]
	.getService(Components.interfaces.nsIVersionComparator).compare(a, b);

sv.checkVersion = function (version) {
	if (sv._compareVersion(sv.version, version) < 0) {
		var text = sv.translate(
			"One or more macros require the SciViews-K plugin %S, " +
			"but currently installed version is %S. You should update it." +
			"Would you like to open the extension manager and check for updates now?",
			version, this.version);

		var sYes = sv.translate("Yes");
		var res = ko.dialogs.yesNo(sv.translate("Outdated SciViews-K extension"),
			sYes, text, "SciViews-K");
		if (res == sYes) ko.launch.openAddonsMgr();
		return(false);
	} else {
		return(true);
	}
}

//// Other functions directly defined in the 'sv' namespace ////////////////////
// Our own alert box
sv.alert = function (header, text)
	ko.dialogs.alert(header, text, "SciViews-K");

//sv.alert("Error:", "Some message");
// -or-
//sv.alert("Message");

// Select a part of text in the current buffer and return it
sv.getTextRange = function (what, gotoend, select, range,
includeChars /*= "." if language is R*/) {
	
	var currentView = ko.views.manager.currentView;
	if (!currentView) return("");
	currentView.setFocus();
	var scimoz = currentView.scimoz;
	var text = "";
	var curPos = scimoz.currentPos;
	var curLine = scimoz.lineFromPosition(curPos);
	var pStart = Math.min (scimoz.anchor, curPos);
	var pEnd = Math.max (scimoz.anchor, curPos);

	// Depending on 'what', we select different parts of the file
	// By default, we keep current selection
	if (what == "line/sel") what = (pStart == pEnd) ? "line" : "sel";
	switch(what) {
	 case "sel":
		// Simply retain current selection
		var nSelections = scimoz.selections;
		if(nSelections > 1) { // rectangular selection
			var msel = [];
			for (var i = 0; i < scimoz.selections; i++) {
				msel.push(scimoz.getTextRange(scimoz.getSelectionNStart(i),
					scimoz.getSelectionNEnd(i)));
			}
			text = msel.join("\n");
			// TODO: What to do with multiple ranges?
			pStart = scimoz.getSelectionNStart(0);
			pEnd = 	scimoz.getSelectionNEnd(nSelections - 1);
		}
		break;
	
	 case "word":
		if (pStart == pEnd) { // Only return word if no selection
			if (!includeChars && currentView.languageObj.name == "R")
				includeChars = ".";

			var wordChars =
				"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"
				+ includeChars;

			function wordCharTest(s) {
				return((s.charCodeAt(0) > 0x80) || wordChars.indexOf(s) > -1);
			}

			for (pStart = scimoz.positionBefore(curPos);
				 (pStart > 0) && wordCharTest(scimoz.getWCharAt(pStart));
			pStart = scimoz.positionBefore(pStart)) { };

			// Avoid infinite loop if name at the beginning of the document
			if (pStart != 0 | !wordCharTest(scimoz.getWCharAt(0))) pStart += 1;

			for (pEnd = scimoz.currentPos;
				(pEnd < scimoz.length) && wordCharTest(scimoz.getWCharAt(pEnd));
			pEnd = scimoz.positionAfter(pEnd)) { };
		}
		break;
	
	 case "function":
		// Tricky one: select an entire R function
		// this should work even with extremely messy coded ones

		// Function declaration pattern
		var funcRegExStr = "\\S+\\s*(<-|=)\\s*function\\s*\\(";

		var findSvc = Components.classes['@activestate.com/koFindService;1']
			.getService(Components.interfaces.koIFindService);

		// Save previous find settings
		var oldFindPref = {searchBackward: true, matchWord: false,
            patternType: 0};
		for (var i in oldFindPref)
			oldFindPref[i] = findSvc.options[i];

		findSvc.options.matchWord = false;
		findSvc.options.patternType = 2;

		var line0, line1, pos1, pos2, pos3, pos4;
		var lineArgsStart, lineBodyStart, firstLine;
		var pos0 = scimoz.getLineEndPosition(curLine);
		var findRes;

		do {
			// Search for function pattern backwards
			findSvc.options.searchBackward = true;
			findRes = findSvc.find("", scimoz.text, funcRegExStr,
				scimoz.charPosAtPosition(pos0), 0);
			if (!findRes) break;

			// Function declaration start
			pos0 = scimoz.positionAtChar(0, findRes.start);
			// Opening brace of function declaration
			pos1 = scimoz.positionAtChar(0, findRes.end);
			// Closing brace of function declaration
			pos2 = scimoz.braceMatch(pos1 - 1);

			// Find first character following the closing brace
			findSvc.options.searchBackward = false;
			findRes = findSvc.find("", scimoz.text, "\\S",
				scimoz.charPosAtPosition(pos2) + 1,
				scimoz.charPosAtPosition(scimoz.length));
			if (!findRes) break;

			// Beginning of the function body
			pos3 = scimoz.positionAtChar(0, findRes.end);

			lineArgsStart = scimoz.lineFromPosition(pos1);
			lineBodyStart = scimoz.lineFromPosition(pos3);

			// Get first line of the folding block
			firstLine = (scimoz.getFoldParent(lineBodyStart) !=
				lineArgsStart) ? lineBodyStart : lineArgsStart;

			// Get end of the function body
			if (scimoz.getWCharAt(pos3 - 1) == "{") {
				pos4 = scimoz.braceMatch(pos3 - 1) + 1;
			} else {
				pos4 = scimoz.getLineEndPosition(lineBodyStart);
			}

			// Repeat if selected function does not embrace cursor position
			// and if there are possibly any functions enclosing it
			} while (pos4 < curPos &&
				scimoz.getFoldParent(lineArgsStart) != -1);

		if (pos4 >= curPos) {
			pStart = pos0;
			pEnd = pos4;
		}

		// Restore previous find settings
		for (var i in oldFindPref)
			findSvc.options[i] = oldFindPref[i];
		break;
	
	 case "block":
		// Select all content between two bookmarks
		var Mark1, Mark2;
		Mark1 = scimoz.markerPrevious(curLine, 64);
		if (Mark1 == -1) Mark1 = 0;
		Mark2 = scimoz.markerNext(curLine, 64);
		if (Mark2 == -1) Mark2 = scimoz.lineCount - 1;

		pStart = scimoz.positionFromLine(Mark1);
		pEnd = scimoz.getLineEndPosition(Mark2);
		break;
	
	 case "para":
		// Select the entire paragraph
		for (var i = curLine; i >= 0
			&& scimoz.lineLength(i) > 0
			&& scimoz.getTextRange(pStart = scimoz.positionFromLine(i),
			scimoz.getLineEndPosition(i)).trim() != "";
			i--) { }

		for (var i = curLine; i <= scimoz.lineCount
			&& scimoz.lineLength(i) > 0
			&& scimoz.getTextRange(scimoz.positionFromLine(i),
			pEnd = scimoz.getLineEndPosition(i)).trim() != "";
			i++) { }
		break;
	
	 case "line":
		// Select whole current line
		pStart = scimoz.positionFromLine(curLine);
		pEnd = scimoz.getLineEndPosition(curLine);
		break;
	
	 case "linetobegin":
		// Select line content from beginning to anchor
		pStart = scimoz.positionFromLine(curLine);
		break;
	
	 case "linetoend":
		// Select line from anchor to end of line
		pEnd = scimoz.getLineEndPosition(curLine);
		break;
	
	 case "end":
		// take text from current line to the end
		pStart = scimoz.positionFromLine(curLine);
		pEnd = scimoz.textLength;
		break;
	
	 case "codefrag":
        // This is used by calltip and completion. Returns all text backwards
		// from current position to the beginning of the current folding level
        pStart = scimoz.positionFromLine(scimoz.getFoldParent(curLine));
	
	 case "all":
	 default:
		// Take everything
		text = scimoz.text;
	}

	if (!text) text = scimoz.getTextRange(pStart, pEnd);
	if (gotoend)
		if (what == "block" || what == "para" || what == "function") {
			scimoz.gotoPos(pEnd + 1);
		} else if (what == "sel" && text) {	
			scimoz.gotoPos(pEnd + 1);
		} else scimoz.gotoPos(pEnd);
	if (select && what != "sel") scimoz.setSel(pStart, pEnd);
	if (range != undefined && (typeof range == "object")) {
		range.value = {start: pStart, end: pEnd};
	}
	return(text);
}

// Custom margin click behaviour
sv.marginClick = function (modifiers, position, margin) {
    //sv.log.info("Bookmark click");
    try {
        var v = ko.views.manager.currentView;
        // There is a problem with split pane and an error message when
		// currentView is null. The following line was added, but it does not
		// seem to solve the problem
        if (!v) return;
        var ke = v.scintilla.scimoz;
        var lineClicked = ke.lineFromPosition(position);
        
		if (margin == 2) {
            if (modifiers == 0) {
                // Simple click. From editor.js. This is implementation of
				// do_cmd_bookmarkToggle with different arguments
                var markerState = ke.markerGet(lineClicked);

                if (markerState & (1 << ko.markers.MARKNUM_BOOKMARK)) {
                    ke.markerDelete(lineClicked, ko.markers.MARKNUM_BOOKMARK);
                } else {
                    ko.history.note_curr_loc(v);
                    ke.markerAdd(lineClicked, ko.markers.MARKNUM_BOOKMARK);
                }
            } else if (modifiers == 1) {
                // Shift click
                var markerState = ke.markerGet(lineClicked);

                if (markerState & (1 << ko.markers.MARKNUM_TRANSIENTMARK)) {
                    ke.markerDelete(lineClicked,
						ko.markers.MARKNUM_TRANSIENTMARK);
                } else {
                    ke.markerAdd(lineClicked, ko.markers.MARKNUM_TRANSIENTMARK);
                }
            }
        } else if (margin == 1) {
            // From views-buffer.xml, method onMarginClick
			// (original comments removed)
            if (ke.getFoldLevel(lineClicked) & ke.SC_FOLDLEVELHEADERFLAG) {
                if (ke.getFoldExpanded(lineClicked)) {
                    var level = ke.getFoldLevel(lineClicked);
                    var lineMaxSubord = ke.getLastChild(lineClicked, level);
                    var currentLine = ke.lineFromPosition(ke.currentPos);
                    if (currentLine > lineClicked &&
						currentLine <= lineMaxSubord) {
                        var pos = ke.positionFromLine(lineClicked);
                        ke.selectionStart = pos;
                        ke.selectionEnd = pos;
                        ke.currentPos = pos;
                    }
                }
                ke.toggleFold(lineClicked);
            }
        }
    } catch(e) { };
}

// File open dialog, more customizable replacement for ko.filepicker.open
sv.fileOpen = function (directory, filename, title, filter, multiple, save,
filterIndex) {
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"]
		.createInstance(nsIFilePicker);

	//Dialog should get default system title
    //if (!title) title = sv.translate(save? "Save file" : "Open file");

	var mode;
	if (!save) {
		mode = multiple ? nsIFilePicker.modeOpenMultiple : nsIFilePicker.modeOpen;
	} else {
		mode = nsIFilePicker.modeSave;
	}

    fp.init(window, title, mode);

	if (typeof(filterIndex) != "undefined")
		fp.filterIndex = (typeof(filterIndex) == "object") ?
		filterIndex.value : filterIndex;

	var filters = [];
	if (filter) {
        if (typeof(filter) == "string") filter = filter.split(',');
        var fi;
        for (var i = 0; i  < filter.length; i++) {
            fi = filter[i].split("|");
            if (fi.length == 1)
			fi[1] = fi[0];
            fp.appendFilter(fi[0], fi[1]);
			filters.push(fi[1]);
        }
    }
    fp.appendFilters(nsIFilePicker.filterAll);
	filters.push("");

    if (directory  &&
		sv.tools.file.exists(directory = sv.tools.file.path(directory))) {
        var lf = Components.classes["@mozilla.org/file/local;1"]
			.createInstance(Components.interfaces.nsILocalFile);
        lf.initWithPath(directory);
        fp.displayDirectory = lf;
    }
    if (filename) fp.defaultString = filename;

    var rv = fp.show();
    if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
        var path;
        if (multiple) {
            var files = fp.files;
            path = new Array();
            while (files.hasMoreElements()) {
                var file = files.getNext().
				QueryInterface(Components.interfaces.nsILocalFile);
                path.push(file.path);
            }
        } else {
            path = fp.file.path;
        }

		// Append extension according to active filter
		if (mode == nsIFilePicker.modeSave) {
			var os = Components.classes['@activestate.com/koOs;1']
				.getService(Components.interfaces.koIOs);
			if (!os.path.getExtension(path)) {
				var defaultExt = os.path.getExtension(filters[fp.filterIndex]);
				path += defaultExt;
			}
		}
		if (typeof filterIndex == "object") filterIndex.value = fp.filterIndex;
        return(path);
    }
    return(null);
}

// Browse for the URI, either in an internal, or external (default) browser
sv.browseURI = function (URI, internal /* = null*/) {
	if (internal === undefined) internal = null;
	
	if (URI == "") {
		sv.alert(sv.translate("Item not found!"));	// Because we call this from
        // other functions that return "" when they don't find it, see sv.r.help
	} else {
		if (internal == null)
			internal = (sv.pref.getPref("sciviews.r.help",
				"internal") == "internal");
		if (internal == true) {
			// TODO: open this in the R help pane, or in a buffer
			ko.open.URI(URI, "browser");
		} else {
			ko.browse.openUrlInDefaultBrowser(URI);
		}
	}
}

// Show a text file in a buffer, possibly in read-only mode
sv.showFile = function (path, readonly /*= true*/) {
	if (readonly === undefined || readonly == null) readonly = true;
	
	if (path == "") {
		sv.alert(sv.translate("Item not found!")); // Same as for sv.browseURI()
	} else {
		ko.open.URI(path, "editor");
		if (readonly == true) {
			var kv = ko.views.manager.currentView;
			var ke = kv.scimoz;
			ke.readOnly = true;
			// TODO: use morekomodo approach
            // Make the caret a block and hatch the fold margin as indicator
			ke.caretStyle = 2;
			ke.setFoldMarginColour(true, 100);
			kv.setFocus();
		}
	}
}

// Show URL in the default browser with current selection or <keyword>
sv.helpURL = function (URL) {
	try {
		var kv = ko.views.manager.currentView;
		if (!kv) return(false);
		kv.setFocus();
		var ke = kv.scimoz;
		var sel = ke.selText;
		if (sel == "") {
			// Try to get the URL-escaped word under the cursor
			if (ko.interpolate.getWordUnderCursor(ke) == "") {
				sv.alert(sv.translate("Nothing is selected!"));
				return(false);
			} else {
				// Note that in Komodo 6, interpolateStrings is deprecated in favor of interpolateString!
				sel = ko.interpolate.interpolateStrings('%W');
			}
		} else {
			// Get the URL-escaped selection
			// Note that in Komodo 6, interpolateStrings is deprecated in favor of interpolateString!
			sel = ko.interpolate.interpolateStrings('%S');
		}
		var helpURL = URL.replace("<keyword>", sel);
		ko.browse.openUrlInDefaultBrowser(helpURL);
		return(true);
	} catch(e) {
		sv.log.exception(e, "Unable to show " + URL + " in the browser", true);
	}
	return(false);
}

// Get some help for a snippet, or a word in the buffer by hitting Alt+F1
sv.helpContext = function () {
	try {
		if (ko.window.focusedView() == null) {
			if (ko.projects.active) {
				var item;
				if (ko.toolbox2 === undefined) {
					// Komodo 5 code
					item = ko.projects.active.getSelectedItem();
				} else {
					// Komodo 6 code
					item = ko.toolbox2.getSelectedItem();
				}
				var content = item.value;
				// We need to eliminate newlines for easier regexp search
				content = content.replace(/[\n\r]/g, "\t");

				// Look for a string defining the URL for associated help file
				// This is something like [[%ask|pref:URL|R|RWiki-help:<value>]]
				// To ease search, replace all [[%ask by [[%pref
				content = content.replace(/\[\[%ask:/g, "[[%pref:");

				// Look for URL-help
				var help = content
					.replace(/^.*\[\[%pref:URL-help:([^\]]*)]].*$/, "$1");
				if (help != content) {	// Found!
					// Show in default browser
					// TODO: a quick 'R help' tab to show this
					ko.browse.openUrlInDefaultBrowser(help);
					return(true);
				}

				// Look for R-help
				help = content.replace(/^.*\[\[%pref:R-help:([^\]]*)]].*$/,
					"$1");
				if (help != content) {	// Found!
					// Do the help command in R
					sv.r.help(help);
					return(true);
				}

				// Look for RWiki-help
				help = content.replace(/^.*\[\[%pref:RWiki-help:([^\]]*)]].*$/,
					"$1");
				if (help != content) {	// Found!
					// Get the RWiki base URL
					var baseURL = "http:/wiki.r-project.org/rwiki/doku.php?id="
					baseURL = sv.prefs.getPref("sciviews.rwiki.help.base",
						baseURL);
					// Display the RWiki page
					// TODO: display this in the quick 'R help' tab
					ko.browse.openUrlInDefaultBrowser(baseURL + help);
					return(true);
				}

				// No help data found
				var msg = sv.translate("No help found for this tool!");
				ko.statusBar.AddMessage(msg, "debugger", 5000, true);
				return(false);
			}
		} else { // The focus is currently on a buffer
			// Try to get R help for current word
			topic = sv.getTextRange("word");
			if (topic == "") {
				alert(sv.translate("Nothing is selected!"));
			} else sv.r.help(topic);
		}
		return(true);
	} catch(e) {
		sv.log.exception(e, "Error while trying to get contextual help", true);
		return(false);
	}
}

// Translate messages using data from chrome://sciviewsk/locale/main.properties
sv.translate = function (textId) {
	var bundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
		.getService(Components.interfaces.nsIStringBundleService)
		.createBundle("chrome://sciviewsk/locale/main.properties");
	var param;

	try {
		if (arguments.length > 1) {
			param = [];
			for (var i = 1; i < arguments.length; i++)
				param = param.concat(arguments[i]);
			//return(strbundle.getFormattedString(textId, param));
			return(bundle.formatStringFromName(textId, param, param.length));
		} else {
			//return(strbundle.getString(textId));
			return(bundle.GetStringFromName(textId));
		}
	} catch (e) {
		// Fallback if no translation found
		if (param) { // a wannabe sprintf, just substitute %S and %nS patterns:
			var rx;
			for (var i = 0; i < param.length; i++) {
				rx = new RegExp("%("+ (i + 1) +")?S");
				textId = textId.replace(rx, param[i]);
			}
		}
		return(textId);
	}
}

if (ko.notifications) {
	sv.addNotification = function (msg, severity, timeout) {
		var sm = Components.classes["@activestate.com/koStatusMessage;1"]
			.createInstance(Components.interfaces.koIStatusMessage);
		sm.category = "sciviewsk";
		sm.msg = msg;
		sm.log = true;
		sm.severity = severity;
		sm.timeout = timeout;
		ko.notifications.addNotification(sm);
	}
} else {
	sv.addNotification = function (msg, severity, timeout) {
		ko.statusBar.AddMessage(msg, 'sciviewsk', timeout, false, false, true);
	}
}

// Installs R reference toolbox
sv.checkToolbox = function () {
	// Ask for confirmation first
	if (ko.dialogs.okCancel("(Re)install the R reference toolbox...", "OK",
		"This will possibly overwrite existing R reference " +
		"toolbox. Note that this may take some time. Proceed?",
		"R reference installation") != "OK") return;

	// If Komodo 6, and new-style, zipped toolbox is there, use it
	if (ko.toolbox2 && sv.tools.file.getfile("ProfD",
		"extensions/sciviewsk@sciviews.org/defaults", "toolbox.zip").exists()) {
		
		ko.statusBar.AddMessage(
			sv.translate("(Re-)installing R reference toolbox..."),
			"SciViews", 3000, true);
	
		path = sv.tools.file.path("ProfD", "extensions",
			"sciviewsk@sciviews.org", "defaults", "toolbox.zip");
	
		var tbxFile = sv.tools.file.getfile(path);
		if(!tbxFile.exists()) return;
	
		var os = Components.classes['@activestate.com/koOs;1']
			.getService(Components.interfaces.koIOs);
		var tbxMgr = ko.toolbox2.manager;
		var toolbox2Svc = tbxMgr.toolbox2Svc;
		var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
		   .createInstance(Components.interfaces.nsIZipReader);
	
		var rxFolder1 = /^[^\/]+\/$/; // First level folder
		var tbxFolderPaths = [];
		var fTargetDir = sv.tools.file.getfile("TmpD", "svtoolbox");
		if (fTargetDir.exists()) fTargetDir.remove(true);
		var targetDir = fTargetDir.path;
	
		var toolsDirectory = toolbox2Svc.getStandardToolbox().path;
	
		zipReader.open(tbxFile);
		var entries = zipReader.findEntries(null);
		var entryName, outFile, isFile, folderdata, tbxNames = [];
		while (entries.hasMore()) {
			entryName = entries.getNext();
			outFile = sv.tools.file.getfile(targetDir, entryName);
			isFile = !(zipReader.getEntry(entryName).isDirectory);
			sv.tools.file.getDir(outFile, isFile, false);
			// Careful! This replaces current folders in 'tools' directory
			if (isFile) zipReader.extract(entryName, outFile);
		}
		zipReader.close();
	
		var tbxs = sv.tools.file.list(targetDir);
		for (var i = 0; i < tbxs.length; i++) {
			path = sv.tools.file.path(targetDir, tbxs[i]);
			toolbox2Svc.importDirectory(toolsDirectory, path);
			sv.log.debug("sv.checkToolbox2: path ->" + tbxs[i]);
		}
		fTargetDir.remove(true);
	
		toolbox2Svc.reloadToolsDirectory(toolsDirectory);
		tbxMgr.view.reloadToolsDirectoryView(-1);
	
		var rowCount = tbxMgr.view.rowCount;
		var toolName, toolPath;
		for (var i = 0; i < rowCount; i++) {
			toolPath = os.path.relpath(tbxMgr.view.getPathFromIndex(i),
				toolsDirectory);
			if (tbxs.indexOf(toolPath) != -1) {
				toolName = tbxMgr.view.getCellText(i, {});
				tbxNames.push(toolName);
				try { tbxMgr.view.renameTool(i, toolName) } catch(e) {
					// This gives error on Linux. Bug in ko.toolbox2?
					// The same when trying to rename manually.
					// "NameError: global name 'path' is not defined"
					// try other methods... edit .folderdata directly ???
				}
				sv.log.debug("sv.checkToolbox2: toolPath ->" +
					toolPath + " :: " + toolName);
			}
		}
	
		sv.alert(sv.translate("Toolbox %S is added. " +
			"To avoid conflicts, you should remove any previous or duplicated " +
			"versions.", "\"" +
			tbxNames.join("\" and \"") + "\""));	
	
	} else { // Old Komodo 5 toolbox management (kpf), or toolbox.zip not found
		ko.statusBar.AddMessage(
			sv.translate("(Re-)installing R reference toolbox..."), "SciViews",
			3000, true);
		try {
			var path, tbxs;
			var os = Components.classes['@activestate.com/koOs;1']
				.getService(Components.interfaces.koIOs);
	
			var tbxMgr;
			if (ko.toolbox2 && ko.toolbox2.manager) { // Komodo >= 6.0.0?
				tbxMgr = ko.toolbox2.manager;
				var toolbox2Svc = tbxMgr.toolbox2Svc;
				var targetDirectory = toolbox2Svc.getStandardToolbox().path;
				function _installPkg (path)
					toolbox2Svc.importV5Package(targetDirectory, path);
			} else { // Komodo 5
				function _installPkg (path)
					ko.toolboxes.importPackage(path);
				tbxMgr = null;
			}
	
			// Find all .kpz files in 'defaults', append/replace version string
			// in filenames, finally install as toolbox
			path = sv.tools.file.path("ProfD", "extensions",
				"sciviewsk@sciviews.org", "defaults");
			tbxs = sv.tools.file.list(path, "\\.kpz$");
	
			var file1, file2, path1, path2;
			for (var i in tbxs) {
				file1 = tbxs[i];
				path1 = sv.tools.file.path(path, file1);
				file2 = os.path.withoutExtension(file1
					.replace(/\s*(\([\s0-9a-c\.]+\)\s*)+/, ""));
				tbxs[i] = file2 + " (" + sv.version + ")";
				file2 = file2 + " (" + sv.version + ").kpz";
				path2 = sv.tools.file.path(path, file2);
				os.rename(path1, path2);
				try {
					_installPkg(path2);
				} catch(e) { }
			}
	
			if (tbxMgr) tbxMgr.view.reloadToolsDirectoryView(-1);
			
			//Message prompting for removing old or duplicated toolboxes
			sv.alert(sv.translate("Toolbox %S is added. " +
				"To avoid conflicts, you should remove any previous or " +
				"duplicated versions.", "\"" +
				tbxs.join("\" and \"") + "\""));
		} catch(e) {
			sv.log.exception(e,
				"Error while installing the R reference toolbox");
		}
		finally {
			sv.showVersion = true;
		}
	}
}

// PhG: I have tried this to check closing R... but there is a problem.
// maybe the SciViews server is not running any more after the user clicks
// something in the dialg box?
//sv.unloadSciViews = function () {
//	//alert("unload event detected!");
//	// Look if R is running
//	if (!sv.r.test(false, false)) return;
//	
//	// Ask for saving or not
//	var response = ko.dialogs.customButtons("Do you want to save the" +
//		" workspace (.RData) and the command history (.Rhistory) in" +
//		" the session directory first?" +
//		"\n(click Cancel to leave R running...)",
//		["Yes", "No", "Cancel"], "No", null, "Exiting SciViews Komodo & R");
//		if (response == "Cancel") return;
//	sv.r.evalHidden('base::q("' + response.toLowerCase() + '")');
//}

//window.onunload = sv.unloadSciViews;

sv.toggleById = function (id, hide) {
	// Gracefully exits in case the item is not found
	var item = document.getElementById(id);
	if (item != null) item.setAttribute("hidden", hide);
}

sv.checkById = function (id, hide) {
	// Gracefully exits in case the item is not found
	var item = document.getElementById(id);
	if (item != null) item.setAttribute("checked", hide);
}

sv.askUI = function (change /* = true*/) {
	if (change === undefined || change == null) change = true;
	
	var levels = ["beginneR", "useR", "developeR", "full-Komodo"];
	var item = ko.dialogs.selectFromList(
		sv.translate("Menus & toolbars configuration for R"),
		sv.translate("Select the user interface level you like:"),
		levels, "one");
	if (item == null) return(null);
	var level = levels.indexOf(item[0]) + 1;
	if (change) sv.reworkUI(level);
	
	// If everything is fine, save config
	sv.prefs.setPref("sciviews.uilevel", level, true);
	return(level);
}

sv.reworkUI = function (level /*= sciviews.uilevel pref*/) {
	// Don't use with Komodo < 6 (ko.toolbox2 is not defined there)
	if (!(ko.toolbox2 === undefined)) {
		try {
			sv.toggleById("r_uilevel", true);
			// The toolbar is wrong because it is a toolbar in Komodo 5,
			// but a toolbaritem in Komodo 6... Fix this now!
			var Rtoolbaritem = document.getElementById("RToolbar");			
			var Rtoolbar = document.createElement("toolbar")
			Rtoolbar.setAttribute("class", "chromeclass-toolbar");
			Rtoolbaritem.setAttribute("id", "OldRToolbar");
			Rtoolbar.setAttribute("id", "RToolbar");
			Rtoolbar.setAttribute("broadcaster", "cmd_viewrtoolbar");
			Rtoolbar.setAttribute("grippyhidden", "true");
			Rtoolbar.setAttribute("align", "center");
			Rtoolbar.setAttribute("persist", "hidden collapsed buttonstyle");
			Rtoolbar.setAttribute("buttonstyle", "pictures");
			Rtoolbar.setAttribute("tooltiptext", "R Toolbar");
			Rtoolbar.setAttribute("mode", "icons");
			Rtoolbar.setAttribute("insertbefore", "toolsToolbar");
			
			// In Ko8, there is now a toolbaritem level
			RtoolbarWrapper = document.createElement("toolbaritem");
			Rtoolbar.appendChild(RtoolbarWrapper);
			
			var tb = Rtoolbaritem.firstChild;
			tb.setAttribute("class", tb.getAttribute("class") + " first-child");
			RtoolbarWrapper.appendChild(tb);
			tb = Rtoolbaritem.firstChild;
			while (tb) {
				RtoolbarWrapper.appendChild(tb);
				tb = Rtoolbaritem.firstChild;
			}
			RtoolbarWrapper.lastChild.setAttribute("class",
				RtoolbarWrapper.lastChild.getAttribute("class") + " last-child");
			RtoolbarWrapper.setAttribute("class", "has-children");
			Rtoolbaritem.parentNode.replaceChild(Rtoolbar, Rtoolbaritem);
		} catch (e) {  }
		//return;
	}
	
	// Retrieve or ask the desired uilevel
	if (level === undefined || level == null) {
		level = sv.prefs.getPref("sciviews.uilevel", null);
		if (level == null) level = sv.askUI(false);
		if (level == null) return;
		level = parseInt(level);
	}
	
	if (level < 1) level = 1;
	if (level > 4) level = 4;
	// Rework levels into numbers for shortness
	//if (level == "beginneR") {
	//	level = 1;
	//} else if (level == "developeR") {
	//	level = 3;
	//} else if (level == "full-Komodo") {
	//	level = 4;
	//} else level = 2; // Default value (useR)
	// level indicates the degree of simplification we want
	// level = 1 => beginneR
	// level = 2 => useR (default)
	// level = 3 => developeR
	// level = 4 => full-Komodo
	
	// TODO: change a couple of settings on startup
	// If level < 4 => default document = .R
	// If level < 3 => set reload documents
	// set coloration of variables in R format
	// If level < 4 => do not load startup page
	// Show line number => not before level 3
	
	// Simplify Scintilla... must be done for each buffer
	// currently commented out
	// see http://www.scintilla.org/ScintillaDoc.html
//	var scimoz = ko.views.manager.currentView.scimoz;
	//scimoz.edgeMode = scimoz.EDGE_NONE; //edgeColumn
	//scimoz.edgeColumn = false;
	//scimoz.setFoldMarginColour = 0;
//	scimoz.marginLeft = 5; // Number of pixels for left margin
//	scimoz.setMarginWidthN(1, 10); // size in pixels of fold margin
//	scimoz.setMarginWidthN(2, 0); //Size of symbol margin
	//scimoz.setMarginWidthN(0, 0); // size in pixels of numbering margin (change in properties)
//	scimoz.setMarginWidthN(3, 0); //scimoz.textWidth(scimoz.STYLE_LINENUMBER, "999"));
	
	// Hide or show various items
	// Look at DOM inspector for finding the id of the corresponding command
	sv.toggleById("cmd_revert", level<2);
	sv.toggleById("cmd_refreshStatus", level<4);
	sv.toggleById("file_refresh_menuseparator", level<4);
	sv.toggleById("cmd_exportHTML", level<3);
	sv.toggleById("cmd_triggerPrecedingCompletion", level<4);
	sv.toggleById("cmd_browserPreview", level<3);
	sv.toggleById("cmd_startIncrementalSearch", level<2);
	sv.toggleById("cmd_startIncrementalSearchBackwards", level<2);
	sv.toggleById("cmd_saveAs_remote", level<3);
	//sv.toggleById("cmd_saveAs_Template", level<3);
	sv.toggleById("cmd_nextLintResult", level<3);
	sv.toggleById("cmd_lintClearResults", level<3);
	sv.toggleById("cmd_lintNow", level<3);
	sv.toggleById("cmd_bookmarkToggle", level<2);
	sv.toggleById("cmd_bookmarkRemoveAll", level<2);
	sv.toggleById("cmd_bookmarkGotoNext", level<2);
	sv.toggleById("cmd_bookmarkGotoPrevious", level<2);
	sv.toggleById("cmd_fontZoomIn", level<2);
	sv.toggleById("cmd_fontZoomOut", level<2);
	sv.toggleById("cmd_gotoLine", level<3);
	sv.toggleById("cmd_transpose", level<3);
	sv.toggleById("cmd_transposeWords", level<3);
	sv.toggleById("cmd_join", level<3);
	sv.toggleById("cmd_lineCut", level<3);
	sv.toggleById("cmd_lineDelete", level<3);
	sv.toggleById("cmd_lineDuplicate", level<3);
	sv.toggleById("cmd_lineOrSelectionDuplicate", level<3);
	sv.toggleById("cmd_lineTranspose", level<3);
	sv.toggleById("cmd_rawKey", level<3);
	sv.toggleById("cmd_repeatNextCommandBy", level<3);
	sv.toggleById("cmd_tabstopClear", level<3);
	sv.toggleById("cmd_completeWord", level<3);
	sv.toggleById("cmd_completeWordBack", level<3);
	sv.toggleById("cmd_cleanLineEndings", level<3);
	sv.toggleById("cmd_createMappedURI", level<4);
	sv.toggleById("cmd_editReflow", level<3);
	//sv.toggleById("cmd_CenterVertically", level<4);
	sv.toggleById("cmd_editMoveCurrentLineToTop", level<4);
	sv.toggleById("cmd_killLine", level<3);
	sv.toggleById("cmd_invokeHyperlink", level<3);
	//sv.toggleById("cmd_checkSpelling", level<1);
	sv.toggleById("cmd_jumpToCorrespondingLine", level<3);
	sv.toggleById("cmd_openTabInNewWindow", level<2);
	sv.toggleById("cmd_moveTabToNewWindow", level<2);
	sv.toggleById("cmd_findPreviousFunction", level<3);
	sv.toggleById("cmd_findNextFunction", level<3);
	sv.toggleById("cmd_findAllFunctions", level<3);
	sv.toggleById("cmd_goToDefinition", level<3);
	sv.toggleById("cmd_pasteAndSelect", level<3);
	sv.toggleById("cmd_makeSnippetFromSelection", level<3);
	sv.toggleById("cmd_findNextSelected", level<2);
	sv.toggleById("cmd_findPreviousSelected", level<2);
	sv.toggleById("cmd_convertUpperCase", level<3);
	sv.toggleById("cmd_convertLowerCase", level<3);
	sv.toggleById("cmd_exportHTMLSelection", level<3);
	sv.toggleById("cmd_printSelection", level<2);
	sv.toggleById("cmd_historyBack", level<2);
	sv.toggleById("cmd_historyForward", level<2);
	sv.toggleById("cmd_historyRecentLocations", level<2);
	sv.toggleById("cmd_showUnsavedChanges", level<3);
	//sv.toggleById("cmd_saveProject", level<1);
	sv.toggleById("cmd_revertProject", level<2);
	sv.toggleById("cmd_editProperties", level<1);
	sv.toggleById("cmd_toolboxExportPackage", level<3);
	sv.toggleById("cmd_viewLineNumbers", level<2);
	sv.toggleById("cmd_viewIndentationGuides", level<2);
	sv.toggleById("cmd_fontFixed", level<2);
	sv.toggleById("cmd_viewWhitespace", level<2);
	sv.toggleById("cmd_viewEOL", level<2);
	sv.toggleById("cmd_wordWrap", level<2);
	sv.toggleById("cmd_copyRegion", level<2);
	sv.toggleById("cmd_cutRegion", level<2);
	sv.toggleById("cmd_transientMarkSet", level<3);
	sv.toggleById("cmd_transientMarkExchangeWithPoint", level<3);
	sv.toggleById("cmd_transientMarkMoveBack", level<3);
	//sv.toggleById("Tasks:svUnitAbout", level<3);
	//sv.toggleById("toolboxView_AddItem", level<3);
	sv.toggleById("helpLanguagesMenu", level<4);
	sv.toggleById("menu_tryKomodoIDE", level<4);
	sv.toggleById("menu_helpCommunity", level<4);
	//sv.toggleById("menu_helpViewBugs", level<3);
	
	sv.toggleById("popup_project", level<2);
	
	sv.toggleById("cmd_startMacroMode", level<2);
	sv.toggleById("cmd_pauseMacroMode", level<2);
	sv.toggleById("cmd_stopMacroMode", level<2);
	sv.toggleById("cmd_executeLastMacro", level<2);
	sv.toggleById("cmd_saveMacroToToolbox", level<3);
	sv.toggleById("toolbox2_tools-a", level<3);
	sv.toggleById("historyRecentLocations", level<2);
	sv.toggleById("saveAllButton", level<2);
	
	sv.toggleById("menu_recentlyClosedTabs", level<2);
	sv.toggleById("file_saveAs_menu", level<2);
	sv.toggleById("menu_saveAll", level<2);
	sv.toggleById("menu_findInFiles", level<3);
	sv.toggleById("menu_replaceInFiles", level<3);
	sv.toggleById("menu_findInCurrProject", level<3);
	sv.toggleById("menu_replaceInCurrProject", level<3);
	sv.toggleById("menu_startIncrementalSearch", level<2);
	sv.toggleById("menu_clearSearchHighlighting", level<2);
	
	sv.toggleById("menu_indent", level<2);
	sv.toggleById("menu_dedent", level<2);
	sv.toggleById("menu_tabify", level<3);
	sv.toggleById("menu_untabify", level<3);
	sv.toggleById("menu_code_separator_1", level<3);
	sv.toggleById("codeConvert_menuseparator", level<3);
	sv.toggleById("codeConvert_menu", level<3);
	sv.toggleById("code_codeintel_menuseparator", level<3);
	sv.toggleById("code_keys_menuseparator", level<3);
	
	sv.toggleById("naviation_menupopup_separator_1", level<3);
	sv.toggleById("goToTab_menu", level<2);
	sv.toggleById("places_trackCurrentTab", level<3);
	//sv.toggleById("naviation_menupopup_separator_2", level<1);
	sv.toggleById("naviation_menupopup_find_separator", level<3);
	sv.toggleById("naviation_menupopup_bookmarks_separator", level<2);
	sv.toggleById("naviation_menupopup_scroll_separator", level<3);
	sv.toggleById("menu_editCenterVertically", level<3);
	
	// TODO: inactivate these items in the context menu too!
	sv.toggleById("menu_toggleButtonText", level<4);
	// Must also trigger the action => not that easy! if (level<4) checkById("menu_toggleButtonText", true);
	sv.toggleById("popup_toolbars_category_separator", level<4);
	// TODO: inactivate a couple of toolbars, too!!!
	
	sv.toggleById("menu_openStartPage", level<3);
	sv.toggleById("view_menu_splitview_menuseparator", level<2);
	sv.toggleById("menu_moveTab", level<2);
	sv.toggleById("menu_splitTab", level<2);
	sv.toggleById("menu_rotateSplitter", level<2);
	sv.toggleById("view_menu_editor_settings_menuseparator", level<2);
	sv.toggleById("menu_viewAsLanguage", level<2);
	sv.toggleById("menuitem_fullScreen", level<2);
	sv.toggleById("view_menu_menuseparator_2", level<2);
	
	sv.toggleById("menu_projectOpenProject", level<3);
	sv.toggleById("menu_recentProjects", level<2);
	sv.toggleById("menu_project_separator_1", level<3);
	sv.toggleById("menu_project_templates", level<3);
	//sv.toggleById("menu_project_separator_2", level<1);
	sv.toggleById("menu_closeAllProjects", level<3);
	sv.toggleById("menu_showProjectInPlaces", level<2);
	sv.toggleById("menu_revertProject", level<3);
	sv.toggleById("menu_project_separator_3", level<2);
	sv.toggleById("menu_projectProperties", level<2);
	
	sv.toggleById("menu_toolsRunCommand", level<3);
	sv.toggleById("menu_toolsRecentCommands", level<3);
	sv.toggleById("menu_macros", level<3);
	sv.toggleById("menu_invokeTool", level<3);
	sv.toggleById("menu_addons_separator", level<3);
	sv.toggleById("menu_watchThread", level<3);
	sv.toggleById("menu_compareFiles", level<3);
	
	sv.toggleById("r_start_pkg_manager", level<4);
	sv.toggleById("r_browse_wd", level<2);
	sv.toggleById("r_session_mgr", level<4);
	sv.toggleById("r_src_all_menu", level<2);
	sv.toggleById("r_send_block_menu", level<2);
	sv.toggleById("r_src_block_menu", level<2);
	sv.toggleById("r_send_para_menu", level<2);
	sv.toggleById("r_src_para_menu", level<3);
	sv.toggleById("r_send_function_menu", level<3);
	sv.toggleById("r_src_function_menu", level<2);
	
	sv.toggleById("menu_helpReleaseNotes", level<2);
	sv.toggleById("menu_helpLanguagesMenu", level<4);
	sv.toggleById("menu_tryKomodoIDE", level<4);
	sv.toggleById("support_separator", level<4);
	sv.toggleById("troubleshootingMenu", level<2);
	
	// Buffer context menu
	sv.toggleById("context-buffer-sep-paste", level<3);
	sv.toggleById("context-sep-paste", level<3);
	sv.toggleById("editor-context-sep-extensions", level<4);
	
	// R toolbar
	sv.toggleById("r_src_all_tool", level<2);
	sv.toggleById("r_send_block_tool", level<2);
	sv.toggleById("r_src_block_tool", level<2);
	sv.toggleById("r_send_para_tool", level<2);
	sv.toggleById("r_src_para_tool", level<3);
	sv.toggleById("r_send_function_tool", level<3);
	sv.toggleById("r_src_function_tool", level<2);
	
	// This does not work!!!
	//sv.toggleById("context-toolbox-menu", level<4);
	// Note how both the corresponding menu and toolbar items disappears or reappears!
	
	// Rework menus towards simplification
	// File -> New...
	try {
		var menuItem = document.getElementById("menu_file_newFile");
		if (level<3) {
			document.getElementById("popup_file").insertBefore(menuItem,
				document.getElementById("menu_file_new"));
			menuItem.setAttribute("label", "New");
		} else {
			document.getElementById("popup_filenew").insertBefore(menuItem,
				document.getElementById("menu_file_newFileFromTemplate"));
			menuItem.setAttribute("label", "New file...");
		}
		sv.toggleById("menu_file_new", level<3);
	} catch (e) { }
	
	// File -> Open...
	try {
		var menuItem = document.getElementById("menu_openFile");
		if (level<3) {
			document.getElementById("popup_file").insertBefore(menuItem,
				document.getElementById("menu_file_open"));
			menuItem.setAttribute("label", "Open...");
		} else {
			document.getElementById("popup_file_open").insertBefore(menuItem,
				document.getElementById("menu_openRemoteFile"));
			menuItem.setAttribute("label", "File...");
		}
		sv.toggleById("menu_file_open", level<3);
	} catch (e) { }

	// File -> Close...
	try {
		var menuItem = document.getElementById("close_tab_menuitem");
		if (level<3) {
			document.getElementById("popup_file").insertBefore(menuItem,
				document.getElementById("close_menu"));
			menuItem.setAttribute("label", "Close");
		} else {
			document.getElementById("close_menupopup").insertBefore(menuItem,
				document.getElementById("close_other_tabs_menuitem"));
			menuItem.setAttribute("label", "Current Tab");
		}
		sv.toggleById("close_menu", level<3);
	} catch (e) { }
	
	// Edit -> Select All...
	try {
		var menuItem = document.getElementById("menu_editSelectAll");
		if (level<2) {
			document.getElementById("popup_edit").insertBefore(menuItem,
				document.getElementById("edit_menu_select_menu"));
		} else {
			document.getElementById("edit_menu_select_menupopup").insertBefore(menuItem,
				document.getElementById("menu_blockSelect"));
		}
		//menuItem.setAttribute("label", "Select All");
		sv.toggleById("edit_menu_select_menu", level<2);
	} catch (e) { }
	
	// Indicate what happened
	var levels = ["beginner", "useR", "developeR", "full-Komodo"]; 
	ko.statusBar.AddMessage("User interface set to '" + levels[level - 1] + "'",
		"SciViews-K", 2000, true);
}

// If Komodo >= 6, change UI
// Done in sv.cmdout._init()
//if (!(ko.toolbox2 === undefined))
//	addEventListener("load", sv.reworkUI(), false);


//// Control the R output tab (was command output tab) /////////////////////////
if (typeof(sv.cmdout) == 'undefined') sv.cmdout = {};

// Append text to the Command Output pane
// Now, this is managed in a R Console pane!
// TODO: handle \b correctly to delete char up to the beginning of line
// TODO: what to do with \a? I already have a bell in R console...

(function() {
	var _this = this;
	var scimoz, eolChar;
	
	// Get the EOL character
	this.__defineGetter__('eolChar', function() {
		if (!eolChar) _init();
		return(eolChar);
	});
	
	// Initialize the scintilla window in the R Output
	function _init () {
		//var rcons2 = document.getElementById("rconsole-scintilla2");
		// In ko7, we need a different code!
        //if (rcons2 == null) rcons2 = document
        //    .getElementById("sciviews_rconsole_tab")
        //    .contentDocument.getElementById("rconsole-scintilla2");
		var rcons2 = ko.widgets.getWidget("sciviews_rconsole_tab")
			.contentDocument.getElementById("rconsole-scintilla2");
		// Format the scintilla window with same style as for the Komodo console
		try {
			var scintilla = rcons2.scintilla;
			scintilla.init();
			scintilla.language = "Errors";
		} catch(e) { } // We don't care of errors here (there are, because the
		//'Errors' language assumes that a terminal is linked to scintilla!)
		
		// Get a reference to scimoz
		scimoz = rcons2.scimoz;
		
		// What EOL (end of line) character is in use here?
		eolChar = ["\r\n", "\n", "\r"][scimoz.eOLMode];
		
		// Change a couple of other scimoz properties
		scimoz.wrapMode = scimoz.SC_WRAP_NONE;
		scimoz.caretStyle = scimoz.CARETSTYLE_INVISIBLE;
		scimoz.viewWS = false;
		scimoz.viewEOL = false;
		scimoz.readOnly = true;
		
		// Now, check if R is responding on the server port
		if (sv.r.test(true, true)) {
			// Force refreshing the object explorer
			// Use this instead???
		// Differ synching R <-> Komodo to avoid deadlock situation
		// That does not work!
		
			// Show a prompt
			_newPrompt();
			// ... and refresh R objects explorer
			// PhG: this seems to make problem => temporary disabled!
			//window.setTimeout("sv.robjects
			//	.getPackageList(true, true, true);", 500);
			//window.setTimeout("sv.r.test(true, true);", 500);
			//sv.r.eval("try(koRefresh(force = TRUE), silent = TRUE)");
		}
		sv.reworkUI()
	}
	
	// Append text to R output. Default behaviour like a terminal: scroll to end
	this.append = function (str, newline /* =true*/, scrollToEnd /* = true*/) {
		if (newline === undefined || newline == null) newline = true;
		if (scrollToEnd === undefined || scrollToEnd == null)
			scrollToEnd = true;
	
		if (!scimoz) _init();
		
		// Make sure R Output is visible
		try {
			ko.uilayout.ensureTabShown('sciviews_rconsole_tab', true);
		} catch(e) { } // We don't care if it fails, e.g., no buffer opened
		// TODO: should we use this instead in ko7?
		//try {
		//	ko.uilayout.ensurePaneShown('sciviews_rconsole_tab', true);
		//} catch(e) { } // We don't care if it fails, e.g., no buffer opened
		try {
			sv.rconsole.toggleView(1);
			ko.views.manager.currentView.setFocus();
		} catch(e) { } // We don't care if it fails, e.g., no buffer opened
	
		try {
			// Keep reference of last line: style new text from there
			var curline = scimoz.lineCount - 1;
			
			// Is the current position located in last line?
			var isLast = (scimoz
				.lineFromPosition(scimoz.currentPos) == curline);
			
			scimoz.readOnly = false;
			
			// Do we add a carriage return at the ne of the text?
			if (newline) str += eolChar;
			
			// Avoid double prompt: if prompt ':> ' or ':+ ' at the last line
			// and text to append also contains the same prompt, eliminate one
			var curprompt = scimoz.getTextRange(scimoz
				.positionFromLine(curline), scimoz.textLength);
			var strprompt = str.substr(0, 3);
			if (curprompt == ":> " && strprompt == ":> ") str = str.substr(3);
			if (curprompt == ":+ " && strprompt == ":+ ") str = str.substr(3);
			
			// Avoid one carriage return too much after a prompt (this is the case
			// with the socket server... and I don't know how to get rid of it!)
			str = str.replace(/:> [\n\r]*$/, ":> ");
			
			// Append this text
			var str_bytelength = ko.stringutils.bytelength(str);
			scimoz.appendText(str_bytelength, str);
			
			// Apply style to the new text
			var styleMask = (1 << scimoz.styleBits) - 1;
			var start, prompt;
			for (var i = curline; i < scimoz.lineCount; i++) { 
				start = scimoz.positionFromLine(i);
				prompt = scimoz.getTextRange(start, start + 3);
				scimoz.startStyling(start, styleMask);
				if (prompt == ":> " || prompt == ":+ ") {
					// This should be a command line
					scimoz.setStyling(scimoz.lineLength(i), 1);
				} else {
					// This should be output text
					scimoz.setStyling(scimoz.lineLength(i), 0);
				}
			}	
		} finally {
			// Move to the end of the document if caret was in the last line
			if (scrollToEnd && isLast) {
				scimoz.gotoPos(scimoz.length);
				scimoz.ensureVisible(scimoz.lineCount - 1);
			}
			scimoz.readOnly = true;
		}
	}
	
	// Clear text in the Output Command pane
	this.clear = function (all /*= false*/) {
		if (all === undefined || all == null) all = false;
		
		// No need to show the R Output here, right?	
		//try {
		//	ko.uilayout.ensureTabShown('sciviews_rconsole_tab', true);
		//	sv.rconsole.toggleView(1);
		//	ko.views.manager.currentView.setFocus();
		//} catch(e) {} // We don't care if it fails, e.g., no buffer opened
		
		var needPrompt = true;	
		if (!scimoz) {
			_init();
			needPrompt = false;
		}
		
		if (all) {
			// Recalculate output width
			var width = (Math.floor(window.innerWidth /
				scimoz.textWidth(0, "0")) - 7)
			// min = 66, max = 200 (otherwise, it is harder to read) 
			if (width < 66) width = 66;
			if (width > 200) width = 200;
			sv.r.width = width;
			_this.message("R output is cleared... - options(width = " +
				width + ") will be inserted");
		}
		if (needPrompt) _newPrompt();
	}	
	
	function _newPrompt () {
		try {
			scimoz.readOnly = false;
			scimoz.clearAll();
			// Show the default prompt
			var str = ":> ";
			var str_bytelength = ko.stringutils.bytelength(str);
			scimoz.appendText(str_bytelength, str);
			// Apply command line styling to it
			var styleMask = (1 << scimoz.styleBits) - 1;
			var start = scimoz.positionFromLine(0);
			scimoz.startStyling(start, styleMask);
			scimoz.setStyling(scimoz.lineLength(0), 1);
			// Move to the end of the prompt
			//scimoz.gotoPos(scimoz.length);
			//scimoz.ensureVisible(0);
			// PhG: if we do so, the R output panel is displaced by 3 chars to
			// the right at startup when reconnecting to an already running R
			// process. So, we move to the FIRST character instead!
			scimoz.gotoPos(0);
			scimoz.scrollCaret();
		} finally {
			scimoz.readOnly = true;
		}
	}
	
	// Display message on the R output message area
	this.message = function (msg /* =""*/, timeout /* =0*/,
		highlight /* =false*/) {
		if (msg === undefined || msg == null) msg = "";
		if (timeout === undefined || timeout == null) timeout = 0;
		if (highlight === undefined || highlight == null) highlight = false;
		
		// Make sure R Output is visible
		try {
			ko.uilayout.ensureTabShown('sciviews_rconsole_tab', true);
			sv.rconsole.toggleView(1);
			ko.views.manager.currentView.setFocus();
		} catch(e) { } // We don't care if it fails, e.g., no buffer opened
		
		//var rconsoleDesc = document.getElementById('rconsole-desc');
		// In ko7, we need a different code!
        //if (rconsoleDesc == null) rconsoleDesc = document
        //    .getElementById("sciviews_rconsole_tab")
        //    .contentDocument.getElementById("rconsole-desc");
		var rconsoleDesc = ko.widgets.getWidget("sciviews_rconsole_tab")
			.contentDocument.getElementById("rconsole-desc");
		
		rconsoleDesc.parentNode.style.backgroundColor =
			(highlight && msg) ? "highlight" : "";
		rconsoleDesc.style.color = "rgb(0, 0, 0)";
		var oldmsg = rconsoleDesc.getAttribute("value");
		rconsoleDesc.setAttribute("value", msg);
		window.clearTimeout(rconsoleDesc.timeout);
		if (timeout > 0) rconsoleDesc.timeout = window
			.setTimeout("sv.cmdout.message('" + oldmsg + "', 0);", timeout);
	}
	
	// In multiline mode, we temporarily print multiline command being
	// constructed, but once it is complete and evaluated by R, we got its
	// reworked version. So, we need to eliminate the temporary lines... This is
	// done here. Erase all lines starting with ':+ ' and the first one starting
	// with ':> '
	this.exitPartial = function () {
		if (!scimoz) _init();	
		try {
			scimoz.readOnly = false;
			var firstline = -1;
	
			var i = scimoz.lineCount - 1;
			// Allow for an empty line at the end
			if (scimoz.lineLength(i) == 0 && i > 0) i = i - 1;
			var pos = scimoz.positionFromLine(i);
			while (i >= 0 && scimoz.getTextRange(pos, pos + 3) == ":+ ") {
				var firstline = i;
				i = i -1; // Test previous line
				pos = scimoz.positionFromLine(i);
			}
			// Should take the line above also, but test it starts with ':> '
			if (firstline > 0) {
				pos = scimoz.positionFromLine(firstline - 1);
				if (scimoz.getTextRange(pos, pos + 3) == ":> ")
					firstline = firstline - 1;
				// Erase this temporary multiline command
				scimoz.setSel(scimoz.positionFromLine(firstline),
					scimoz.textLength);
				scimoz.replaceSel("");
			}
		} finally {
			scimoz.readOnly = true;
		}
	}
}).apply(sv.cmdout);


//// Logging management ////////////////////////////////////////////////////////
if (typeof(sv.log) == 'undefined') sv.log = {};

//const LOG_NOTSET = 0;	//const LOG_DEBUG = 10;	//const LOG_INFO = 20;
//const LOG_WARN = 30; 	//const LOG_ERROR = 40;	//const LOG_CRITICAL = 50;
// ko.logging.LOG_*

(function () {
	var logger = ko.logging.getLogger("SciViews-K");

	this.exception = function (e, msg, showMsg) {
		if (typeof(showMsg) != 'undefined' && showMsg == true)
			sv.alert("Error", msg);
		logger.exception(e, msg);
	}

	this.critical = function (msg) {
		logger.critical(msg);
	}

	this.error = function (msg) {
		logger.error(msg);
	}

	this.warn = function (msg) {
		logger.warn(msg);
	}

	this.warnStack = function (msg) {
		logger.deprecated(msg);
	}

	this.info = function (msg) {
		logger.info(msg);
	}

	this.debug = function (msg) {
		logger.debug(msg);
	}

	this.all = function (debug) {
		logger.setLevel(!!debug);
		if (logger.getEffectiveLevel() == 1) {
			ko.statusBar.AddMessage("SciViews error logging set to debug level",
				"svLog", 3000, true);
		} else {
			ko.statusBar.AddMessage("SciViews error logging set to level " +
				logger.getEffectiveLevel(), "svLog", 3000, true);
		}
	}

	this.isAll = function () {
		return(logger.getEffectiveLevel() == 1);
	}

	this.show = function () {
		var os = Components.classes['@activestate.com/koOs;1']
			.getService(Components.interfaces.koIOs);
		try {
			// Note that in Komodo 6, interpolateStrings is deprecated in favor
			// of interpolateString!
			var appdir = ko.interpolate
				.interpolateStrings('%(path:userDataDir)');
			var logFile = os.path.join(appdir,'pystderr.log');
			var winOpts =
				"centerscreen,chrome,resizable,scrollbars,dialog=no,close";
			window.openDialog('chrome://komodo/content/tail/tail.xul',
				"_blank", winOpts, logFile);
		} catch(e) {
			this.exception(e,
				"Unable to display the Komodo error log (" + e + ")", true);
		}
	}

}).apply(sv.log);

//sv.log.all(true);

//// Tests... default level do not print debug and infos!
//sv.log.all(false);
//alert(sv.log.isAll());
//try {
//   test = nonexistingvar;
//} catch(e) {sv.log.exception(e, "Test it exception"); }
//sv.log.critical("Test it critical");
//sv.log.error("Test it error");
//sv.log.warn("Test it warning");
//sv.log.info("Test it info");
//sv.log.debug("Test it debug");
//sv.log.warnStack("Test it warn with stack");
//// Set at debug/info level
//sv.log.all(true);
//alert(sv.log.isAll());
//sv.log.critical("Test it critical 2");
//sv.log.error("Test it error 2");
//sv.log.warn("Test it warning 2");
//sv.log.info("Test it info 2");
//sv.log.debug("Test it debug 2");
//sv.log.warnStack("Test it warn with stack 2");
//// Show Komodo log
//sv.log.show();
