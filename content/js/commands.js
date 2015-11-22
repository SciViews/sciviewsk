// SciViews-K command functions
// Define the 'sv.command' namespace
// Copyright (c) 2009-2012, K. Barton & Ph. Grosjean (phgrosjean@sciviews.org)
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// sv.command.RHelpWin;         // Reference to the R Help window
// sv.command.configureR();     // Configure the R interpreter
// sv.command.startR();			// Start the preferred R app and connect to it
// sv.command.updateRStatus(running); // Update window status about R running
// sv.command.openPkgManager(); // Open the package manager window
// sv.command.openSessionMgr(); // Open the session manager window
// sv.command.openHelp(uri);    // Open the R Help window at this web page
// sv.command.closeHelp();      // Close -help tab
// sv.command.svController();   // Controller for R related commands
//
//// sv.command.places /////////////////////////////////////////////////////////
// sv.command.places.sourceSelection();       // Source selected file(s) in R
// sv.command.places.anyRFilesSelected();     // Any R file currently selected?
// sv.command.places.loadSelection();         // Load selected .Rdata file(s)
// sv.command.places.anyRDataFilesSelected(); // Any RData file selected? 
////////////////////////////////////////////////////////////////////////////////

if (typeof(sv) == 'undefined') sv = {};
if (typeof(sv.command) == 'undefined') sv.command = {};

// sv.command object constructor
(function () {
	this.RHelpWin = null;  // A reference to the R Help Window
	var _this = this;
	// TODO: code from SciViews-K-dev to integrate
	//this.RProcess = null;

//// Private methods ///////////////////////////////////////////////////////////
	// Get a window, knowing its URI
	function _getWindowByURI(uri) {
		var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
			.getService(Components.interfaces.nsIWindowMediator);
		var en = wm.getEnumerator("");
		if (uri) {
			var win;
			while (en.hasMoreElements()) {
				win = en.getNext();
				if (win.location.href == uri) return(win);
			}
		}
		return(null);
	}

	// Get reference to a window, opening it if is closed
	function _getWindowRef(uri, name, features, focus) { //, ...
		var win = _getWindowByURI(uri);
		if (!win || win.closed) {
			try {
				var args = Array.apply(null, arguments);
				args = args.slice(0, 3).concat(args.slice(4));
				// Default characteristics for the window
				if (!features) args[2] = "chrome,modal,titlebar";
				win = window.openDialog.apply(null, args);
			} catch (e) {
				sv.log.exception(e, "Error opening window: " + uri);
			}
		}
		if (focus) win.focus();
		return(win);
	}

	// A temporary work-around for something that does not work!
	//function _isRRunning () {
	//	return(sv.r.running);
	//}
	function _isRRunning () { return(true); }

	// TODO: code from SciViews-K-dev to integrate...
	//function _RControl_supported () {
	//	var currentView = ko.views.manager.currentView;
	//	if (!currentView || !currentView.koDoc) return(false);
	//	//return(_isRRunning() && currentView.koDoc.language == "R");
	//	return(currentView.koDoc.language == "R");
	//}
	//
	//function _RControlSelection_supported () {
	//	var currentView = ko.views.manager.currentView;
	//	if (!currentView || !currentView.scimoz) return(false);
	//	return (_RControl_supported() &&
	//		((currentView.scimoz.selectionEnd -
	//		currentView.scimoz.selectionStart) != 0));
	//}
	//
	//var _observerSvc = Components.classes['@mozilla.org/observer-service;1']
	//	.getService(Components.interfaces.nsIObserverService);
	//
	//function _ProcessObserver (command, process, callback) {
	//	this._command = command;
	//	this._process = process;
	//	this._callback = (callback || function() {});
	//
	//	_observerSvc.addObserver(this, 'run_terminated', false);
	//	try {
	//		this._process.wait(0);
	//		this.cleanUp();
	//	} catch (e) {};
	//};
	//_ProcessObserver.prototype = {
	//	observe: function (child, topic, command) {
	//		if ('run_terminated' === topic && this._command === command) {
	//			this.cleanUp();
	//			this._process = null;
	//		}
	//		//else if (topic === 'status_message' && (subject.category == "run_command")
	//		//	&& ((matches = subject.msg.match(/^(['`"])(.+)\1 returned ([0-9]+).$/)) != null
	//		//		&& matches[2] == this.command)) {
	//		//	/*...
	//		//	TODO: cleanUp - observer status_message
	//		//	....*/
	//		//}
	//	},
	//	
	//	cleanUp: function () {
	//		if (this._command) {
	//			_observerSvc.removeObserver(this, 'run_terminated');
	//			this._command = null;
	//		}
	//		if (this._process) {
	//			var processExitCode = this._process.wait(-1),
	//			processOutput = (this._process.getStdout() ||
	//				this._process.getStderr());
	//			this._callback(processExitCode, processOutput, this._process);
	//			this._process = null;
	//		}
	//	},
	//	
	//	kill: function () {
	//		if (this._command) {
	//			_observerSvc.removeObserver(this, 'run_terminated');
	//			this._command = null;
	//		}
	//		if (this._process) {
	//			this._process.kill(-1);
	//			this._process = null;
	//		}
	//	}
	//}
	//
	//_RterminationCallback = function (exitCode) {
	//	// Do something here...
	//	sv.addNotification("SciViews-R is closed with code " + exitCode,
	//		2000, true);
	//	_this.updateRStatus(false);
	//}


//// Public methods ////////////////////////////////////////////////////////////
	// Display R interpreter configuration panel
	this.configureR = function () {
		prefs_doGlobalPrefs("svPrefRItem", true);
	}

	// Start R
	// TODO: startR() is different in SciViews-K-dev => look how to rework!
	this.startR = function () {
		// Check if R is not already running and servicing on server port
		try {
			if (sv.r.test(false, false, true)) {
				ko.statusBar.AddMessage("R is already running!", "SciViews-K",
					3000, true);
				return;
			}
		} catch(e) { }

		var cwd = sv.tools.file.path("ProfD", "extensions",
			"sciviewsk@sciviews.org", "defaults");
		var cmd = sv.prefs.getPref("svRCommand");

		// Remove /defaults/00LOCK if remained after a fail-start
		try {
			var lockFile = sv.tools.file.getfile(cwd, "00LOCK");
			if (lockFile.exists()) lockFile.remove(true);
		} catch(e) { }

		// On Mac OS X, R.app is not a file, but a dir!
		if (!cmd || (sv.tools.file.exists(sv.tools.strings.trim(
			sv.prefs.getPref("sciviews.r.interpreter"))) ==
			sv.tools.file.TYPE_NONE)) {
			if (ko.dialogs.okCancel(sv.translate("R interpreter is not" +
				" (correctly) configured in Preferences. Do you want to do it now?"),
				"OK", null, "SciViews-K") == "OK") {
				this.configureR();
			}
			return;
		}

		// Default R program depends on the platform
		var isWin = navigator.platform.indexOf("Win") === 0;
		var id = sv.prefs.getPref("sciviews.r.batchinterp",
			isWin? "r-gui" : "r-terminal");

		// Width of R output defined to fit R output panel (min = 66, max = 200)
		//var rcons = document.getElementById("rconsole-scintilla2");
		// In ko7, we need a different code!
		//if (rcons == null) rcons = document
		//	.getElementById("sciviews_rconsole_tab")
		//	.contentDocument.getElementById("rconsole-scintilla2");	
		var rcons = ko.widgets.getWidget("sciviews_rconsole_tab")
				.contentDocument.getElementById("rconsole-scintilla2");
		var scimoz = rcons.scimoz;
		var width = (Math.floor(window.innerWidth /
			scimoz.textWidth(0, "0")) - 7)
		if (width < 66) width = 66;
		if (width > 200) width = 200;

		var rType = sv.prefs.getPref("sciviews.r.type", "http");
		var env = [
			"koId=" + sv.prefs.getPref("sciviews.ko.id", "SciViewsK"),
			"koHost=localhost",
			"koActivate=FALSE",
			"Rinitdir=" + sv.prefs.getPref("sciviews.session.dir", "~"),
			"koType=" + rType,
			"koServe=" + sv.prefs.getPref("sciviews.r.port", 8888),
			"koPort=" + sv.prefs.getPref("sciviews.ko.port", 7052),
			"koKotype=" + sv.prefs.getPref("sciviews.ko.type", "file"),
			"koDebug=" + String(sv.socket.debug).toUpperCase(),
			"koAppFile=" + sv.tools.file.path("binDir", "komodo" +
				(isWin? ".exe" : "")),
			"OutDec=" + sv.prefs.getPref("r.csv.dec", "."),
			"OutSep=" + sv.prefs.getPref("r.csv.sep", ","),
			"width=" + width
		];
		var runIn = "no-console";
		env.push("Rid=" + id);

		switch (id) {
			case "r-tk":
				env.push("Rid=R-tk");
				// Set DISPLAY only when not set:
				var XEnv = Components.classes["@activestate.com/koEnviron;1"]
					.createInstance(Components.interfaces.koIEnviron);
				if (!XEnv.has("DISPLAY")) env.push("DISPLAY=:0");
				delete(XEnv);
				break;

			case "r-terminal":
				runIn = "new-console";
				break;
			default:
		}

		ko.run.runCommand(window, cmd, cwd, env.join("\n"), false,
			false, false, runIn, false, false, false);

		// Register observer of application termination
		this.rObserver = new AppTerminateObserver(cmd);

		// Ensure the R type is correct for everyone
		sv.socket.setSocketType(rType);

		// ... make sure to start with a clear R Output window
		sv.cmdout.clear(false);
		
		// Change menus now
		_this.updateRStatus(true);
	}

	// This will observe status message notification to be informed about
	// application being terminated. A more straightforward way would be to use
	// runService.RunAndNotify but this wouldn't allow to start app in a console
	// window. So we have to do this trick here.
	function AppTerminateObserver (command) {
		this.register(command);
	};
	
	AppTerminateObserver.prototype = {
		command: "",
	
		// This is launched when status message is set, we then check if it was
		// about terminated application
		observe: function (subject, topic, data) {
			var matches;
	
			if ((subject.category == "run_command") && (matches =
				subject.msg.match(/^(['`"])(.+)\1 returned ([0-9]+).$/))
				!= null && matches[2] == this.command) {
				// Seems like this is a 'R quit' msg
				this.unregister();
				// Do something here like activate/deactivate commands...
			}
		},
	
		register: function (command) {
			var observerSvc = Components.
				classes["@mozilla.org/observer-service;1"].
				getService(Components.interfaces.nsIObserverService);
			this.command = command;
			observerSvc.addObserver(this, 'status_message', false);
			sv.log.debug("R has been started with command: " + command);
			// Sending commands to R does not seem to work, I think it is
			// too early, R is still starting. This should be in .Rprofile
			// Possibly refresh the GUI by running SciViews-specific
			// R task callbacks and make sure R Objects pane is updated
			//sv.r.evalHidden("try(koRefresh(force = TRUE), silent = TRUE)");
	
			// This hopefully will be called from R, when it starts:
			_this.updateRStatus(true);
		},
	
		unregister: function () {
			var observerSvc = Components.
				classes["@mozilla.org/observer-service;1"].
				getService(Components.interfaces.nsIObserverService);
			observerSvc.removeObserver(this, 'status_message');
			sv.log.debug("R has been closed. Command was: " + this.command);
			_this.updateRStatus(false);
		}
	};

	// TODO: at Komodo startup when R is running, I got in the notification pane:
	// R is running -> R is not running -> R is running
	this.updateRStatus = function (running) {
        // Toggle status if no argument
		if (running === undefined) {
            running = !sv.r.running; // toggle
		} else {
			//running =  new Boolean(running); // does not work. why??
			running =  !!running; // convert to boolean
		}
		if (running != sv.r.running) {
			sv.r.running = running;
			xtk.domutils.fireEvent(window, 'r_app_started_closed');
			window.updateCommands('r_app_started_closed');
			sv.addNotification("R is " + (running? "" : "not ") + "running",
				0, 2000);
		}
	}

	this.openPkgManager = function () {
		var win = _getWindowRef("chrome://sciviewsk/content/pkgman.xul",
			"RPkgMgr", "chrome=yes,dependent" +
			"scrollbars=yes,status=no,close,dialog=no, resizable", true, sv);
		return(win);
	}

	this.openSessionMgr = function () {
		var win = _getWindowRef("chrome://sciviewsk/content/sessions.xul",
			"RSessionMgr", "chrome,modal,titlebar,close,centerscreen", true);
		return(win);
	}

	//FIXME: help in tab still buggy
	this.openHelp = function (uri) {
		var RHelpWin = _this.RHelpWin;

		// We will need special treatment in windows
	    var isWin = navigator.platform.search(/Win\d+$/) === 0;

		if (uri) {
			// This should hopefully work on all platforms
			// First, check if "uri" is an URI already:
			var isUri = uri
				.search(/^((f|ht)tps?|chrome|about|file):\/{0,3}/) === 0;
			try {
				if (!isUri) {
					if (isWin) uri = uri.replace(/\//g, "\\");
					uri = sv.tools.file.getURI(uri);
				}
			} catch (e) {
				// Fallback
				if (!isUri) uri = "file://" + uri;
			}
		} else {
			uri = ""; // Home page will be shown
		}

		var rhelpTabbed = sv.prefs.getPref("rhelp.tabbed", false) == "true";
		var rHelpXulUri = "chrome://sciviewsk/content/RHelpWindow.xul";

		// Open R-help in a right tab
		if (rhelpTabbed) {
			// Make sure tab is visible and select it
			var tabPanel = document.getElementById("rhelpviewbox");
			var tab = document.getElementById("rhelp_tab");
			var tabBox = tabPanel.parentNode.parentNode;
			tabPanel.hidden = false;
			tab.hidden = false;
			tabBox.selectedIndex = tabBox.tabs.getIndexOfItem(tab);

			var RHelpFrame = document.getElementById("rhelpview-frame");

			RHelpFrame.webNavigation
				.loadURI(rHelpXulUri, null, null, null, null);

			//RHelpFrame.setAttribute("src", rHelpXulUri);
			RHelpWin = RHelpFrame.contentWindow;
			// It seems we could enter in a deadlock situation here
			// => defer display of the page
			window.setTimeout(sv.command.RHelpWin.go, 10, uri);
		} else {
			_this.RHelpWin = _getWindowByURI(rHelpXulUri);
			if (!RHelpWin || RHelpWin.closed) {
				sv.log.debug("Starting R help with page " + uri);

				// try/catch here somehow prevented from storing window
				// reference in RHelpWin. No idea why...
				RHelpWin = window.openDialog(rHelpXulUri, "RHelp",
					"chrome=yes,resizable=yes," +
					"scrollbars=yes,status=no,close,dialog=no", sv, uri);
			} else {
				// It seems we could enter in a deadlock situation here
				// => defer display of the page
				window.setTimeout(sv.command.RHelpWin.go, 10, uri);
			}
		}

		RHelpWin.focus();
		RHelpWin.close = _this.closeHelp;

		_this.RHelpWin = RHelpWin;
		return(RHelpWin);
	}

	// Close r-help tab
	this.closeHelp = function () {
		var tabPanel = document.getElementById("rhelpviewbox");
		var tab = document.getElementById("rhelp_tab");
		var tabBox = tabPanel.parentNode.parentNode;

		tabPanel.hidden = true;
		tab.hidden = true;
		tabBox.selectedIndex = ((tabBox.tabs.getIndexOfItem(tab) + 2) %
			tabBox.tabs.itemCount) - 1;
		document.getElementById("rhelpview-frame")
			.setAttribute("src", "about:blank");
		//_this.RHelpWin.closed = true;
	}

    function _setControllers () {
        //Based on: chrome://komodo/content/library/controller.js
        // backwards compatibility APIs
        if (typeof(Controller) != "function") {
			xtk.include("controller");
			var Controller = xtk.Controller;
		}

        const XRRunning = 1, XRStopped = 2, XisRDoc = 4, XHasSelection = 8;
        var handlers = {
                'cmd_svConfigureR': ['sv.command.configureR();', 0],
				'cmd_svInstallRtoolbox': ['sv.checkToolbox();', 0],
				'cmd_svUIlevel': ['sv.askUI(true);', 0],
				'cmd_svStartR': ['sv.command.startR();', 0], //XRStopped],
				'cmd_svQuitR': ['sv.r.quit();', XRRunning],
				'cmd_svOpenPkgManager': ['sv.command.openPkgManager();', XRRunning],
                'cmd_svBrowseWD': ['sv.r.setwd("current", true);', XRRunning],
                'cmd_svOpenHelp': ['sv.command.openHelp();', XRRunning],
				'cmd_svSessionMgr': ['sv.command.openSessionMgr();', XRRunning],
                'cmd_svREscape': ['sv.r.escape();', XRRunning],
                'cmd_svRRunAll': ['sv.r.send("all");', XisRDoc | XRRunning],
                'cmd_svRSourceAll': ['sv.r.source("all");', XisRDoc | XRRunning],
                'cmd_svRRunBlock': ['sv.r.send("block");', XisRDoc | XRRunning],
                'cmd_svRRunFunction': ['sv.r.send("function");', XisRDoc | XRRunning],
                'cmd_svRRunLine': ['sv.r.send("line");', XisRDoc | XRRunning],
                'cmd_svRRunPara': ['sv.r.send("para");', XisRDoc | XRRunning],
                'cmd_svRSourceBlock': ['sv.r.source("block");', XisRDoc | XRRunning],
                'cmd_svRSourceFunction': ['sv.r.source("function");', XisRDoc | XRRunning],
                'cmd_svRSourcePara': ['sv.r.source("para");', XisRDoc | XRRunning],
				'cmd_svRRunLineOrSelection': ['sv.r.run();', XisRDoc | XRRunning],
                'cmd_svRSourceLineOrSelection': ['sv.r.source("line/sel");', XisRDoc | XRRunning],
                'cmd_svRRunSelection': ['sv.r.send("sel");', XisRDoc | XRRunning | XHasSelection],
                'cmd_svRSourceSelection': ['sv.r.source("sel");', XisRDoc | XRRunning | XHasSelection],
                'cmd_viewrtoolbar': ['ko.uilayout.toggleToolbarVisibility(\'RToolbar\')', 0],
				'cmd_svRRunLineEnter': ['sv.r.runEnter();', XisRDoc | XRRunning],
				'cmd_svRHelpContext': ['sv.r.help("", false);', XisRDoc | XRRunning],
				'cmd_svRHelpSearch': ['sv.r.search();', XisRDoc | XRRunning],
				'cmd_svRObjStructure': ['sv.r.display("", "structure");', XisRDoc | XRRunning],
				'cmd_svRObjRefreshDisplay': ['ko.uilayout.ensureTabShown("sciviews_robjects_tab", true); sv.robjects.getPackageList(true);', XRRunning],
				'cmd_svRObjList': ['sv.r.eval("ls()");', XRRunning],
				'cmd_svRObjRemove': ['sv.r.eval("rm(list = ls())");', XRRunning],
				'cmd_svRActiveDF': ['sv.r.obj();', XRRunning],
				'cmd_svRLoadDF': ['sv.r.data();', XRRunning],
				'cmd_svRActiveLM': ['sv.r.obj("lm");', XRRunning],
				'cmd_svRListDemos': ['sv.r.eval("demo()");', XRRunning],
				'cmd_svRBrowseVignettes': ['sv.r.browseVignettes();', XRRunning],
				'cmd_svRSiteSearch': ['sv.r.siteSearch();', XRRunning],
				'cmd_svRRunExample': ['sv.r.example();', XRRunning],
				'cmd_svRClearSessionData': ['sv.r.eval(\'unlink(path.expand(file.path(getOption("R.initdir"), c(".RData", ".Rhistory"))))\');', XRRunning],
				'cmd_svRWorkspaceLoad': ['sv.r.loadWorkspace();', XRRunning],
				'cmd_svRWorkspaceSave': ['sv.r.saveWorkspace();', XRRunning],
				'cmd_svRHistoryLoad': ['sv.r.loadHistory();', XRRunning],
				'cmd_svRHistorySave': ['sv.r.saveHistory();', XRRunning],
				'cmd_svRWDFile': ['sv.r.setwd("file");', XRRunning],
				'cmd_svRWDSession': ['sv.r.setwd("session");', XRRunning],
				'cmd_svRWDPrevious': ['sv.r.setwd("previous");', XRRunning],
				'cmd_svRNewGraph': ['sv.r.eval("dev.new()");', XRRunning],
				'cmd_svRNextGraph': ['sv.r.eval("dev.set()");', XRRunning],
				'cmd_svRCloseGraph': ['sv.r.eval("dev.off()");', XRRunning],
				'cmd_svRCloseAllGraphs': ['sv.r.eval("graphics.off()");', XRRunning],
				'cmd_svRSaveGraphPDF': ['sv.r.saveGraph("pdfwrite");', XRRunning],
				'cmd_svRSaveGraphPNG': ['sv.r.saveGraph("png16m");', XRRunning]
        }

        function _isRCurLanguage () {
            var view = ko.views.manager.currentView;
            if (!view || !view.koDoc) return(false); // Was view.document in pre-Ko7
            return(view.koDoc.language == "R"); // Was view.document in pre-Ko7
        }

        function _hasSelection () {
            var view = ko.views.manager.currentView;
            if (!view || !view.scimoz) return(false);
            return(
				(view.scimoz.selectionEnd - view.scimoz.selectionStart) != 0);
        }

        function svController () {}
		svController.prototype = new Controller();
		svController.prototype.constructor = svController;
		svController.prototype.destructor = function () { }
        svController.prototype.isCommandEnabled = function (command) {
            if (!(command in handlers)) return(false);
			var test = handlers[command][1];
			return(
				(((test & XRRunning) != XRRunning) || _isRRunning())
				&& (((test & XRStopped) != XRStopped) || !_isRRunning()));
		}
		//var test = handlers[command][1];
		//return (((test & XRRunning) != XRRunning) || _isRRunning())
		//&& (((test & XRStopped) != XRStopped) || !_isRRunning())
		//&& (((test & XisRDoc) != XisRDoc) || true) //_isRCurLanguage())
		//&& (((test & XHasSelection) != XHasSelection) || _hasSelection()));
		//}
		
        svController.prototype.supportsCommand = svController.prototype
			.isCommandEnabled;
        svController.prototype.doCommand = function (command) {
            if (command in handlers) return(eval(handlers[command][0]));
            return(false);
        }
        window.controllers.appendController(new svController());
        //sv.log.debug("Controllers has been set.");
	}

// Code below is for extra items in editor context menu (eg. "run selection"),
// Commented out because it is still buggy
//	function editorContextMenuOnShowing (event) {
//		//try{
//
//		var ids = ["editor-context-sep-sv", "editor-context-sv-r-send-line-sel"];
//
//		var langNotR = ko.views.manager.currentView.koDoc.language != "R";
//		var visibility = langNotR? "collapse" : "visible";
///*
//		for (i in ids)
//			document.getElementById(ids[i]).style.visibility = visibility;
//*/
//		//} catch(e) {}
//
//	}
//var editorContextMenu = document.getElementById("editorContextMenu");
//editorContextMenu.addEventListener("popupshowing", editorContextMenuOnShowing, false);

	// Set default keybindings from file
	// chrome://sciviewsk/content/default-keybindings.kkf
	// preserving user modified ones and avoiding key conflicts
	// Note: we change only the current scheme at startup
    //       if it is not writable it is copied with a suffix
	function _setKeybindings (clearOnly) {
		var kbMgr = ko.keybindings.manager;
		var svSchemeDefault;
		try {
			// On Mac OS X, binding is different (e.g., Ctrl replaced by Meta)
			if (navigator.platform.substr(0, 3) == "Mac") {
				svSchemeDefault = sv.tools.file
					.readURI("chrome://sciviewsk/content/keybindings-mac.kkf");
			} else {
				svSchemeDefault = sv.tools.file
					.readURI("chrome://sciviewsk/content/keybindings.kkf");
			}
		} catch(e) {
			return(false);
		}
		if (!svSchemeDefault) return(false);

		try {
			// If current config is not writable, clone it (with a suffix)
			var currentConfiguration = kbMgr.currentConfiguration;
			if (!kbMgr.configurationWriteable(currentConfiguration)) {
				currentConfiguration =
					kbMgr.makeNewConfiguration(currentConfiguration +
				" (SciViews-K)");
			}
		} catch (e) { }

		try {
			//from: gKeybindingMgr.parseConfiguration
			var bindingRx = /[\r\n]+(# *SciViews|binding cmd_sv.*)/g;
			function _getSvKeys (data, pattern) {
				if (!pattern) pattern = "";
				var keys = data.match(new RegExp("^binding " + pattern +
					".*$", "gm"));
				var res = {};
				for (var j in keys) {
					try {
						keys[j].search(/^binding\s+(\S+)\s+(\S+)$/);
						res[RegExp.$1] = RegExp.$2;
					} catch(e) { }
				}
				return(res);
			}

			var svKeysDefault = _getSvKeys (svSchemeDefault, "cmd_sv");
			if (clearOnly) {
				for (var i in svKeysDefault) kbMgr.clearBinding(i, "", false);
			} else {
				var keysequence;
				for (var i in svKeysDefault) {
					keysequence = svKeysDefault[i].split(/, /);
					if (!kbMgr.usedBy(keysequence).length) {
						kbMgr.assignKey(i, keysequence, '');
						kbMgr.makeKeyActive(i, keysequence);
					}
				}
			}
			//kbMgr.saveAndApply(ko.prefs);
			kbMgr.saveCurrentConfiguration();
			kbMgr.loadConfiguration(kbMgr.currentConfiguration, true);
		} catch (e) {
			return(false);
		} 
		return(true);
	}
	
	// TODO: code from SciViews-K-dev to be integrated!
	//function _str(sString) sString.QueryInterface(Components.interfaces
	//	.nsISupportsString).data;
	//
	//this.getRProc = function(property) {
	//	if (!property) property = "CommandLine";
	//
	//	var svUtils = Components.classes["@sciviews.org/svUtils;1"]
	//		.createInstance(Components.interfaces.svIUtils);
	//	var procList = svUtils.getproc(property);
	//
	//	proc = [];
	//	while(procList.hasMoreElements()) proc.push(_str(procList.getNext()));
	//	return proc;
	//}
	
//// Implementation of places additions ////////////////////////////////////////
	this.places = {
		sourceSelection: function sv_sourcePlacesSelection () {
			if (!sv.r.running) return;
			var files = ko.places.manager.getSelectedItems()
				.filter(function(x) (x.file.isLocal &&
					x.file.ext.toLowerCase() == ".r"))
				.map(function(x) x.file.path);
			if (!files.length) return;
			var cmd = files.map(function(x) "source('" +
				sv.tools.strings.addslashes(x) +"')" ).join("\n");
			sv.r.evalCallback(cmd, function (z) {
				sv.robjects.smartRefresh(true);
			});
		},
	
		get anyRFilesSelected()
			sv.r.running &&
			ko.places.manager.getSelectedItems().some(function (x)
				x.file.isLocal &&
				x.file.ext.toLowerCase() == ".r"),
	
		loadSelection: function sv_loadPlacesSelection () {
			if (!sv.r.running) return;
			var files = ko.places.manager.getSelectedItems()
				.filter(function (x) (x.file.isLocal &&
					// for '.RData', .ext is ''
					(x.file.ext || x.file.leafName).toLowerCase() == ".rdata"))
				.map(function(x) x.file.path);
			if (!files.length) return;
			var cmd = files.map(function(x) "load('" +
				sv.tools.strings.addslashes(x) +"')" ).join("\n");
			sv.r.evalCallback(cmd, function (z) {
				sv.robjects.smartRefresh(true);
			});
		},
	
		get anyRDataFilesSelected()
			sv.r.running &&
			ko.places.manager.getSelectedItems().some(
				function (x) x.file.isLocal &&
				(x.file.ext || x.file.leafName).toLowerCase() == ".rdata")
	
	}

	////}
	// TODO: move this to sv.onLoad:
	this.onLoad = function (event) {
		setTimeout(function () {
			_setControllers();
			_this.updateRStatus(false); // XXX: workaround for some items in
										//'cmdset_rApp' commandset being grayed out
										//at startup...
			_this.updateRStatus(sv.r.test());
			if(sv.r.running) sv.robjects.smartRefresh(true);
	
			// For completions

// TODO PhG: This does not work for Komodo Edit 7!
//			var cuih = ko.codeintel.CompletionUIHandler;
//			cuih.prototype.types.argument = cuih.prototype.types.interface;
//			cuih.prototype.types.environment = cuih.prototype.types.namespace;
//			cuih.prototype.types.file = "chrome://sciviewsk/skin/images/cb_file.png";
		}, 600);

		var osName = Components.classes['@activestate.com/koOs;1']
			.getService(Components.interfaces.koIOs).name;
	
		if (!_setKeybindings(false, osName)) // use system specific keybindings
			_setKeybindings(false, '') // fallback - use default
	
		sv.socket.serverStart();	
	}
	
	//addEventListener("load", _setKeybindings, false);
	//addEventListener("load", function ()
	//	setTimeout(_setControllers, 600), false);
	addEventListener("load", _this.onLoad, false);
	
	// Just in case, run a clean-up before quitting Komodo:
	function svCleanup () sv.socket.serverStop();
	ko.main.addWillCloseHandler(svCleanup);


//	function ObserveR () {
//		var el = document.getElementById('cmd_svRStarted');
//		el.setAttribute("checked", _isRRunning());
//	}
//	addEventListener("r_app_started_closed", ObserveR, false);

}).apply(sv.command);

// XXX: for DEBUG only
//sv.getScimoz = function sv_getScimoz ()
//ko.views.manager.currentView? ko.views.manager.currentView.scimoz : null;