// SciViews-K R console management
// Copyright (c) 2011-2012 Ph. Grosjean (phgrosjean@sciviews.org) & Kamil Barton
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// sv.rconsole.intialize();          // Initialize the R console  
// sv.rconsole.finalize();           // finalize the R console
// sv.rconsole.getRTerminal();       // Get R terminal running in the console
// sv.rconsole.getRTerminalView();   // Get the terminal view
// sv.rconsole.getRProcess();        // Get the R process running in the console
// sv.rconsole.startSession(command, cwd, clearContent);
//                                   // Start an R session in the console
// sv.rconsole.endSession(retval);   // End the R session in the console
// sv.rconsole.start(editor, command, cwd, env, input, name,
//     doNotOpenOutputWindow, clearOutputWindow, terminationCallback);
//                                   // Function to use to start a R session
// sv.rconsole.clear();              // Clear content & history in the R console
// sv.rconsole.clearConsole();       // Clear the content of the console only
// sv.rconsole.run(command, newline, show); // Run a line of code in R console
// sv.rconsole.show(editor);         // Show the R console
// sv.rconsole.setProcessHandle(process); // Set process handle
// sv.rconsole.kill(retval);         // Kill the R process currently running
// sv.rconsole.toggleView(newview);  // Toggle between R output/R console
// sv.rconsole.scintillaOnClick(event); // On click event for the console
// sv.rconsole.onFocus(event);       // On focus event for the console
// sv.rconsole.rconsoleOnKeyPress(event); // On key press event for R console
// sv.rconsole.routputOnKeyPtress(event); // On key press event for R output
// sv.rconsole.focus();              // Code to run when focus goes into it 
////////////////////////////////////////////////////////////////////////////////


/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 * 
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is Komodo code.
 * 
 * The Initial Developer of the Original Code is ActiveState Software Inc.
 * Portions created by ActiveState Software Inc are Copyright (C) 2000-2007
 * ActiveState Software Inc. All Rights Reserved.
 * 
 * Contributor(s):
 *   ActiveState Software Inc
 *   Philippe Grosjean, SciViews
 * 
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

if (typeof(sv)=='undefined') {
    var sv = {};
}

/**
 * The interface for using the R console window.
 *
 * Expected usage:
 *  - Someone calls sv.rconsole.initialize() at startup and
 *    sv.rconsole.finalize() at shutdown.
 *  - When a R console is about to be started, do this:
 *       * announce intention to start the R process
 *         sv.rconsole.startSession(...);
 *       * ... setup and start running the actual command calling
 *       * sv.rconsole.getTerminal() and sv.rconsole.show() as needed
 *         sv.rconsole.setProcessHandle(p);   * to allow user to kill process
 *       * ... setup sv.rconsole.endSession() to be run when R terminates
 */
sv.rconsole = {};
(function () {   
    var _log = ko.logging.getLogger("sv.rconsole");    
    var _gRTerminalHandler = null;
    var _gRTerminalView = null;
    var _gRProcess = null;
    
    function _ClearUI () {
        //var descWidget = document.getElementById("rconsole-desc");
        // In ko7, we need a different code!
        //if (descWidget == null) descWidget = document
        //    .getElementById("sciviews_rconsole_tab")
        //    .contentDocument.getElementById("rconsole-desc");
        var descWidget = ko.widgets.getWidget("sciviews_rconsole_tab")
				.contentDocument.getElementById("rconsole-desc");
		descWidget.style.setProperty("color", "black", "");
        descWidget.removeAttribute("value");
        descWidget.removeAttribute("_command");
    }
    
    this.initialize = function RConsole_Init () {
        try {
            // Create a terminal for the R console window. The terminal has std
            // handlers that proxy read/write events between the scintilla and a
            // spawned child process.
            _gRTerminalHandler = Components
                .classes['@activestate.com/koRunTerminal;1']
                .createInstance(Components.interfaces.koITreeOutputHandler);
            if (!_gRTerminalHandler) {
                _log.error("initialize: couldn't create a koRunTerminal");
                return;
            }
            _ClearUI();
    
            // TODO: shouldn't we eliminate this???
            //var treeWidget = document.getElementById("rconsole-tree");
            // In ko7, we need a different code!
            //if (treeWidget == null) treeWidget = document
            //	.getElementById("sciviews_rconsole_tab")
            //	.contentDocument.getElementById("rconsole-tree");
			var treeWidget = ko.widgets.getWidget("sciviews_rconsole_tab")
				.contentDocument.getElementById("rconsole-tree");
            var boxObject = treeWidget.treeBoxObject
                .QueryInterface(Components.interfaces.nsITreeBoxObject);
        
            if (boxObject.view == null) {
                // We are in a collapsed state. We need to force the tree to be
                // visible before we can assign the view to it
                RConsole_Show(window);
            }
            //_gRTerminalView = (document.getElementById("rconsole-scintilla") == null) ?
            //    document.getElementById("sciviews_rconsole_tab")
            //        .contentDocument.getElementById("rconsole-scintilla") :
            //    document.getElementById("rconsole-scintilla");
            _gRTerminalView = ko.widgets.getWidget("sciviews_rconsole_tab")
				.contentDocument.getElementById("rconsole-scintilla");
			_gRTerminalView.init();
            _gRTerminalView.initWithTerminal(_gRTerminalHandler);
            boxObject.view = _gRTerminalHandler;
    
            // This does not work!? cf. window.frameElement reported as null
            //["mousedown", "focus"].forEach(function(eventname) {
            //        window.frameElement.addEventListener(eventname, function(event) {
            //        if (event.originalTarget == event.target) {
            //          //var deck = document.getElementById("rconsole-deck");
            //          // In ko7, we need a different code!
            //          //if (deck == null) deck = document
            //          //	.getElementById("sciviews_rconsole_tab")
            //          //	.contentDocument.getElementById("rconsole-deck");
			//			var deck = ko.widgets.getWidget("sciviews_rconsole_tab")
			//				.contentDocument.getElementById("rconsole-deck");
            //          deck.focus();
            //        }
            //    }, false);
            //});
            //window.frameElement.hookupObservers("rconsole-commandset"); 
            // Not needed or it fires events twice?! scintillaOverlayOnLoad();
            
            // Also make sure to trigger initialisation of R Output scimoz
            // by appending the prompt to it
            sv.cmdout.append(":> ", false);
            // Observe keypress event on the R Console panel
            //var rcons = document.getElementById("rconsole-scintilla");
            // In ko7, we need a different code!
            //if (rcons == null) rcons = document
            //	.getElementById("sciviews_rconsole_tab")
            //	.contentDocument.getElementById("rconsole-scintilla");	
            var rcons = ko.widgets.getWidget("sciviews_rconsole_tab")
				.contentDocument.getElementById("rconsole-scintilla");
			rcons.addEventListener('keypress', sv.rconsole.rconsoleOnKeyPress,
                true);            
            // And observe keypress events on the R Output panel
            //var rcons2 = document.getElementById("rconsole-scintilla2");
            // In ko7, we need a different code!
            //if (rcons2 == null) rcons2 = document
            //    .getElementById("sciviews_rconsole_tab")
            //    .contentDocument.getElementById("rconsole-scintilla2");	
            var rcons2 = ko.widgets.getWidget("sciviews_rconsole_tab")
				.contentDocument.getElementById("rconsole-scintilla2");
			rcons2.addEventListener('keypress', sv.rconsole.routputOnKeyPress,
                true);
        } finally {
            ko.main.addWillCloseHandler(sv.rconsole.finalize);
        }
    }
     
    this.finalize = function RConsole_Fini () {
        if (_gRTerminalView) {
            _gRTerminalView.finalizeTerminal();
            _gRTerminalView = null;
        }
        _gRTerminalHandler = null;
        if (!ko.main.windowIsClosing) {
            ko.main.removeWillCloseHandler(sv.rconsole.finalize);
        }
        // Not needed? scintillaOverlayOnUnload();
    }
        
    this.getRTerminal = function RConsole_GetTerminal () {
        return(_gRTerminalHandler);
    }
    
    this.getRTerminalView = function RConsole_GetTerminalView () {
        return(_gRTerminalView);
    }
    
    this.getRProcess = function RConsole_GetProcess () {
        return(_gRProcess);
    }
    
    // Start a terminal session with R in the console with the given command.
    // This raises an exception if the R console window is currently busy.
    // No! No exception, replaced by simple display of the R Console tab
    //    "command" is the command being used to start R (note that this is the
    //    command string *for display* which might be slight different
    //    -- passwords obscured -- than the actual command)
    //    "cwd" is the directory in which the command is being run
    //    "clearContent" is a boolean indicating whether to clear the
    //    R console window content (by default "true").
    this.startSession = function RConsole_StartSession (command, cwd,
        clearContent /* =true */) {
        if (typeof clearContent == 'undefined' || clearContent == null)
            clearContent = true;
    
        if (_gRTerminalHandler.active) {
            //throw new Error("R is already running!");
            // Just make sure the R Console is visible
            this.show(window);
        }
        _ClearUI();
        
        // Clear the console and make sure work wrap is none
        //var terminalView = document.getElementById("rconsole-scintilla");
        // In ko7, we need a different code!
        //if (terminalView == null) terminalView = document
        //    .getElementById("sciviews_rconsole_tab")
        //    .contentDocument.getElementById("rconsole-scintilla");
        var terminalView = ko.widgets.getWidget("sciviews_rconsole_tab")
				.contentDocument.getElementById("rconsole-scintilla");
		//var scimoz = terminalView.scimoz;
        // Note the width of the R console in characters is approximately
        //Math.floor(window.innerWidth / scimoz.textWidth(0, "0")) - 7
        // => set this option in R everytime the Komodo window size changes!
        // Make sure that word wrap is off
        //scimoz.wrapMode = scimoz.SC_WRAP_NONE;
        _gRTerminalView.scimoz.wrapMode = _gRTerminalView.scimoz.SC_WRAP_NONE;
    
        // Setup the terminal
        var lastErrorSvc = Components
            .classes["@activestate.com/koLastErrorService;1"]
            .getService(Components.interfaces.koILastErrorService);
        _gRTerminalView.startSession(clearContent);
        _gRTerminalHandler.setCwd(cwd);
        terminalView.cwd = cwd;
    
        //var descWidget = document.getElementById("rconsole-desc");
        // In ko7, we need a different code!
        //if (descWidget == null) descWidget = document
        //    .getElementById("sciviews_rconsole_tab")
        //    .contentDocument.getElementById("rconsole-desc");
        var descWidget = ko.widgets.getWidget("sciviews_rconsole_tab")
				.contentDocument.getElementById("rconsole-desc");
		descWidget.setAttribute("value", "R is running (" + command + ")");
        // Store the command name for later use
        descWidget.setAttribute("_command", command);
    
        if (clearContent) {
            //var listButton = document.getElementById("rconsole-list-button");
            // In ko7, we need a different code!
            //if (listButton == null) listButton = document
            //    .getElementById("sciviews_rconsole_tab")
            //    .contentDocument.getElementById("rconsole-list-button");
            var listButton = ko.widgets.getWidget("sciviews_rconsole_tab")
				.contentDocument.getElementById("rconsole-list-button");
			listButton.setAttribute("disabled", "true");
            _gRTerminalView.clear();
        }
    }
    
    // Complete a terminal session. R exited with the given value
    this.endSession = function RConsole_EndSession (retval) {
        //dump("XXX RConsole_EndSession(retval="+retval+")\n");
        _gRTerminalView.endSession();
    
        //var descWidget = document.getElementById("rconsole-desc");
        // In ko7, we need a different code!
        //if (descWidget == null) descWidget = document
        //    .getElementById("sciviews_rconsole_tab")
        //    .contentDocument.getElementById("rconsole-desc");
        var descWidget = ko.widgets.getWidget("sciviews_rconsole_tab")
				.contentDocument.getElementById("rconsole-desc");
		var command = descWidget.getAttribute("_command");
        var msg = null;
        var osSvc = Components.classes["@activestate.com/koOs;1"]
            .getService(Components.interfaces.koIOs);
        if (retval < 0 && osSvc.name == "posix") {
            msg = "R terminated with signal message " + (-retval);
        } else {
            msg = "R returned " + retval;
        }
        if (retval != 0) { // Dark red to not appear "neon" against grey
            descWidget.style.setProperty("color", "#bb0000", ""); 
        }
        descWidget.setAttribute("value", msg);
    
        _gRProcess = null;
        //var closeButton = document.getElementById("rconsole-close-button");
        // In ko7, we need a different code!
        //if (closeButton == null) closeButton = document
        //    .getElementById("sciviews_rconsole_tab")
        //    .contentDocument.getElementById("rconsole-close-button");
        var closeButton = ko.widgets.getWidget("sciviews_rconsole_tab")
				.contentDocument.getElementById("rconsole-close-button");
		closeButton.setAttribute("disabled", "true");
    }
    
    // koIRunTerminationListener implementation whose only job is to call
    // notify on child termination
    function _RterminationListener () { }
    _RterminationListener.prototype = {
        init: function (editor, command, callback) {
            this._editor = editor;
            this._command = command;
            this._callback = callback;
        },
        onTerminate: function (retval) {
            //dump("_terminationListener::onTerminate(retval="+retval+")\n");
            this._editor.sv.rconsole.endSession(retval);
            var msg = "R has quit with return value " + retval;
            this._editor.ko.statusBar.AddMessage(msg, "run_command", 3000,
                retval ? 1 : 0);
            if (this._callback) {
                // Want the callback to come _after_ this thread of control
                // so call it in a timeout.
                window.setTimeout(function(cback, rval) { cback(rval); },
                    10, this._callback, retval);
            }
        },
        QueryInterface: function (iid) {
            if (!iid.equals(Components.interfaces.koIRunTerminationListener) &&
                !iid.equals(Components.interfaces.nsISupports)) {
                throw Components.results.NS_ERROR_NO_INTERFACE;
            }
            return(this);
        }
    }
    
    // Start a R process in our internal console
    this.start = function RConsole_Start (editor, command, cwd, env, input,
        name /* =internal R terminal*/, doNotOpenOutputWindow /* =false */, 
        clearOutputWindow /* =true */, terminationCallback /* =null */) {
        if (typeof name == 'undefined' || name == null)
            name = "internal R terminal";
        if (typeof doNotOpenOutputWindow == 'undefined' ||
            doNotOpenOutputWindow == null)
            doNotOpenOutputWindow = false;
        if (typeof clearOutputWindow == 'undefined' || clearOutputWindow == null)
            clearOutputWindow = true;
        if (typeof terminationCallback == 'undefined')
            terminationCallback = null;
        
        // Start a R Console session
        try {
            editor.sv.rconsole.startSession(name, false, "", name, "", false);
        } catch (ex) {
            alert(ex);
            return(false);
        }
        
        // Get the terminal
        var terminal = editor.sv.rconsole.getRTerminal();
    
        // Setup the termination listener
        var termListener = new _RterminationListener();
        termListener.init(editor, name, terminationCallback);
    
        // Start R in the terminal
        try {
            var _runSvc = Components.classes["@activestate.com/koRunService;1"]
                .getService(Components.interfaces.koIRunService);
            var process = _runSvc.RunInTerminal(command, cwd, env, terminal,
                termListener, input);
        } catch (ex) {
            var lastErrorSvc = Components
                .classes["@activestate.com/koLastErrorService;1"]
                .getService(Components.interfaces.koILastErrorService);
            var errmsg = lastErrorSvc.getLastErrorMessage();
            if (!errmsg) {
                errmsg = "Unknown error launching " + cmdDisplay;
            }
            alert(errmsg);
            editor.sv.rconsole.endSession(-1);
            return(false);
        }
    
        // Register the R process and show the output window
        editor.ko.run.registerProcess(name, process);
        editor.sv.rconsole.setProcessHandle(process);
        if (!doNotOpenOutputWindow) {
            this.show(editor);
        }
        return(true);
    }
    
    // Clear the R console and the command history
    this.clear = function RConsole_Clear () {
        //var scimoz = _gTerminalView;
        //var eolChar = ["\r\n", "\n", "\r"][scimoz.eOLMode];
        //var readOnly = scimoz.readOnly;
        //try {
        //    scimoz.readOnly = false;
        //    scimoz.clearAll();
        //} finally {
        //    scimoz.readOnly = readOnly;
        //}
        _gRTerminalView.clear();
    }
    
    // Clear the R console only, keep command history
    this.clearConsole = function RConsole_ClearConsole () {
        _gRTerminalView.clearBuffer();
    }
    
    // Execute a line of code in the R Console
    this.run = function RConsole_Run (command, newline /* =true*/,
        show /* =true*/) {
        if (typeof show == 'undefined' || show == null) show = true;
        if (show) ko.uilayout.ensureTabShown("sciviews_rconsole_tab", false);
        
        var scimoz = _gRTerminalView;
        var eolChar = ["\r\n", "\n", "\r"][scimoz.eOLMode];
        if (newline || newline === undefined) command += eolChar;
        //var cmd_bytelength = ko.stringutils.bytelength(command);
        //var readOnly = scimoz.readOnly;
        try {
        //    scimoz.readOnly = false;
        //    scimoz.documentEnd()
            // TODO: elliminate current line being edited
            //TODO: code here!!!
        //    scimoz.appendText(cmd_bytelength, command);
        } finally {
        //    scimoz.readOnly = readOnly;
        }
    }
    
    // Show the R console window (editor is the XUL window holding the console)
    this.show = function RConsole_Show (editor) {
        if (!editor) _log.error("show: 'editor' is not true");
        // Make sure the tab is visible
        ko.uilayout.ensureTabShown('sciviews_rconsole_tab', true);
    
        // Open the proper console view
        _SetView(editor, 0);
    }
    
    // Pass a koIRunProcess reference to the R console window so it can manipulate
    // the process that is being run in its terminal, if necessary
    this.setProcessHandle = function RConsole_SetProcessHandle (process) {
        if (_gRTerminalHandler.active) {
            _gRProcess = process;
            //var closeButton = document.getElementById("rconsole-close-button");
            // In ko7, we need a different code!
            //if (closeButton == null) closeButton = document
            //    .getElementById("sciviews_rconsole_tab")
            //    .contentDocument.getElementById("rconsole-close-button");
			var closeButton = ko.widgets.getWidget("sciviews_rconsole_tab")
				.contentDocument.getElementById("rconsole-close-button");
            closeButton.removeAttribute("disabled");
        }
    }
    
    // Kill the process currently running in the console's terminal, if any
    this.kill = function RConsole_Kill (retval) {
        if (_gRProcess) _gRProcess.kill(retval);
    }
    
    function _SetView (editor, deck) {
        // Ignore editor, always use the window we're in
        //var deckWidget = document.getElementById("rconsole-deck");
        // In ko7, we need a different code!
        //if (deckWidget == null) deckWidget = document
        //    .getElementById("sciviews_rconsole_tab")
        //    .contentDocument.getElementById("rconsole-deck");
        var deckWidget = ko.widgets.getWidget("sciviews_rconsole_tab")
			.contentDocument.getElementById("rconsole-deck");
		deckWidget.setAttribute("selectedIndex", deck);
    }
    
    this.toggleView = function RConsole_ToggleView (newview) {
        if (typeof newview == 'undefined' || newview == null) {
            //var deckWidget = document.getElementById("rconsole-deck");
            // In ko7, we need a different code!
            //if (deckWidget == null) deckWidget = document
            //    .getElementById("sciviews_rconsole_tab")
            //    .contentDocument.getElementById("rconsole-deck");
            var deckWidget = ko.widgets.getWidget("sciviews_rconsole_tab")
				.contentDocument.getElementById("rconsole-deck");
			if (deckWidget.getAttribute("selectedIndex") == 1) {
                newview = 0;
            } else {
                newview = 1;
            }
        }
        _SetView(window, newview);
    }
    
    this.scintillaOnClick = function RConsole_scintillaOnClick (event) {
        // Do nothing for the moment... but should display a context menu on
        // right-click
    }
        
    this.onFocus = function RConsole_OnFocus(event) {
        if (event.originalTarget != window) return;
        //var deckWidget = document.getElementById("rconsole-deck");
        // In ko7, we need a different code!
        //if (deckWidget == null) deckWidget = document
        //    .getElementById("sciviews_rconsole_tab")
        //    .contentDocument.getElementById("rconsole-deck");
		var deckWidget = ko.widgets.getWidget("sciviews_rconsole_tab")
			.contentDocument.getElementById("rconsole-deck");
        var selected = deckWidget.selectedPanel;
        if ("scintilla" in selected) {
            selected.scintilla.focus();
        } else {
            selected.focus();
        }
    };
    
    window.addEventListener("focus", this.onFocus, false);
    
    // This is used to avoid double printing of R commands: erase current line
    // before sending it to R...
    this.rconsoleOnKeyPress = function (event) {
        try {
        	// TODO: implement the function that erase the command
        //    if (event.keyCode == 13) {
        //        // TODO: what am I supposed to do here???
        //    }
            
            // This does not work because another event is dealing with this
            // case differently
            //var str = String.fromCharCode(event.charCode);
        	//if (str.length && !event.ctrlKey &&
            //    !event.altKey && !event.metaKey) {
        	//	var editor = ko.views.manager.currentView;
            //    editor.setFocus();
        	//	editor.scimoz.replaceSel(str);
        	//}
        } catch(e) { }
    }
    
    // Since R Output panel is read-only, redirect any key typed there to the
    // current editor buffer
    // TODO: shouldn't we redirect to the R console instead???
    // Note: the event that triggers this function is placed in
    // this.initialize(), otherwise, it does not work!
    this.routputOnKeyPress = function (event) {
        try {
        	// TODO: impossible to reallocate Ctrl+Enter keybindings when
            // focus is on the R Output. So, we must solve the problem differently!
            // if (ctrl+enter) then run sv.r.runEnter()
            // otherwise it is not called
            if (event.keyCode == 13 && event.ctrlKey) {
                var editor = ko.views.manager.currentView;
                editor.setFocus();
                sv.r.runEnter();
            }
            
            // This does not work because another event is dealing with this
            // case differently
            //var str = String.fromCharCode(event.charCode);
        	//if (str.length && !event.ctrlKey &&
            //    !event.altKey && !event.metaKey) {
        	//	var editor = ko.views.manager.currentView;
            //    editor.setFocus();
        	//	editor.scimoz.replaceSel(str);
        	//}
        } catch(e) { }
    }
    
    this.focus = function() { }

}).apply(sv.rconsole);

window.addEventListener("load", sv.rconsole.initialize, false);
