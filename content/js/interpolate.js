// SciViews-K interpolation function, and other rewritten Komodo functions
// Copyright (c) 2009-2015, Ph. Grosjean (phgrosjean@sciviews.org)
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// svWindowPatcher() and svWindowObserver() allow for patching Komodo windows
//   when it is not possible to change stuff hardwired in the XUL template
//   of the window otherwise (like for the iconpicker's icons families)
// ko.interpolate.interpolate();  	// A reworked version of the Komodo function
//   with more features needed by R code snippets (contextual help, description,
//   tooltips, ...)
////////////////////////////////////////////////////////////////////////////////

// Some Komodo windows hardwire content that we would like to change for
// SciViews-K, like the iconpicker window that statically defines the list of
// available icon families. This is not very nice since we want to add a new
// family there!
// The only solution I found (there must be others, for sure) to change this
// is to add a window opening listener that adds a loading listener to the
// window and change stuff if it is the targetted window

var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
	.getService(Components.interfaces.nsIWindowMediator);

// This function patches targetted Komodo windows after they load
// TODO: consider nex icons introduced in Komodo 6 and 7!
function svWindowPatcher () {
	var win = wm.getMostRecentWindow(null);
	var XUL = win.location.href;
	// If this is the iconpicker window, patch it now
	if (XUL == "chrome://komodo/content/dialogs/iconpicker.xul") {
		// We want to add a new iconset family to this dialog box
		var iframe = win.document.getElementById("iframe");
		iframe.setAttribute("src",
			"chrome://sciviewsk/skin/icons/Applications.html");
		var families = win.document.getElementById("icon-families");
		// We change the two existing families
//		var firstfam = families.firstChild.firstChild;
//		firstfam.setAttribute("label", "Applications");
//		firstfam.setAttribute("src",
//			"chrome://sciviewsk/skin/icons/Applications.html");
		var nextfam = families.firstChild.lastChild;
//		nextfam.setAttribute("label", "Arrows");
//		nextfam.setAttribute("src",
//			"chrome://sciviewsk/skin/icons/Arrows.html");
		// Add other icon families
//		var family = <menuitem label="Books and Notes"
//			src="chrome://sciviewsk/skin/icons/BooksAndNotes.html"/>;
		
//		var parser = new DOMParser
//		var family = parser.parseFromString('<menuitem label="Books and Notes"\n' +
//			'src="chrome://sciviewsk/skin/icons/BooksAndNotes.html"/>', "text/xml");
		//var menuitem = document.createElement("menuitem");
		families.appendItem("Applications (SciViews-K)");
		//sv.tools.e4x2dom.appendTo(family, families.firstChild);
		nextfam = families.firstChild.lastChild;
		//nextfam.setAttribute("label", "Books and Notes (SciViews-K)");
		nextfam.setAttribute("src", "chrome://sciviewsk/skin/icons/Applications.html");
		
//		families.appendItem("Books and Notes (SciViews-K)");
//		//sv.tools.e4x2dom.appendTo(family, families.firstChild);
//		nextfam = families.firstChild.lastChild;
//		//nextfam.setAttribute("label", "Books and Notes (SciViews-K)");
//		nextfam.setAttribute("src", "chrome://sciviewsk/skin/icons/BooksAndNotes.html");



//		family = <menuitem label="Bullets and Signs"
//			src="chrome://sciviewsk/skin/icons/BulletsAndSigns.html"/>;
//		sv.tools.e4x2dom.appendTo(family, families.firstChild);
//		family = <menuitem label="Communication"
//			src="chrome://sciviewsk/skin/icons/Communication.html"/>;
//		sv.tools.e4x2dom.appendTo(family, families.firstChild);
//		family = <menuitem label="Computing"
//			src="chrome://sciviewsk/skin/icons/Computing.html"/>;
//		sv.tools.e4x2dom.appendTo(family, families.firstChild);
//		family = <menuitem label="Database and Network"
//			src="chrome://sciviewsk/skin/icons/DatabaseAndNetwork.html"/>;
//		sv.tools.e4x2dom.appendTo(family, families.firstChild);
//		family = <menuitem label="Drawing"
//			src="chrome://sciviewsk/skin/icons/Drawing.html"/>;
//		sv.tools.e4x2dom.appendTo(family, families.firstChild);
//		family = <menuitem label="Files and Folders"
//			src="chrome://sciviewsk/skin/icons/FilesAndFolders.html"/>;
//		sv.tools.e4x2dom.appendTo(family, families.firstChild);
//		family = <menuitem label="Hardware"
//			src="chrome://sciviewsk/skin/icons/Hardware.html"/>;
//		sv.tools.e4x2dom.appendTo(family, families.firstChild);
//		family = <menuitem label="Miscellaneous"
//			src="chrome://sciviewsk/skin/icons/Miscellaneous.html"/>;
//		sv.tools.e4x2dom.appendTo(family, families.firstChild);
//		family = <menuitem label="Multimedia"
//			src="chrome://sciviewsk/skin/icons/Multimedia.html"/>;
//		sv.tools.e4x2dom.appendTo(family, families.firstChild);
//		family = <menuitem label="SciViews"
//			src="chrome://sciviewsk/skin/icons/SciViews.html"/>;
//		sv.tools.e4x2dom.appendTo(family, families.firstChild);
//		family = <menuitem label="Text and Tables"
//			src="chrome://sciviewsk/skin/icons/TextAndTables.html"/>;
//		sv.tools.e4x2dom.appendTo(family, families.firstChild);
//		family = <menuitem label="Time and Money"
//			src="chrome://sciviewsk/skin/icons/TimeAndMoney.html"/>;
//		sv.tools.e4x2dom.appendTo(family, families.firstChild);
//		family = <menuitem label="Tools"
//			src="chrome://sciviewsk/skin/icons/Tools.html"/>;
//		sv.tools.e4x2dom.appendTo(family, families.firstChild);
		
//		// Keep Open Office family, but place it at the end of the list
//		family = <menuitem label="[Open Office Icons]"
//			src="chrome://openoffice/content/industrial.html"/>;
//		sv.tools.e4x2dom.appendTo(family, families.firstChild);
		
		// Add a pointer to the icon makers web sites (required by fugue and
		// diagona icons)
		var label = win.document.getElementById("iconlabel");
		label.setAttribute("value",
			"Many icons are from http://www.famfamfam.com/ and http://www.pinvoke.com/");
		//var desc = <description>
        //	Icons mainly from the FamFamFam Silk series
		//	(http://www.famfamfam.com/lab/icons/silk/), from Pinvoke Fugue or
		//	Diagona series (http://www.pinvoke.com/), or adapted/created for
		//	SciViews-K and distributed under a Creative Commons Attribution 2.5
		//	or 3.0 License (see readme.txt files).
		//</description>;
		//sv.tools.e4x2dom.appendTo(family, win.document);
	}
}

// This function listen to Mozilla windows opening
function svWindowObserver() {
	this.observe = function(aSubject, aTopic, aData) {
		if (aTopic == "domwindowopened") {
			wm.getMostRecentWindow(null)
				.addEventListener("load", svWindowPatcher, false);
		}
	}
}
 
var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Components.interfaces.nsIWindowWatcher);
ww.registerNotification(new svWindowObserver());

/**
  *  * Interpolate '%'-escape codes in the given list(s) of strings.
  *
  *  "editor" is a reference the komodo.xul window.
  *  "strings" is a list of raw strings to interpolate.
  *  "bracketedStrings" is a list of raw strings to interpolate, using the bracketed form
  *  "queryTitle" (optional) is a title for the possible query dialog raised
  *      during interpolation.
  *  "viewData" (optional) allows one to override specific view data used for
  *      interpolation. By default view data is retrieved from the current view.
  *      This may not always be appropriate. It may be an object with one or
  *      more of the following attributes:
  *          "fileName" is the filename of the current file (null, if N/A);
  *          "lineNum" is the current line number (0, if N/A);
  *          "word" is the current word under cursor (null if none);
  *          "selection" is the current selection (null if none).
  *
  * On success, this function returns a *double* list of interpolated strings:
  * For each string in "strings" and "bracketedStrings" two strings are
  * returned. The first is the interpolated string for use and the second for
  * *display*. In most cases these are the same but they may differ, for
  * example, if a password query response was interpolated into the string which
  * should not be displayed in the Komodo UI.
  *
  * Otherwise an exception is raised and an error set on the last error service:
  *      koILastError errno      reason
  *      ----------------------- -----------------------------------------
  *      NS_ERROR_ABORT          User cancelled the query dialog.
  *      NS_ERROR_INVALID_ARG    A normal interpolation failure because of
  *                              invalid interp code usage.
  */
ko.interpolate.interpolate2 = function Interpolate_interpolate(editor, strings,
	bracketedStrings,
    queryTitle /* =null */,
	viewData /* =<determined from current view> */)
{
    try {
    if (typeof(queryTitle) == 'undefined') queryTitle = null;
	log.info("interpolate.interpolate(editor, strings=[" + strings +
        "], bracketedStrings=[" + bracketedStrings + "], queryTitle='" +
        queryTitle + "', viewData)");
	viewData = ko.interpolate.getViewData(editor, viewData);

    var lastErrorSvc = Components.classes["@activestate.com/koLastErrorService;1"]
        .getService(Components.interfaces.koILastErrorService);

    // PhG: interpolation step 0: eliminate [[%tr:...]] used to tag strings
	// to be translated
	try {
		var brStr = bracketedStrings[0];
		// Replace [[%tr:some string]] by some string
		brStr = brStr.replace(/\[\[%tr:([^\]\]]+)\]\]/g, "$1");
		// Replace [[%ask:x:%tr:x-value]] by [[%ask:x:x-value]]
		brStr = brStr.replace(/%tr:/g, "");
		bracketedStrings[0] = brStr;
	} catch(e) { }
	
	// Interpolation step 1: get queries.
    var queriesCountObj = new Object();
    var queriesObj = new Array();
    var i1countObj = new Object();
    var i1stringsObj = new Array();

    //XXX The prefset used may need to be the project prefs at some point in
    //    the future, for now we'll stick with the current view's prefset.
    var iSvc = Components.classes["@activestate.com/koInterpolationService;1"]
        .getService(Components.interfaces.koIInterpolationService);
    iSvc.Interpolate1(strings.length, strings,
                      bracketedStrings.length, bracketedStrings,
                      viewData.fileName, viewData.lineNum,
                      viewData.word, viewData.selection,
                      viewData.projectFile,
                      viewData.prefSet,
                      queriesCountObj, queriesObj,
                      i1countObj, i1stringsObj);
    var queries = queriesObj.value;
    var istrings = i1stringsObj.value;

    // Ask the user for required data. (If there are no queries then we are
    // done interpolating)
    if (queries.length != 0) {
        var obj = new Object();
        obj.queries = queries;
        obj.title = queryTitle;
		// PhG: this is added to allow access to sv... functions
		obj.sv = sv;
        
		// PhG: replaced this by my own dialog box with extra features
		//window.openDialog("chrome://komodo/content/run/interpolationquery.xul",
        window.openDialog("chrome://sciviewsk/content/Rinterpolationquery.xul",
		    "Komodo:InterpolationQuery", "chrome,modal,titlebar", obj);
        if (obj.retval == "Cancel") {
            var errmsg = "Interpolation query cancelled.";
            lastErrorSvc.setLastError(Components.results.NS_ERROR_ABORT, errmsg);
            throw(errmsg);
        }

        // Interpolation step 2: interpolated with answered queries.
        var i2countObj = new Object();
        var i2stringsObj = new Array();
        iSvc.Interpolate2(istrings.length, istrings, queries.length, queries,
            i2countObj, i2stringsObj);
        istrings = i2stringsObj.value;
    }

	// PhG: If there is a end indicator in the snippet (______ at the start
	// of a line), then cut the string there
	for (var i = 0; i < istrings.length; i++) {
		//istrings[i] = istrings[i].replace(/[\n\r]{1,2}.*$/, "");
		// Do we need to eliminate a part of the snippet?
		var isplit = istrings[i].split(/[\n\r]{1,2}______/);
		if (isplit.length > 1) {
			// Keep only first part
			istrings[i] = isplit[0];
			// The string must contain both !@#_currentPos and !@#_anchor
			if (istrings[i].indexOf("!@#_currentPos") == -1) {
				// If !@#_anchor is there, add !@#_currentPos at the end
				if (istrings[i].indexOf("!@#_anchor") > -1)
					istrings[i] = istrings[i] + "!@#_currentPos";
			} else { // !@#_currentPos is there, make sure !@#_anchor is also there
				if (istrings[i].indexOf("!@#_anchor") == -1)
					istrings[i] = istrings[i] + "!@#_anchor";
			}
		}
	}

    log.info("interpolate.interpolate: istrings=[" + istrings + "]");
    return(istrings);
    } catch(e) {
        log.exception(e);
        throw(e);
    }
}
