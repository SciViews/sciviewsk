// SciViews-K miscellaneous functions
// Define the 'sv.misc' namespace
// Copyright (c) 2008-2010, Ph. Grosjean (phgrosjean@sciviews.org) & K. Barton
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// sv.misc.sessionData(data);       // Create/open a .csv dataset from session
// sv.misc.sessionScript(script);   // Create/open a .R script from session
// sv.misc.sessionReport(rep);      // Create/open a .odt report from session
// sv.misc.closeAllOthers();        // Close all buffer except current one
// sv.misc.colorPicker.pickColor(); // Invoke a color picker dialog box
// sv.misc.moveLineDown();          // Move current line down
// sv.misc.moveLineUp();            // Move current line up
// sv.misc.searchBySel();           // Search next using current selection
// sv.misc.showConfig();            // Show Komodo configuration page
// sv.misc.swapQuotes();            // Swap single/double quotes in selection
// sv.misc.pathToClipboard();       // Copy file path to clipboard
// sv.misc.unixPathToClipboard();   // Copy UNIX file path to clipboard
// sv.misc.timeStamp();             // Stamp text with current date/time
////////////////////////////////////////////////////////////////////////////////

// Define the 'sv.misc' namespace
if (typeof(sv.misc) == "undefined") sv.misc = {};

// Create or open a .csv dataset from session
sv.misc.sessionData = function (data) {
    if (data === undefined) {
        data = ko.dialogs.prompt(
            "Open or create a dataset in .csv format in the data session directory...",
            "Dataset name:", "Dataset", "Select a dataset", "datafile");
    }
    if (data != null & data != "") {
        var dataDir = sv.prefs.getPref("sciviews.data.localdir", "~");
        var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(dataDir);
        file.append(data + ".csv");
        if (!file.exists()) {
			file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 438);
			// Create a minimal content in this file
			var outputStream = Components
			    .classes["@mozilla.org/network/file-output-stream;1"]
				.createInstance( Components.interfaces.nsIFileOutputStream );
			/* Open flags
			#define PR_RDONLY       0x01
			#define PR_WRONLY       0x02
			#define PR_RDWR         0x04
			#define PR_CREATE_FILE  0x08
			#define PR_APPEND       0x10
			#define PR_TRUNCATE     0x20
			#define PR_SYNC         0x40
			#define PR_EXCL         0x80
			*/
			/*
			** File modes ....
			**
			** CAVEAT: 'mode' is currently only applicable on UNIX platforms.
			** The 'mode' argument may be ignored by PR_Open on other platforms.
			**
			**   00400   Read by owner.
			**   00200   Write by owner.
			**   00100   Execute (search if a directory) by owner.
			**   00040   Read by group.
			**   00020   Write by group.
			**   00010   Execute by group.
			**   00004   Read by others.
			**   00002   Write by others
			**   00001   Execute by others.
			*/
			outputStream.init(file, 0x04 | 0x08 | 0x20, 438, 0);
			var sep = sv.prefs.getPref("r.csv.sep", "\t");
            var content = '"var1"' + sep + '"var2"\n';
			var result = outputStream.write(content, content.length);
			outputStream.close();
        }
        try {
            file.launch();
        } catch(e) { // On Linux, this does not work...
            // First try nautilus, and then, try konqueror
            try {
                ko.run.runEncodedCommand(window, 'gnome-open "' +
                    file.path + '" & ');
            } catch(e) {
                ko.run.runEncodedCommand(window, 'kfmclient exec "' +
                    file.path + '" & ');
            }
        }
    }
    // Make sure lists of session files are refreshed
    sv.r.refreshSession();
}

// Create or open a .R script from session
sv.misc.sessionScript = function (script) {
    if (script === undefined) {
        script = ko.dialogs.prompt(
            "Open or create a R script in session directory...",
            "Script name:", "Script", "Select a script", "scriptfile");
    }
    if (script != null & script != "") {
        var scriptsDir = sv.prefs.getPref("sciviews.scripts.localdir",
            "~/Scripts");
        var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(scriptsDir);
        file.append(script + ".R");
        if (!file.exists())
            file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 438);
        ko.open.URI(file.path);
    }
    // Make sure lists of session files are refreshed
    sv.r.refreshSession();
}

// Create or open a .odt report from session
sv.misc.sessionReport = function (rep) {
    if (rep === undefined) {
        rep = ko.dialogs.prompt(
            "Open or create an .odt report in session directory...",
            "Report name:", "Report", "Select a report", "reportfile");
    }
    if (rep != null & rep != "") {
        var reportsDir = sv.prefs.getPref("sciviews.reports.localdir",
            "~/Reports");
        var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
        file.initWithPath(reportsDir);
        file.append(rep + ".odt");
        if (!file.exists()) {
            // Copy the report template from SciViews-K templates
            // Note that in Komodo 6, interpolateStrings is deprecated in favor of interpolateString!
			var tpl = ko.interpolate.
                interpolateStrings("%(path:userDataDir)");
            var os = Components.classes['@activestate.com/koOs;1'].
                getService(Components.interfaces.koIOs);
        if (os.sep == "/") {
            tpl += "/XRE/extensions/sciviewsk@sciviews.org/templates/Report.odt";
        } else {
            // We should be under Windows
            tpl += "\\XRE\\extensions\\sciviewsk@sciviews.org\\templates\\Report.odt";
        }
        file.initWithPath(tpl);
        var dir = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
        dir.initWithPath(reportsDir);
        try {
            file.copyTo(dir, rep + ".odt");
        } catch(e) {
            sv.log.exception(e, "Error while retrieving the default Report.odt template" +
				" (sv.misc.sessionReport)", true);
            alert("Error while retrieving the default Report.odt template.")
        }
        file.initWithPath(reportsDir);
        file.append(rep + ".odt");
        }
        // This would be to force using OpenOffice Writer (on Linux?)
        // ko.run.runEncodedCommand(window, 'oowriter -o "' + file.path + '" & ');
        try {
            file.launch();
        } catch(e) { // On Linux, this does not work...
            // First try nautilus, and then, try konqueror
            try {
                ko.run.runEncodedCommand(window, 'gnome-open "' +
                    file.path + '" & ');
            } catch(e) {
                ko.run.runEncodedCommand(window, 'kfmclient exec "' +
                    file.path + '" & ');
            }
        }
    }
    // Make sure lists of session files are refreshed
    sv.r.refreshSession();
}

// Close all buffers except current one (an start page)
sv.misc.closeAllOthers = function () {
    try {
        var currentView = ko.views.manager.currentView;
        if (currentView) {
			currentView.scintilla.focus();
			var views = ko.views.manager.topView.getDocumentViews(true);
			for (var i = views.length - 1; i >= 0; i--) {
                var thisView = views[i];
				// Exclude the Start Page from "Close All".
				if (thisView.getAttribute("type") != "startpage"
                    && thisView != currentView) {
                    if (!thisView.close()) return(false);
                }
            }
        }
    } catch(e) {
        sv.log.exception(e, "sv.misc.closeAllOthers() error");
    }
	return(null);
}

/*
 * JavaScript macro to provide a basic color picker for hexadecimal colors.
 * Assign a useful keybinding to this macro and ka-zam, funky color picking!
 *
 * Version: 1.0
 *
 * Authored by: David Ascher
 * Modified by: Shane Caraveo
 *              Todd Whiteman
 *              Philippe Grosjean
 *              Kamil Barton
 */
sv.misc.colorPicker = {};

(function () {

var os_prefix = window.navigator.platform.substring(0, 3).toLowerCase();

if ((os_prefix == "win") || (os_prefix == "mac")) {

	function _colorPicker_system (color) {
		var sysUtils = Components.classes['@activestate.com/koSysUtils;1'].
			getService(Components.interfaces.koISysUtils);
		if (!color) color = "#000000";
		// sysUtils.pickColor seems to be broken, does not return any value
		// which is strange, because it is only wrapper for
		// .pickColorWithPositioning,
		// Moreover, positioning does not seem to work anyway.
		var newcolor = sysUtils.pickColorWithPositioning(color, -1, -1);
		//Note pickColor was fixed in Komodo 5.2.3

		if (newcolor) {
		   var scimoz = ko.views.manager.currentView.scimoz;
		   scimoz.replaceSel(newcolor);
		   scimoz.anchor = scimoz.currentPos;
		}
	}

	this.pickColor = function () {
		var currentView = ko.views.manager.currentView;
		if (currentView) {
			currentView.scintilla.focus();
			var color = sv.getTextRange("word", false, true, null, "#");
			try {
				color = "#" + color.match(/[0-9A-F]{6}/i)[0].toLowerCase();
			} catch(e) {
				color = "#ffffff";
			}
			_colorPicker_system(color);
		}
	}

} else {

	function _colorPicker_onchange (event, cp) {
		var scimoz = ko.views.manager.currentView.scimoz;
		scimoz.insertText(scimoz.currentPos, cp.color);
		// Move cursor position to end of the inserted color
		// Note: currentPos is a byte offset, so we need to correct the length
		var newCurrentPos = scimoz.currentPos +
			ko.stringutils.bytelength(cp.color);
		scimoz.currentPos = newCurrentPos;
		// Move the anchor as well, so we don't have a selection
		scimoz.anchor = newCurrentPos;
		// For some reason we get the event twice, removing
		// onselect fixes the problem.  Tried to solve it
		// by canceling the event below, but it went on anyway
		cp.removeAttribute('onselect');
		cp.parentNode.hidePopup();

		event.preventDefault();
		event.stopPropagation();
		event.cancelBubble = true;
		_colorPicker_remove();
	}

	function _colorPicker_remove () {
		// remove the popup from the document. This cleans up so
		// we can change the macro code if needed
		var p = document.getElementById('popup_colorpicker');
		if (p)
			p.parentNode.removeChild(p);
	}

	function _colorPicker_init () {
		_colorPicker_remove();
		var p = document.createElement('popup');
		p.setAttribute('id', 'popup_colorpicker');
		var cp = document.createElement('colorpicker');
		cp.colorChanged = _colorPicker_onchange;
		cp.setAttribute('onselect', 'this.colorChanged(event, this);');
		p.appendChild(cp);
		document.documentElement.appendChild(p);
	}

	this.pickColor = function () {
		var currentView = ko.views.manager.currentView;
		if (currentView) {
			currentView.scintilla.focus();
			_colorPicker_init();
			var scimoz = currentView.scimoz;
			var pos = scimoz.currentPos;
			var x = scimoz.pointXFromPosition(pos);
			var y = scimoz.pointYFromPosition(pos);
			var boxObject = currentView.boxObject;
			var cp = document.getElementById('popup_colorpicker');
			cp.showPopup(currentView.scintilla,
				x + boxObject.x, y + boxObject.y,
				'colorpicker',"topleft","topleft");
		}
	}
}

}).apply(sv.misc.colorPicker);

// Move Line Down, adapted by Ph. Grosjean from code by "mircho"
sv.misc.moveLineDown = function () {
    var currentView = ko.views.manager.currentView;
    if (currentView) {
        currentView.scintilla.focus();
        var ke = currentView.scimoz;
        var currentLine = ke.lineFromPosition(ke.currentPos);
        // Check if we are not at the last line
        if (currentLine < (ke.lineCount - 1)) {
            ke.lineDown();
            ke.lineTranspose();
        }
    }
}

// Move Line Up, adapted by Ph. Grosjean from code by "mircho"
sv.misc.moveLineUp = function () {
    var currentView = ko.views.manager.currentView;
    if (currentView) {
        currentView.scintilla.focus();
        var ke = currentView.scimoz;
        var currentLine = ke.lineFromPosition(ke.currentPos);
        // Check if we are not at the first line
        if (currentLine > 0) {
            ke.lineTranspose();
            ke.lineUp();
        }
    }
}

// Search next using current selection
sv.misc.searchBySel = function () {
    var currentView = ko.views.manager.currentView;
    if (currentView) {
        currentView.scintilla.focus();
        var ke = currentView.scimoz;
        var searchText = ke.selText;
        if (!searchText.length) {
            // Use last pattern used
            searchText = ko.mru.get("find-patternMru");
        }

        // Search with last user find preferences
        var findSvc = Components.classes["@activestate.com/koFindService;1"]
            .getService(Components.interfaces.koIFindService);
        var context = Components.classes["@activestate.com/koFindContext;1"]
            .createInstance(Components.interfaces.koIFindContext);
        context.type = findSvc.options.preferredContextType;
        Find_FindNext(window, context, searchText);
    }
}

// Show current Komodo configuration page
sv.misc.showConfig = function () {
    try {
        ko.open.URI('about:config','browser');
    } catch(e) {
        sv.log.exception(e, "sv.misc.showConfig() error");
    }
}

// Swap quotes by 'Nicto', adapted in SciViews-K by Ph. Grosjean
sv.misc.swapQuotes = function() {
    try {
        var currentView = ko.views.manager.currentView;
        if (currentView) {
            currentView.scintilla.focus();
            var scimoz = currentView.scimoz;
            scimoz.beginUndoAction();

            // Retain these so we can reset the selection after the replacement
            var curAnchor = scimoz.anchor;
            var curPos = scimoz.currentPos;

            // Replace the currently selected text
            scimoz.replaceSel (
                // Find all single and double quote characters
                scimoz.selText.replace( /[\'\"]/g, function (value) {
                    // Return whatever the value isn't
                    return(value == '"' ? "'" : '"');
                })
            );

            // Reset the selection
            scimoz.setSel(curAnchor, curPos);
        }
    } catch (e) {
        sv.log.exception(e, "sv.misc.swapQuotes() error");
    } finally {
        ko.views.manager.currentView.scimoz.endUndoAction();
    }
}

// Copy the path of current file to the clipboard
sv.misc.pathToClipboard = function (unix) {
    var ch = Components.classes["@mozilla.org/widget/clipboardhelper;1"].
        getService(Components.interfaces.nsIClipboardHelper);
    try {
        var path = ko.views.manager.currentView.koDoc.file.path;
		if (unix) path = path.replace(/\\/g, "/");
		ch.copyString(path);
    } catch(e) {
        sv.alert("Copy path to clipboard",
            "Unable to copy file path to clipboard (unsaved file?)")
    }
}

// Copy UNIX version (using '/' as sep) path of current file to the clipboard
sv.misc.unixPathToClipboard = function ()
	sv.misc.pathToClipboard(true);

// Stamp the current text with date - time
sv.misc.timeStamp = function (format) {
    try {
        var ke = ko.views.manager.currentView.scimoz;

		// Adapted from setDateFormatExample() in
		// chrome://komodo/content/pref/pref-intl.js
		var timeSvc = Components.classes["@activestate.com/koTime;1"]
			.getService(Components.interfaces.koITime);
		var secsNow = timeSvc.time();
		var timeTupleNow = timeSvc.localtime(secsNow, new Object());
		if (!format) format = sv.prefs.getPref("defaultDateFormat");
		var timeStr = timeSvc.strftime(format, timeTupleNow.length, timeTupleNow);
		ke.replaceSel(timeStr);
    } catch(e) {
        sv.log.exception(e, "sv.misc.timeStamp() error");
    }
}
