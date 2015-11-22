// SciViews-K string functions
// Various functions to manipulate strings 'sv.tools.strings' & 'String' objects
// Copyright (c) 2008-2009, Philippe Grosjean, Romain Francois and Kamil Barton
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// sv.tools.strings.replaceCRLF(str, code);	// Replace LF and CR by 'code'
// sv.tools.strings.removeLastCRLF(str);    // Remove last CR and/or LF
// sv.tools.strings.toRegex(str);			// Changes a string to a regex
// sv.tools.strings.filename(str);			// Get filename/last dir from path
// sv.tools.strings.addslashes(str);        // Add slashes to file path
// sv.tools.strings.trim(str, which);       // Trim leading and/or trailing sp
//
// Additional methods to String objects ////////////////////////////////////////
// String.prototype.trim();					// Trim function for String
// String.prototype.rtrim();				// Right trim
// String.prototype.ltrim();				// Left trim
// String.prototype.addslashes();			// Add slashes
// String.prototype.regExpEscape();         // Transfor regular expression
////////////////////////////////////////////////////////////////////////////////

// Define the 'sv.tools.strings' namespace
if (typeof(sv) == 'undefined') sv = {};
if (typeof(sv.tools) == 'undefined') sv.tools = {};
if (typeof(sv.tools.strings) == 'undefined') sv.tools.strings = {};

// Replace line feed and carriage return by 'code'
sv.tools.strings.replaceCRLF = function (str, code) {
	// Replace all \r\n by 'code' in cmd
	if (str) str = str.replace(/(\r?\n|\r)/g, code);
	return(str);
}

// Remove the last line feed and or carriage return in the text
sv.tools.strings.removeLastCRLF = function (str) {
	if (str) str = str.replace(/[\n\r]{1,2}$/, "");
    return(str);
}

// changes a string to a regular expression
sv.tools.strings.toRegex = function (str) {
	if (str) str = str
		.replace(/([\]\(\\\*\+\?\|\{\[\(\)\^\$\.\#])/g, "\\$1")
		.replace(/\t/g, "\\t")	//.replace(/ /, "\\s")
		.replace(/\n/g, "\\n")	.replace(/\r/g, "\\r")
		.replace(/\f/g, "\\f");
	return(str);
}

// Get filename or last directory name in a file path
sv.tools.strings.filename = function (str) {
	// Under Windows, replace \ by /
	if (navigator.platform.indexOf("Win") == 0)
		str = str.replace(/[\\]/g, "/");
	// Remove last trailing '/'
	str = str.replace(/\/$/, "");
	// Split into components
	items = str.split("/");
	// Return last component
	return(items[items.length - 1]);
}

sv.tools.strings.addslashes = function (str) {
	// Original by Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	if (str) str.replace(/([\\"'])/g, "\\$1")
		.replace(/\x00/g, "\\0").replace(/\u0000/g, "\\0");
	return(str);
}

sv.tools.strings.trim = function (str, which) {
	if (which === undefined) which == "both";
	if (!str) return(str)
	var rx;
	switch(which) {
	 case "left":
		rx = /^\s+/g;
		break;
	 case "right":
		rx = /\s+$/g;
		break;
	 case "both":
	 default:
		rx = /^\s+|\s+$/g;
		break;
	}
	return(str.replace(rx, ""));
}

//// Additional methods to String objects //////////////////////////////////////
// Trim function for String
String.prototype.trim = function()
	sv.tools.strings.trim(this);

// Right trim
String.prototype.rtrim = function()
	sv.tools.strings.trim(this, "right");

// Left trim
String.prototype.ltrim = function()
	sv.tools.strings.trim(this, "left");

// Add slashes
String.prototype.addslashes = function ()
	sv.tools.strings.addslashes(this);

// Escape string for regular expression
String.prototype.regExpEscape = function()
	sv.tools.strings.toRegex(this);
