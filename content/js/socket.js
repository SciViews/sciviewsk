// SciViews-K socket client/server functions
// Socket client and server functions to connect to R kernels
// Copyright (c) 2008-2011, Ph. Grosjean (phgrosjean@sciviews.org)
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
//
/////// Socket client //////////////////////////////////////////////////////////
// sv.clientType				// A global variable with 'http' or 'socket'
// sv.socket.svSocketMinVersion // Minimum version of svSocket package required
// sv.socket.svHttpMinVersion   // Minimum version of svHttp package required
// sv.socket.partial	// In case of multiline mode, current command is partial
// sv.socket.lastCmd	// Last command issued
// sv.socket.charset	// Character set used by R
// sv.socket.fromUnicode(str, charset);	// String conversion from unicode
// sv.socket.toUnicode(str, charset);	// String conversion to unicode
// sv.socket.rClientSocket(host, port, cmd, listener, echo, procname);
// sv.socket.rClientHttp(host, port, cmd, listener, echo, procname);
// sv.socket.rClient(host, port, cmd, listener, echo, procname);
// 		Main client fonction, SciViews socket server and SciViews HTTP server)
// sv.socket.setSocketType(type); // Set the socket type to use
// sv.socket.rCommand(cmd, echo, procfun, ...); 	 	// Send cmd to R
// sv.socket.rProcess(rjson);	// Default RJSONp function called back
// sv.socket.rCommandSync(cmd); // A synchronous communication that is also
//		able to sense if R server is connected and if it is a socket or a
//      HTTP server. Usual asynchronous communication is automatically
//      adjusted according to these results.
// sv.socket.rUpdate();								  	// Update R options
//
/////// Socket server //////////////////////////////////////////////////////////
// sv.serverType				// A global variable with 'file' or 'socket'
// sv.socket.debug              // Debugging mode (in Command Output)
// sv.socket.serverIsLocal      // Is the socket servicing only localhost?
// sv.socket.checkFile();       // The file version of the server
// sv.socket.serverStart(port); // Start the SciViews-K socket server
// sv.socket.serverStop();      // Stop the SciViews-K socket server
// sv.socket.serverIsStarted;   // (read-only) Is the socket server started?
// sv.socket.serverConfig();    // Get a short description of server config
// sv.socket.serverWrite(data); // Write a string through the socket server
////////////////////////////////////////////////////////////////////////////////
//
// TODO:
// * A method to check svSocketMinVersion, and include this in rUpdate()
// * Correct the crash problem when Komodo exits on Windows (connections not
//   closed?)
// * The interface must be made 100% compatible with the HTTP server
// * Conversion from/to UTF-8 is now handled in R. However, the Komodo server
//   does not seem to handle well the UTF-8 strings returned by R???
// * Severe! On Windows the socket server is not reachable from R after Komodo
//   is restarted while R is running already. Executing sv.socket.serverStart()
//   does not help at all. (PhG: stange! It works like a charm for me on Mac)
////////////////////////////////////////////////////////////////////////////////

// Make sure sv.clientType and sv.serverType are defined using current prefs
sv.clientType = sv.prefs.getPref("sciviews.r.type", "http");
sv.serverType = sv.prefs.getPref("sciviews.ko.type", "socket");

// Define the 'sv.socket' namespace
if (typeof(sv.socket) == 'undefined') sv.socket = {};

(function () {
	var _this = this;
	
	/////// Socket client //////////////////////////////////////////////////////
	// svSocketMinVersion, partial and _converter are global variables
	// defined in svRinterpreter.js
	this.svSocketMinVersion = "0.9-52";// Min version of svSocket package required
	this.svHttpMinVersion = "0.9-52";  // Minimum version of svHttp package required
	this.partial = false;			   // Is the last command send to R partial?
	this.lastCmd = "";				   // Last command issued
	
	// String converter used between Komodo and R (localeToCharset()[1] in R)
	// PhG: not used any more because the conversion is now done in R
	//      I leave code there until it is completely debugged!
	var _converter = Components
		.classes["@mozilla.org/intl/scriptableunicodeconverter"]
		.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
	
	// Accessors to set/get charset
	this.__defineGetter__ ('charset', function () _converter.charset);
	this.__defineSetter__ ('charset', function (charset) {
		// PhG: I eliminate the 'if' because sometimes the converter stops
		// working, and it is reactivated only when it is reset => this is
		// a temorary workaround to recover from that situation
		//if (charset != _converter.charset)
			try { _converter.charset = charset; } catch (e) { }
		return(_converter.charset);
	});
	// Select reasonable defaults: ISO8859-1 on Windows, UTF-8 elsewhere
	if (navigator.platform.search(/Win\d+$/) === 0) {
		this.charset = "ISO8859-1";
	} else {
		this.charset = "UTF-8";	
	}
	
	// The conversion functions
	function _fromUnicode (str, charset) {
		if (charset !== undefined && _this.charset != charset)
			_this.charset = charset;
		try {
			if (_converter.charset)
				str = _converter.ConvertFromUnicode(str) + _converter.Finish();
		} catch(e) {
			sv.log.exception(e, "sv.socket is unable to convert from Unicode to " +
				_converter.charset + ". The message was " + str);
		}
		return(str);
	}
	
	this.fromUnicode = function (str, charset)
		_fromUnicode(str, charset);
	
	function _toUnicode (str, charset) {
		if (charset !== undefined && _this.charset != charset)
			_this.charset = charset;
		try {
			if (_converter.charset)
				str = _converter.ConvertToUnicode(str);
		} catch(e) {
			sv.log.exception(e, "sv.socket is unable to convert to Unicode from " +
				_converter.charset + ". The message was " + str);
		}
		return(str);
	}
	
	this.toUnicode = function (str, charset)
		_toUnicode(str, charset);
	
	// The main socket client function to connect to R socket server
	this.rClientSocket = function (host, port, cmd, listener, echo, procname) {
		// Workaround for NS_ERROR_OFFLINE returned by 'createTransport' when
		// there is no network connection (when network goes down). Based on
		// toggleOfflineStatus() in chrome://browser/content/browser.js.
		if (!navigator.onLine) Components
			.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService2).offline = false;
	
		try {
			var transport = Components
				.classes["@mozilla.org/network/socket-transport-service;1"]
				.getService(Components.interfaces.nsISocketTransportService)
				.createTransport(null, 0, host, port, null);
	
			var outstream = transport.openOutputStream(0, 0, 0);
			cmd = _fromUnicode(cmd);
			// TODO: if procname != null, instruct to return a RJsonP result!
			outstream.write(cmd, cmd.length);
		
			var stream = transport.openInputStream(0, 0, 0);
			var instream = Components
				.classes["@mozilla.org/scriptableinputstream;1"]
				.createInstance(Components.interfaces.nsIScriptableInputStream);
			instream.init(stream);
	
			var dataListener = {
				data: "",
				onStartRequest: function(request, context) { _this.data = ""; },
				onStopRequest: function(request, context, status) {
					instream.close();
					stream.close()
					outstream.close();
					_this.data = sv.tools.strings.removeLastCRLF(_this.data);
					listener.finished(_this.data);
				},
				onDataAvailable: function (request, context, inputStream,
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
						// If we just shift in partial mode, prepend command
						chunk = chunk.rtrim() + " ";
						var cmd = chunk;
						if (!_this.partial)
							cmd = _this.lastCmd + "\n";
						_this.partial = true;
						if (echo) sv.r.print(cmd, false, true, true);
					} else if (chunk.search(/>\s+$/) > -1) {
						_this.partial = false;
						if (echo) sv.r.print(chunk, false, false, false);
					} else if (echo) sv.r.print(chunk, false, false, true);
					_this.data += chunk;
				}
			}
	
			var pump = Components
				.classes["@mozilla.org/network/input-stream-pump;1"]
				.createInstance(Components.interfaces.nsIInputStreamPump);
			pump.init(stream, -1, -1, 0, 0, false);
			pump.asyncRead(dataListener, null);
		} catch (e) {
			sv.log.exception(e,
				"sv.socket.rClientSocket() raises an unknown error");
			return(e);
		}
		return(null);
	}
		
	// The main http client function to connect to R socket server
	this.rClientHttp = function (host, port, cmd, listener, echo, procname) {
		// Workaround for NS_ERROR_OFFLINE returned by 'createTransport' when
		// there is no network connection (when network goes down). Based on
		// toggleOfflineStatus() in chrome://browser/content/browser.js.
		if (!navigator.onLine) Components
			.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService2).offline = false;
	
		try {
			var httpRequest, url;
			httpRequest = new XMLHttpRequest();
			httpRequest.onprogress = function () {
				// This would allow to get results chunk by chunks... but have
				// to check echo first and to disable second output in
				// onreadystatechange!
				//sv.r.print(httpRequest.responseText, false, false, false);
			};
			httpRequest.onreadystatechange = function () {
				try {
					if (httpRequest.readyState == 4) {
						// For reasons I don't know, R HTTP server version 2.11.1
						// returns 500 instead of 200 upon correct completion of
						// the command...
						if (httpRequest.status == 200 | httpRequest.status == 500) {
							var res = _toUnicode(httpRequest.responseText);
							if (res.match("\n\f") == "\n\f") {
								// Eliminate trailing (\r)\n\f before the prompt
								res = res.replace(/(\r?\n\f|\s+$)/, "");
							}
	
							// Determine if we have a prompt at the end
							if (res.search(/\+\s+$/) > -1) {
								res = res.rtrim() + " ";
								// If we just shift in partial mode, prepend command
								if (!_this.partial)
									res = _this.lastCmd + "\n";
								_this.partial = true;
								if (echo) sv.r.print(res, false, true, true);
							} else if (res.search(/>\s+$/) > -1) {
								_this.partial = false;
								if (echo) sv.r.print(res, false, false, false);
							} else if (echo) sv.r.print(res, false, false, true);
							// Finish command in case there is a callback
							listener.finished(sv.tools.strings.removeLastCRLF(res));
						} else if (httpRequest.status > 0) {
							sv.log.error(
								"sv.http.rCallback() got a communication error. " +
								"Status: " + httpRequest.status);
							return(httpRequest.status);
						}
					}
				} catch(e) {
					sv.log.exception(e,
						"sv.http.rCallback() raises an unknown error");
					return(e);
				}
				return(null);
			};
				
			// Too long URIs are considered to be > 2083 characters
			// With percent encoding, one can triple required space
			// => set a maximum to 600 characters in non-encoded strings
			// For too long instructions (> 600 characters), or instructions that
			// contain something else than plain ASCII, we write them in a file
			// and pass 'SOURCE=<filepath>' as cmd. The new HTTP server in the R
			// package svHttp should be able to deal with this new process.
			if (cmd.length > 600 || /^[\000-\177]/.test(cmd)) {
				var filename = "svHttpFile" + Math.floor(Math.random() * 65536)
					.toString(36);
				var tempFile = sv.tools.file.temp(filename);
				// It seems that a carriage return is needed at the end,
				// or the last line is not collected
				cmd = cmd + "\n";
				sv.tools.file.write(tempFile, cmd, "UTF-8", false);
				tempFile = tempFile.addslashes();
				cmd = "SOURCE=" + tempFile;
			}
			
			//url is http://<host>:<port>/custom/SciViews?<cmd>&<callback>
			url = "http://" + host + ":" + port + "/custom/SciViews?" +
				encodeURIComponent(_fromUnicode(cmd))
			if (procname != null) url = url + "&" + procname;
			httpRequest.open('GET', url, true);
			httpRequest.setRequestHeader('Host', 'SciViews-K-Komodo');
			//httpRequest.setRequestHeader('Accept-Charset', 'UTF-8');
			//httpRequest.setRequestHeader('Accept-Encoding', 'UTF-8');
			//httpRequest.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
			//httpRequest.setRequestHeader('Content-Transfer-Encoding', 'UTF-8');
			//httpRequest.setRequestHeader('Transfer-Encoding', 'UTF-8');
			//httpRequest.setRequestHeader('Keep-Alive', 'true');
			//httpRequest.setRequestHeader('Connection', 'close');
			httpRequest.send(''); // Try sending data!	
		} catch (e) {
			sv.log.exception(e, "sv.socket.rClientHttp() raises an unknown error");
			return(e);
		}
		return(null);
	}
		
	this.rClient = function (host, port, cmd, listener, echo, procname) {
		if (sv.clientType == "socket") {
			res = this.rClientSocket(host, port, cmd, listener, echo, procname);
		} else {
			res = this.rClientHttp(host, port, cmd, listener, echo, procname)
		}
		return(res);
	}
		
	this.setSocketType = function (type) {
		switch(type) {
		 case "http":
			_this.rClient = this.rClientHttp;
			// Make sure sv.clientType is correct
			sv.clientType = "http";
			// For calltip and complete, I have something different
			sv.prefs.setPref("sciviews.client.currentType", "http", true);
			break;
		 case "socket":
		 default:
			_this.rClient = this.rClientSocket;
			// Make sure sv.clientType is correct
			sv.clientType = "socket";
			// For calltip and complete, I have something different
			sv.prefs.setPref("sciviews.client.currentType", "socket", true);
			break;
		}
	}
		
	// PhG: no, we don't use this any more! We use sv.clientType!
	//this.setSocketType(sv.prefs.getPref("sciviews.r.type", "http"));
	// Explanation: the "sciviews.r.type" is the value the user would like
	// to use. The value in sv.clientType is the actual value used! Let's think
	// at this situation: the user connects to R with socket server, then he
	// changes settings in the pref box. "sciviews.r.type" is changed, but
	// sv.clientType remains the same until he quits and restart R.
	this.setSocketType(sv.clientType);
		
	// Send an R command through the socket/http; any additional arguments will be
	// passed to procfun, which can be also an object, then the result will be
	// stored in procfun.value
	this.rCommand = function (cmd, echo /*= true*/, procfun) {
		if (echo === undefined) echo = true;
		//if (procfun === undefined) procfun = "sv.socket.rProcess";
		
		//sv.log.debug("rCommand:: " + cmd);
		
		if (cmd.substr(0, 7) == "<<<e>>>") {
			// Record reworked version of last command for future reuse
			// Eliminate leading '<<<e>>>', prepend with ':> ' and replace '\n' by
			// '\n:+ ' to mimic multiline command prompts
			_this.lastCmd = ":> " +
				cmd.substring(7).replace(/[\n\r]{1,2}/, "\n:+ ");
		}
			
		var host = sv.prefs.getPref("sciviews.r.host", "127.0.0.1");
		var port = sv.prefs.getPref("sciviews.r.port", 8888);
		var id = "<<<id=" +
			sv.prefs.getPref("sciviews.ko.id", "SciViewsK") + ">>>";
		cmd = sv.tools.strings.replaceCRLF(cmd, "<<<n>>>");
		var listener;
		var procname = null;
		if (procfun == null) {	// Do nothing at the end
			listener = { finished: function(data) {} }
		} else if (typeof(procfun) == "string") { // This is a RjsonP call
			listener = { finished: function(data) {
				// The call is constructed as a RjsonP object => evaluate it
					return(sv.rjson.eval(_toUnicode(data)));
				}
			}
			procname = procfun;
		} else { 				// Call procfun at the end
			// Convert all arguments to an Array
			var args = Array.apply(null, arguments);
			listener = { finished: function (data) {
					// Keep only arguments after procfun, and add "data"
					args.splice(0, 3, data);
					if (typeof(procfun) == "function") {
						procfun.apply(null, args);
					} else { // We can add a property even to a function
						procfun.value = data;
					}
				}
			}
		}
		
		var res = _this.rClient(host, port, id + cmd + "\n", listener,
			echo, procname);
		if (res && res.name && res.name == "NS_ERROR_OFFLINE")
			ko.statusBar.AddMessage("Error: Komodo went offline!",
				"SciViews-K client", 5000, true);
		return(res);
	}
	// Test: sv.socket.rCommand("<<<q>>>cat('library = '); str(library)");
		
	// This is the default callback function used when sending RjsonP command
	// It just outputs results to the R Output panel if echo is true
	this.rProcess = function (rjson) {
		// If an encoding is returned by R, reset it
		if (rjson.encoding != null)
			_this.charset = rjson.encoding;
		// Are we in partial code mode?
		if (rjson.options.partial != null)
			_this.partial = (rjson.options.partial == true);
		// Results of the calculation are in the 'result' component
		var res = rjson.result;
		if (res == null) return;
		
		// Do we echo these results?
		if (rjson.options.echo == true) {
			// Are we inside a multiline command?
			var command = false;
			if (res.search(/\+\s+$/) > -1) command = true;
			res = res.rtrim() + " ";
			sv.r.print(res, false, command, _this.partial);
		}
	}
		
	// Synchronous communication with R (don't abuse, and only for quick commands!)
	// Here, echo is always false and there is no callback function of course
	this.rCommandSync = function (cmd /*= "cat(R.version.string)"*/) {
		if (cmd === undefined || cmd == null) cmd = "cat(R.version.string)";
		
		// Some synchronous request from R
		var host = sv.prefs.getPref("sciviews.r.host", "127.0.0.1");
		var port = sv.prefs.getPref("sciviews.r.port", 8888);
		var id = "<<<id=" +
			sv.prefs.getPref("sciviews.ko.id", "SciViewsK") + ">>>";
		//cmd = id + "<<<h>>>" + cmd;
		cmd = sv.tools.strings.replaceCRLF(id + "<<<h>>>" + cmd, "<<<n>>>");
	
		//url is http://<host>:<port>/custom/SciViews?<cmd>
		var url = "http://" + host + ":" + port + "/custom/SciViews?" +
			encodeURIComponent(_fromUnicode(cmd))
	
		var httpRequest = new XMLHttpRequest();
		try {
			// First, try a 'HEAD'... the HTTP server returns '', but
			// the socket server returns the result directly. Finally,
			// one get null if no server is connected to this port.
			// Otherwise, httpRequest.status should be 200 for success.
			httpRequest.open('HEAD', url, false);
			httpRequest.send(''); //DEBUG: error => data: no!?
			var res = httpRequest.responseText;
			if (res != '') { // This must be a R socket server
				if (sv.clientType != "socket") {
					// Wrong client type! Switch to 'socket'
					_this.setSocketType("socket");
					sv.log.debug("R server set to 'socket' after autodetection");
				}
				return(_toUnicode(res));
			} else { // This must be a R HTTP server
				if (sv.clientType != "http") {
					// Wrong client type! Switch to 'http'
					_this.setSocketType("http");
					sv.log.debug("R server set to 'http' after autodetection");
				}
				// Try to get result from the HTTP server
				httpRequest.open('GET', url, false);
				httpRequest.send('');
				return(_toUnicode(httpRequest.responseText));
			}
		} catch (e) {
			sv.log.exception(e,
				"sv.socket.rCommandAsync() raises an error." +
				" Maybe the R server is not connected?");
			return(null);
		}
	}
		
	// Update a couple of key settings between Komodo and R
	// TODO: add the current working directory and report WD changes from R
	//       automagically
	// PhG: This mechanisms is error-prone and we should really rethink how to keep
	//      various parameters in phase between R and Komodo
	this.rUpdate = function () {
		// PhG: * OutDec & OutSep are now transmitted via svStart
		//      * koRefresh() is now run at the end of svStart
		//      * conversion is now handled in R... so Komodo does not need`
		//        to know R's encoding any more
		// Thus, it seems we don't need this function any more!
		// Make sure that dec and sep are correctly set in R
	//	this.rCommand('<<<H>>>options(' +
	//		'OutDec = "' + sv.prefs.getPref("r.csv.dec", ".") +
	//		'", OutSep = "' + sv.prefs.getPref("r.csv.sep", ",") +
	//		'"); invisible(koRefresh(force = TRUE)); ' +
	//		'cat("", localeToCharset()[1], sep="");',
	//		// ??? The following does not work.
	//		//'cat("<<<charset=", localeToCharset()[1], ">>>", sep = "")',
	//		false, function (s) { // this is a callback receiving the character set
	//			_this.charset = sv.tools.strings.trim(s);
	//			if (_this.debug) sv.log.debug("R charset: " + _this.charset);
	//	});
	}
		
		
	/////// Socket server //////////////////////////////////////////////////////
	this.debug = sv.log.isAll();	// Set to true for debugging mode
	
	this.serverIsLocal = true;		// Is the socket servicing only localhost?
	const nsITransport = Components.interfaces.nsITransport;
	
	var _serverSocket;				// The SciViews-K socket server object
	var _inputString;				// The string with command send by R
	var _outputString;				// The string with the result to send to R
	var _output = [];				// An array with outputs
	var _timeout = 250;				// Maximal ms to wait for input
	var _gDocFile = "";             // The math to the file we are looking for
	var _gDoc;                      // The file we are looking for, if in file mode
	var _gDocIntervalID = 0;        // The ID if the interval timer
	
	
	// Debug only
	this.serverSocket = _serverSocket;
	
	// The following two methods implement nsIServerSocketListener
	this.onSocketAccepted = function (socket, transport) {
		try {
			if (_this.debug)
				sv.log.debug("Socket server: onSocketAccepted!");
	
			// Make sure to clean input and output strings before use
			_inputString = "";
			_outputString = "";
			_output = [];
			if (_this.debug)
				sv.log.debug("Socket server: " + transport.host +
					" on port " + transport.port + "\n");
	
			// Then, read data from the client
			var inputStream = transport.openInputStream(nsITransport
				.OPEN_BLOCKING, 0, 0);
			var sin = Components
				.classes["@mozilla.org/scriptableinputstream;1"]
				.createInstance(Components.interfaces
				.nsIScriptableInputStream);
			sin.init(inputStream);
	
			var date = new Date();
			var timeout = _timeout;
			var inlength = 0;
			do {
				_inputString = sin.read(512);
				// TODO: do we get <<<timeout=XXX>>>? => change _timeout
			} while (_inputString == "" && ((new Date()) - date < _timeout))
	
			// Read the complete data
			while (sin.available() > 0) _inputString += sin.read(512);
			// Is there data send?
			if (_inputString == "") {
				//_outputString += "Error: no command send!\n"
				_output.push("Error: no command send!");
			} else {
				_inputString = _toUnicode(_inputString);
				// Process the command
				if (this.debug)
					sv.log.debug("Command send by the client:\n" + _inputString);
				try {
					if (_inputString.match(/^<<<js>>>/)) {
						eval(_inputString.substring(8));
					} else if (_inputString.match(/^<<<rjsonp>>>/)) {
						sv.rjson.eval(_inputString.substring(12));
					} else {
						// TODO: this is some output data... wait that R finishes
						// Sending the output and echo it into the R Output panel
						sv.r.print(_inputString, false, false, false);
						// TODO: change this (just to test if it is the cause of
						//       the problems)!
						//eval(_inputString);
					}
				} catch(e) {
					_output.push(e.toString());
				}
			}
			if (_this.debug) sv.log.debug(_output.length ?
				("Result:\n" + _output.join("\n")) :
				("Nothing to return to the socket client"));
		
			// And finally, return the result to the socket client
			// (append \n at the end)
			_outputString = _fromUnicode(_output.join("\n") + "\n");
			var outputStream = transport.openOutputStream(nsITransport
				.OPEN_BLOCKING, 0, 0);
			outputStream.write(_outputString, _outputString.length);
		} catch(e) {
			sv.log.exception(e, "Socket server: onSocketAccepted()," +
				" unmanaged error");
		} finally {
			// Make sure that streams are closed
			outputStream.close();
			inputStream.close();
			if (_this.debug) sv.log.debug("SocketAccepted: end");
		}
	};
		
	this.onStopListening = function (socket, status) {
		// The connection is closed by the client
		if (_this.debug) sv.log.debug("(onStopListening) Socket server closed");
	};
	// End of 'nsIServerSocketListener' methods
		
	// The following function implements the file server reaction in Komodo
	this.checkFile = function () {
		try {
			if (_gDoc.differentOnDisk()) {
				_output = [];
				if (_this.debug)
					sv.log.debug("File server: " + _gDocFile + "\n");
				_gDoc.load();
				// Reset res file
				sv.tools.file.write(_gDocFile + ".out", "", "UTF-8", false);
				var cmd = _gDoc.buffer;
				if (cmd == "") {
					_output.push("Error: no command send!");
				} else {
					// Process the command
					if (_this.debug)
						sv.log.debug("Command send by the client:\n" + cmd);
					// Note that cmd starts with <<<xxxxxxxx>>> where x = 0-9
					try {
						if (cmd.match(/^<<<[0-9]{8}>>><<<js>>>/)) {
							eval(cmd.substring(22));
						} else if (cmd.match(/^<<<[0-9]{8}>>><<<rjsonp>>>/)) {
							sv.rjson.eval(cmd.substring(26));
						} else {
							// TODO: this is some output data... wait that R finishes
							// Sending the output and echo it into the R Output panel
							sv.r.print(cmd.substring(14), false, false, false);
						}
					} catch(e) {
						_output.push(e.toString());
					}		
				}
				if (_this.debug) sv.log.debug(_output.length ?
					("Result:\n" + _output.join("\n")) :
					("Nothing to return to the socket client"));
				// And finally, return the result to the file client
				// (append \n at the end)
				sv.tools.file.write(_gDocFile + ".out",
					_output.join("\n") + "\n", "UTF-8", true);
			}
		} catch (e) {
			sv.log.exception(e, "File server: checkFile()," +
				" unmanaged error");
		}
	}
	
	// Core function for the SciViews-K socket/file server
	// Create the _serverSocket object
	// TODO: it does not handle correctly conversion
	//       (now an UTF-8 string is returned)
	this.serverStart = function (port) {
		if (_this.debug) sv.log.debug("Socket/file server: serverStart");
	
		try {
			if (typeof(_serverSocket) != "undefined") _serverSocket.close();
		} catch(e) {
			// Note that this is not an error => activate this only for debugging
			sv.log.exception(e, "sv.socket.serverStart() failed to close the" +
				" socket/file before reopening it");
		}
		// Make sure port is OK
		if (port) {
			sv.prefs.setPref("sciviews.ko.port", port, true, true);
		} else {
			port = sv.prefs.getPref("sciviews.ko.port", 7052);
		}
		// The way the server is started depends on its type (file or socket)
		if (sv.serverType == "file") {
			// File name is: <tempdir>.sv<port>
			// <tempdir> is /tmp/ everywhere, except on Windows, where it is the
			// the default system temp dir
			var tempdir = "/tmp/"
			if (navigator.platform.indexOf("Win") == 0) {
				var nsIFile = Components.interfaces.nsIFile;
				var dirSvc = Components
					.classes["@mozilla.org/file/directory_service;1"]
					.getService(Components.interfaces.nsIProperties);
				tempdir = dirSvc.get("TmpD", nsIFile).path + "\\";
			}
			var file = ".sv" + port
			_gDocFile = tempdir + file; 
			// (re)create this file
			sv.tools.file.write(_gDocFile, "\n", "UTF-8", false);
			var documentService = Components
				.classes["@activestate.com/koDocumentService;1"].getService();
			_gDoc = documentService
				.createDocumentFromURI(ko.uriparse.localPathToURI(_gDocFile));
			_gDoc.addReference();
			if (!_gDoc) alert("Problem creating or accessing '" + _gDocFile + "'");
			_gDoc.load();
			_gDocIntervalID = window.setInterval('sv.socket.checkFile()', 500);
			ko.statusBar.AddMessage("Listening to " + _gDocFile, "SciViews-K",
				3000, true);
		} else { // Must be a socket server
			try {
				_serverSocket = Components
					.classes["@mozilla.org/network/server-socket;1"]
					.createInstance(Components.interfaces.nsIServerSocket);
				_serverSocket.init(port, _this.serverIsLocal, -1);
				_serverSocket.asyncListen(_this);
				this.serverSocket = _serverSocket;
			} catch(e) {
				//TODO: add exception type checking here (see below)
				port = parseInt(port);
				// PhG: do this silently!
				//if (ko.dialogs.okCancel(
				//	sv.translate("Cannot open a server socket to allow communication "
				//		+ " from R to Komodo on port %S.\n" +
				//		"Click OK to change port to %S and try again.", port, port + 1),
				//		"OK", null, "SciViews-K") == "OK") {
				// Avoid increasing constantly the port number!
				
				// PhG: disabled for now because when offline, I cannot create server
				// and it recurse indefinitely!
//				if (port >= 8000) port = 7051;
//				_this.serverStart(port + 1);
				//}
//				return;
		
				sv.log.exception(e, "SciViews-K cannot open a server socket on port "
					+ port + ".\nMake sure the port is not already used by another" +
					" Komodo instance" + "\nor choose another port in the" +
					" preferences and restart Komodo", false);
				// If the port is already used, I got:
				// "0x80004005 (NS_ERROR_FAILURE)"  location: "JS frame ::
				// chrome://sciviewsk/content/js/socket.js :: anonymous :: line 285
			}
		}
		if (_this.debug)
			sv.log.debug("serverStart: Socket/file server started");
		ko.statusBar.AddMessage(
			"SciViews-K socket/file server started", "SciViews-K server",
			2000, true);
	}
		
	// Stop the SciViews-K socket/file server
	this.serverStop = function () {
		var isStopped = false;
		// Try stopping the file server
		if (_gDocIntervalID != 0) {
			try {
				isStopped = true;
				window.clearInterval(_gDocIntervalID);
				_gDocIntervalID = 0;
				_gDoc.releaseReference();
				ko.statusBar.AddMessage("Stop listening to " + _gDocFile,
					"SciViews-K", 3000, true);
			} catch (e) {
				sv.log.exception(e, "Socket server: serverStop() cannot" +
					" close the file", true);				
			}	
		}
		// Try stopping the socket server
		if (typeof(sv.socket.serverSocket) != "undefined") {
			try {
				_this.serverSocket.asyncListen(_this);
			} catch(e) {
				if (e.name == "NS_ERROR_IN_PROGRESS") {
					isStopped = true;
					try {
						_serverSocket.close();
					} catch(e) {
						sv.log.exception(e, "Socket server: serverStop()" +
						" cannot close the socket", true);
					}
				}
			}
		}
		if (!isStopped) {
			ko.statusBar.AddMessage(
				"SciViews-K socket/file server is not started", "SciViews-K server",
				2000, true);
		}
	}
		
	// Is the SciViews-K socket server started?
	this.__defineGetter__ ('serverIsStarted', function () {
		// Depends on the server type
		if (sv.serverType == "file") {
			// Look at _gDocIntervalID
			return(_gDocIntervalID != 0);
		} else { // Must be a socket server	
			// Use brute force to find whether socketServer is initiated and listening
			if (typeof(sv.socket.serverSocket) == "undefined") return(false);
			try {
				_this.serverSocket.asyncListen(_this);
			} catch(e) {
				if (e.name == "NS_ERROR_IN_PROGRESS") return(true);
				else if (e.name == "NS_ERROR_NOT_INITIALIZED") return(false);
				else sv.log.exception(e);
			}
			return(true);
		}
	});
		
	// What is the current SciViews-K socket server config?
	this.serverConfig = function () {
		var serverStatus = " (stopped)"
		if (_this.serverIsStarted) serverStatus = " (started)"
		var port = sv.prefs.getPref("sciviews.ko.port", 7052);
		if (_this.serverIsLocal) {
			return("Local " + sv.serverType + " server on port " +
				port + serverStatus);
		} else {
			return("Global " + sv.serverType + " server on port " +
				port + serverStatus);
		}
	}
		
	// Write to the socket server, use this to return something to the client
	this.serverWrite = function (data) {
		if (_this.serverIsStarted) {
			if (sv.serverType == "file") {
				_output.push(data);
			} else { // This must be a socket server, and I have to translate
				_output.push(_fromUnicode(data));
			}
		} else {
			sv.alert("The socket server in unavailable",
				"Trying to write data though the SciViews-K socket server" +
				" that is not started!");
		}
	}
}).apply(sv.socket);

// Launch the SciViews socket server on Komodo startup
//addEventListener("load", function()
//	window.setTimeout("sv.socket.serverStart();", 500), false);
