// SciViews-K R interpreter XPCOM
// Define functions to pilot R from Komodo Edit
// Copyright (c) 2008-2010, Ph. Grosjean (phgrosjean@sciviews.org) et al.
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// In Javascript:
// var R = Components.classes["@sciviews.org/svRinterpreter;1"]
//			.getService(Components.interfaces.svIRinterpreter);
// In Python:
// from xpcom import components
// R = components.classes["@sciviews.org/svRinterpreter;1"].\
//    		getService(components.interfaces.svIRinterpreter)
////////////////////////////////////////////////////////////////////////////////
// R.escape();	 					// Escape R code
// R.calltip(code); 				// Get a calltip for this code
// R.complete(code); 				// Get completion list for this code
////////////////////////////////////////////////////////////////////////////////
// TODO: rework calltip() and complete() in sv.r to use this one.
// TODO: I sometimes got an error, 'callTipItem is undefined'!

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");


//// Class constructor & definition ////////////////////////////////////////////
function svRinterpreter() {}

svRinterpreter.prototype = {

    // Properties required for XPCOM registration
    classDescription: "The SciViews-K R interpreter",
    classID:          Components.ID("{2f89ed9d-6dda-9a4e-a78f-29e4838dcd08}"),
    contractID:       "@sciviews.org/svRinterpreter;1",

    // Category: An array of categories to register this component in.
    _xpcom_categories: [{

		// Each object in the array specifies the parameters to pass to
		// nsICategoryManager.addCategoryEntry(). 'true' is passed for both
		// aPersist and aReplace params.
		category: "r",

		// Optional, defaults to the object's classDescription
		//entry: "",

		// Optional, defaults to object's contractID (unless 'service' specified)
		//value: "...",

		// Optional, defaults to false. When set to true, and only if 'value' is
		// not specified, the concatenation of the string "service," and the
		// object's contractID is passed as aValue parameter of addCategoryEntry.
		service: false
    }],

    // QueryInterface implementation, e.g. using the generateQI helper
	// (remove argument if skipped steps above)
    QueryInterface: XPCOMUtils.generateQI([Components.interfaces.svIRinterpreter]),

    /**
    * Escape from multiline mode in the R interpreter.
    */
    escape: function () {
		// Currently do nothing
		return(null);
	},

    /**
    * Query the R interpreter to get a calltip.
    * @param code - The piece of code currently edited requiring calltip.
    */
    calltip: function (code) {
		if (typeof(code) == "undefined" | code == "") {
			return(null);
		}
		var cmd = 'cat(callTip("' + code.replace(/(")/g, "\\$1") +
			'", location = TRUE, description = TRUE, methods = FALSE, width = 80))';
		var res = rCommand("<<<h>>>" + cmd,
			function (tip) {
				if (tip != "") {
					koLogger.debug(tip);
					var kvSvc = Components
						.classes["@activestate.com/koViewService;1"]
						.getService(Components.interfaces.koIViewService);
					//var ke = kvSvc.currentView.document.getView().scimoz;
					var ke = kvSvc.currentView.koDoc.getView().scimoz;
					try {
						if (ke.callTipActive()) ke.callTipCancel();
						ke.callTipShow(ke.anchor, tip.replace(/[\r\n]+/g, "\n"));
					} catch(e) { }
					// TODO: does not work!
					//clearCodeintelMessage();
				}
			}
		);
		return(res);
    },

    /**
    * Query the R interpreter to get a completion list.
    * @param code - The piece of code currently edited requiring completion.
    */
    complete: function (code) {
		if (code === undefined | code == "") {
			return(null);
		}
		code = code.replace(/(")/g, "\\$1");
		var kvSvc = Components
			.classes["@activestate.com/koViewService;1"]
			.getService(Components.interfaces.koIViewService);
		//var ke = kvSvc.currentView.document.getView().scimoz;
		var ke = kvSvc.currentView.koDoc.getView().scimoz;
		// Record current position (could change, because asynch trigger of autoC)
		var lastPos = ke.anchor;
		var cmd = 'completion("' + code + '", print = TRUE, types = "scintilla", field.sep = "?")';
		koLogger.debug("completion: ..." + code.substring(code.length - 20));
		var res = rCommand("<<<h>>>" + cmd,
			function (autoCstring) {
				try {
					// These should be set only once?:
					ke.autoCSeparator = 9;
					//ke.autoCSetFillUps(" []{}<>/():;%+-*@!\t\n\r=$`");
					var autoCSeparatorChar = String.fromCharCode(ke.autoCSeparator);
					autoCstring = autoCstring.replace(/^(.*)[\r\n]+/, "");
					// Get length of the triggering text
					var trigLen = parseInt(RegExp.$1);
					koLogger.debug("trigLen: " + trigLen);
					// Is something returned by completion()?
					if (isNaN(trigLen)) { return; }
					// There is a bug (or feature?) in completion(): if it returns all the code, better set trigLen to 0!
					if (trigLen == code.length) { trigLen = 0; }
					// TODO: we need to sort AutoCString with uppercase first
					// otherwise, the algorithm does not find them (try: typing T, then ctrl+J, then R)
					// TODO: there is a problem with items with special character (conversion problems)
					autoCstring = autoCstring.replace(/\r?\n/g, autoCSeparatorChar);

					// code below taken from "CodeIntelCompletionUIHandler"
				//	var iface = Components.interfaces.koICodeIntelCompletionUIHandler;
				//	ke.registerImage(iface.ACIID_FUNCTION, ko.markers.
				//		getPixmap("chrome://komodo/skin/images/ac_function.xpm"));
				//	ke.registerImage(iface.ACIID_VARIABLE, ko.markers.
				//		getPixmap("chrome://komodo/skin/images/ac_variable.xpm"));
				//	ke.registerImage(iface.ACIID_XML_ATTRIBUTE, ko.markers.
				//		getPixmap("chrome://komodo/skin/images/ac_xml_attribute.xpm"));
				//	ke.registerImage(iface.ACIID_NAMESPACE, ko.markers.
				//		getPixmap("chrome://komodo/skin/images/ac_namespace.xpm"));
				//	ke.registerImage(iface.ACIID_KEYWORD, ko.markers.
				//		getPixmap("chrome://komodo/skin/images/ac_interface.xpm"));
					ke.autoCChooseSingle = false;
					// Take into account if we entered more characters
					Delta = ke.anchor - lastPos;
					koLogger.debug("Delta: " + Delta);
					// Only display completion list if 0 <= Delta < 5
					// Otherwise, it means we moved away for the triggering area
					// and we are in a different context, most probably
					if (Delta >= 0 & Delta < 5) {
						ke.autoCShow(Delta + trigLen, autoCstring);
					}
				} catch(e) { }
				// TODO: does not work!
				//clearCodeintelMessage();
			}
		);
		return(res);
    }
};


//// XPCOM registration of the class ///////////////////////////////////////////
var components = [svRinterpreter];
// function NSGetModule (compMgr, fileSpec) {
	// XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2
	// XPCOMUtils.generateNSGetModule was introduced in Mozilla 1.9
	if (XPCOMUtils.generateNSGetFactory) {
		var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
	} else {
		var NSGetModule =  XPCOMUtils.generateNSGetModule(components);
		//return XPCOMUtils.generateModule(components);
	}
//}


//// Komodo logging service ////////////////////////////////////////////////////
var koLogging = Components
	.classes["@activestate.com/koLoggingService;1"]
	.getService(Components.interfaces.koILoggingService);
var koLogger = koLogging.getLogger("svRinterpreter");

function koLoggerException(e, msg, showMsg) {
	if (typeof(showMsg) != 'undefined' && showMsg == true)
		alert("Error", msg);
	koLogger.exception(e, msg);
}

koLogger.setLevel(koLogging.DEBUG);


//// Komodo statusbar access ///////////////////////////////////////////////////
function clearCodeintelMessage () {
	var sm = Components
		.classes["@activestate.com/koStatusMessage;1"]
		.createInstance(Components.interfaces.koIStatusMessage);
	sm.msg = "";
	sm.category = "codeintel";
	sm.timeout = 0;
	sm.highlight = false;
	sm.interactive = false;
	Components.classes["@activestate.com/koStatusMessageStack;1"]
		.createInstance(Components.interfaces.koIStatusMessageStack)
		.Push(sm);
	var messageWidget = Components
		.classes["@mozilla.org/appshell/window-mediator;1"]
		.getService(Components.interfaces.nsIWindowMediator)
		.getMostRecentWindow("Komodo")
//		.document.getElementById('statusbar-message');
		.koDoc.getElementById('statusbar-message');
	//messageWidget.setAttribute("category", sm.category);
	//messageWidget.setAttribute("value", sm.msg);
	//messageWidget.setAttribute("tooltiptext", sm.msg);
	messageWidget.setAttribute("value", "Ready"); //_bundle.GetStringFromName("ready.label"));
	messageWidget.removeAttribute("tooltiptext");
	messageWidget.removeAttribute("highlite");
}


//// Komodo preferences access /////////////////////////////////////////////////
var prefset = Components.classes["@activestate.com/koPrefService;1"]
	.getService(Components.interfaces.koIPrefService).prefs;
	
// Get a preference, or default value
function getPref (prefName, defaultValue) {
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
function setPref (prefName, value, overwrite, asInt) {
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


//// R socket server ///////////////////////////////////////////////////////////
if (typeof(sv) == "undefined") var sv = {};
sv.clientType = getPref("sciviews.r.type", "http");
setPref("sciviews.client.currentType", sv.clientType, true);

// String converter used between Komodo and R (localeToCharset()[1] in R)
var converter = Components
	.classes["@mozilla.org/intl/scriptableunicodeconverter"]
	.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);

// Use UTF-8 encoding by default, except on Windows where ISO8859-1 is a better bet
try {
	if (navigator.platform.search(/Win\d+$/) === 0) {
		converter.charset = "ISO8859-1";
	} else {
		converter.charset = "UTF-8";	
	}
} catch (e) { }

// The conversion functions
function _fromUnicode (str, charset) {
	if (charset !== undefined && converter.charset != charset)
		converter.charset = charset;
	try {
		if (converter.charset)
			str = converter.ConvertFromUnicode(str) + converter.Finish();
	} catch(e) {
		koLoggerException(e,
			"svRinterpreter is unable to convert from Unicode to " +
		 	converter.charset + ". The string was " + str);
	}
	return(str);
}

function _toUnicode (str, charset) {
	if (charset !== undefined && converter.charset != charset)
		converter.charset = charset;
	try {
		if (converter.charset)
			str = converter.ConvertToUnicode(str);
	} catch(e) {
		koLoggerException(e,
			"svRinterpreter is unable to convert to Unicode from " +
			converter.charset + ". The string was " + str);
	}
	return(str);
}

// The main socket client function to connect to R socket server
function rClientSocket(host, port, cmd, listener) {
	// Workaround for NS_ERROR_OFFLINE returned by 'createTransport' when
	// there is no network connection (when network goes down). Based on
	// toggleOfflineStatus() in chrome://browser/content/browser.js.
// TODO: navigator unknown at this stage...
//	if (!navigator.onLine) Components
//		.classes["@mozilla.org/network/io-service;1"]
//		.getService(Components.interfaces.nsIIOService2).offline = false;

	try {
		var transport = Components
			.classes["@mozilla.org/network/socket-transport-service;1"]
			.getService(Components.interfaces.nsISocketTransportService)
			.createTransport(null, 0, host, port, null);

		var outstream = transport.openOutputStream(0, 0, 0);
		cmd = _fromUnicode(cmd);
		outstream.write(cmd, cmd.length);

		var stream = transport.openInputStream(0, 0, 0);
		var instream = Components
			.classes["@mozilla.org/scriptableinputstream;1"]
			.createInstance(Components.interfaces.nsIScriptableInputStream);
		instream.init(stream);

		var dataListener = {
			data: "",
			onStartRequest: function(request, context) { this.data = ""; },
			onStopRequest: function(request, context, status) {
				instream.close();
				stream.close();
				outstream.close();
				this.data = this.data.replace(/[\n\r]{1,2}$/, "");
				listener.finished(this.data);
			},
			onDataAvailable: function(request, context, inputStream,
				offset, count) {
				var chunk = _toUnicode(instream.read(count));

				// Do we need to close the connection
				// (\f received, followed by \n, \r, or both)?
				if (chunk.match("\n\f") == "\n\f") {
					instream.close();
					stream.close();
					outstream.close();
					// Eliminate trailing (\r)\n\f chars before the prompt
					// Eliminate the last carriage return after the prompt
					chunk = chunk.replace(/(\r?\n\f|\s+$)/, "");
				}

				// Determine if we have a prompt at the end
				if (chunk.search(/\+\s+$/) > -1) {
					chunk = chunk.replace(/\s+$/g, "") + " ";
				}
				this.data += chunk;
			}
		}

		var pump = Components
			.classes["@mozilla.org/network/input-stream-pump;1"]
			.createInstance(Components.interfaces.nsIInputStreamPump);
		pump.init(stream, -1, -1, 0, 0, false);
		pump.asyncRead(dataListener, null);
	} catch (e) {
		koLogger.error("rClientSocket() raises an unknown error: " + e);
		return(e);
	}
	return(null);
}

// The main HTTP client function to connect to R HTTP server
function rClientHttp(host, port, cmd, listener) {
	// Workaround for NS_ERROR_OFFLINE returned by 'createTransport' when
	// there is no network connection (when network goes down). Based on
	// toggleOfflineStatus() in chrome://browser/content/browser.js.
// TODO: navigator unknown at this stage...
//	if (!navigator.onLine) Components
//		.classes["@mozilla.org/network/io-service;1"]
//		.getService(Components.interfaces.nsIIOService2).offline = false;

	try {
		var httpRequest = Components
			.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
            .createInstance(Components.interfaces.nsIXMLHttpRequest);
		httpRequest.onreadystatechange = function () {
			try {
				if (httpRequest.readyState == 4) {
					// For reasons I don't know, R HTTP server version 2.11.1
					// returns 500 instead of 200 upon correct completion of
					// the command...
					if (httpRequest.status == 200 | httpRequest.status == 500) {
						var res = _toUnicode(httpRequest.responseText);
						if (res.match("\n\f") == "\n\f") {
							res = res.replace(/(\r?\n\f|\s+$)/, "");
						}
						if (res.search(/\+\s+$/) > -1) {
							res = res.rtrim() + " ";
						}
						listener.finished(res.replace(/[\n\r]{1,2}$/, ""));
					} else if (httpRequest.status > 0) {
						koLogger.error("rClientHttp() got a communication error. " +
							"Status: " + httpRequest.status);
						return(httpRequest.status);
					}
				}
			} catch(e) {
				koLogger.error("rClientHttp() raises an unknown error: " + e);
				return(e);
			}
			return(null);
		};

		//url is http://<host>:<port>/custom/SciViews?<cmd>
		var url = "http://" + host + ":" + port + "/custom/SciViews?" +
			encodeURIComponent(_fromUnicode(cmd))
		httpRequest.open('GET', url, true);
		httpRequest.send('');

	} catch (e) {
		koLogger.error("rClientHttp() raises an unknown error: " + e);
		return(e);
	}
	return(null);
}

// Send an R command through the socket
function rCommand(cmd, procfun) {
	var host = getPref("sciviews.r.host", "127.0.0.1");
	var port = getPref("sciviews.r.port", 8888);
	var clientType = getPref("sciviews.client.currentType", "http");
	var id = "<<<id=" +
		getPref("sciviews.client.id", "SciViewsK") + ">>>";
	cmd = cmd.replace(/(\r?\n|\r)/g, "<<<n>>>"); // Replace CRLF
	
	var listener;
	if (procfun == null) {	// Do nothing at the end
		listener = { finished: function(data) {} }
	} else {	// Call procfun at the end
		// Convert all arguments to an Array
		var args = Array.apply(null, arguments);
		listener = {
			finished: function (data) {
				// Keep only arguments after procfun, and add "data"
				args.splice(0, 3, data);
				if (typeof(procfun) == "function") {
					procfun.apply(null, args);
				} else { // In fact we can add a property even to a function
					procfun.value = data;
				}
			}
		}
	}
	var res = "";
	if (clientType == "socket") {	// Socket server in svSocket
		res = rClientSocket(host, port, id + cmd + "\n", listener);
	} else {						// Http server in svGUI
		res = rClientHttp(host, port, id + cmd + "\n", listener);
	}
	if (res && res.name && res.name == "NS_ERROR_OFFLINE") {
		koLogger.error("Error: Komodo went offline! " + res);
	}
	return(res);
}

// Test...
//rCommand("<<<h>>>cat('library = '); str(library)", function (data) alert(data));
//rCommand("<<<q>>>cat('library = '); str(library)");
