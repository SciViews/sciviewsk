// SciViews-K RJSON object representation
// Define functions required to correctly interpret RJSON objects in Javascript
// Copyright (c) 2010, Ph. Grosjean (phgrosjean@sciviews.org)
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// sv.rjson.stringify(x, replacer, aerate);	// Create a RJSON version of x
// sv.rjson.eval(x);						// Evaluate a RJSON object
//
// We also need a couple of constants and functions to interpret RJSON code:
// TRUE, FALSE, NA, NULL and Inf constants for R representation of true, false,
// null, undefined and Infinity, respectively
// c(), list() and seq() are functions used in the RJSON objects
// definition for which we need also a (local) JavaScript definition
////////////////////////////////////////////////////////////////////////////////
//
// TODO:
// + Correct encoding of dates... still to be determined!

// Define the 'sv.rjson' namespace
if (typeof(sv.rjson) == "undefined") sv.rjson = {};

(function () {

	// Define a couple of constants matching the way R represents these items
	var TRUE = true;
	var FALSE = false;
	var NA = null;
	var NULL = undefined;
	var Inf = Infinity;
	
	// Define a couple of required functions: c(), list(), structure(), seq()
	var c = function () {
		return(Array.prototype.slice.call(arguments));
	}
	
	var list = function () {
		// Construct an object containing the even elements as components
		// and odd elements as their names
		var res = new Object();
		var name;
		for (var i = 0; i < arguments.length; i++) {
			if (name === undefined) { // Odd items are names 
				name = arguments[i];
			} else { // Even items are values
				res[name] = arguments[i];
				name = undefined;
			}
		}
		return(res);
	}
	
	var seq = function (from, to) {
		// Missing to, or to equals from
		if (to === undefined || from == to) return(from);
		// Construct a sequence of integers
		var res = new Array();
		if (to > from) {
			for (var i = from; i <= to; i++) res.push(i);
		} else {
			for (var i = from; i >= to; i--) res.push(i);
		}
		return(res);
	}
	
	// Code required to stringify items
	var format2digits = function (n) {
		// Format integers to have at least two digits.
		return n < 10 ? "0" + n : n;
	}
	
	// TODO: rework this to make dates compatible with R
	if (typeof Date.prototype.toRJSON !== "function") {
		Date.prototype.toRJSON = function (key) {
			return isFinite(this.valueOf()) ?
				this.getUTCFullYear()      	          + "-" +
				format2digits(this.getUTCMonth() + 1) + "-" +
				format2digits(this.getUTCDate()) : "Inf"; //      + "T" +
				//format2digits(this.getUTCHours())     + ":" +
				//format2digits(this.getUTCMinutes())   + ":" +
				//format2digits(this.getUTCSeconds())   + "Z" : "Inf";
		};
		
		String.prototype.toRJSON =
		Number.prototype.toRJSON =
		Boolean.prototype.toRJSON = function (key) {
			return(this.valueOf());
		};
	}
	
	var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
		escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
		gap,
		indent,
		meta = {    // table of character substitutions
			"\b": "\\b",
			"\t": "\\t",
			"\n": "\\n",
			"\f": "\\f",
			"\r": "\\r",
			"\"": "\\\"",
			"\\": "\\\\"
		},
		rep;
	
	var quote = function (string) {
		// If the string contains no control characters, no quote characters, and no
		// backslash characters, then we can safely slap some quotes around it.
		// Otherwise we must also replace the offending characters with safe escape
		// sequences.
		escapable.lastIndex = 0;
		return escapable.test(string) ?
			'"' + string.replace(escapable, function (a) {
				var c = meta[a];
				return typeof(c) === "string" ? c :
					"\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
			}) + '"' :
			'"' + string + '"';
	}
	
	var str = function (key, holder) {
		// Produce a string from holder[key]
		var i,          // The loop counter
			k,          // The member key
			v,          // The member value
			length,
			mind = gap,
			partial,
			value = holder[key];
		
		// If the value has a toRJSON method, call it to obtain a replacement value
		if (value && typeof(value) === "object" &&
			typeof(value.toRJSON) === "function")
			value = value.toRJSON(key);
		
		// If we were called with a replacer function, then call the replacer to
		// obtain a replacement value.
		if (typeof(rep) === "function")
			value = rep.call(holder, key, value);
		
		// What happens next depends on the value's type.
		switch (typeof(value)) {
		 case "string":
			return(quote(value));
		 case "number":
			return(isFinite(value) ? String(value) :
				value > 0 ? "Inf" :
				value < 0 ? "-Inf" : "NaN");
		 case "boolean":
			return(value ? "TRUE" : "FALSE");
		 case "null":
			return("NA");
		 case "undefined":
			return("NULL");
		 // If the type is 'object', we might be dealing with an object
		 // or an array or null
		 case "object":
			if (!value) return("NA");
			// Make an array to hold the partial results of stringifying this object
			gap += indent;
			partial = [];
			// Is the value an array?
			if (Object.prototype.toString.apply(value) === "[object Array]") {
				// The value is an array. Stringify every element. Use null as a
				// placeholder for non-RJSON values
				length = value.length;
				for (i = 0; i < length; i += 1)
					partial[i] = str(i, value) || "NA";
				// Join all of the elements together, separated with commas,
				// and wrap them in c().
				v = partial.length === 0 ? "c()" :
					gap ? "c(\n" + gap +
					partial.join(", " + gap) + "\n" + mind + ")" :
					"c(" + partial.join(", ") + ")";
				gap = mind;
				return(v);
			}
			// If replacer is an array, use it to select the members to stringify
			if (rep && typeof(rep) === "object") {
				length = rep.length;
				for (i = 0; i < length; i += 1) {
					k = rep[i];
					if (typeof(k) === "string") {
						v = str(k, value);
						if (v) partial.push(quote(k) + " := " + v);
					}
				}
			} else {
				// Otherwise, iterate through all of the keys in the object
				for (k in value) {
					if (Object.hasOwnProperty.call(value, k)) {
						v = str(k, value);
						if (v) partial.push(quote(k) + " := " + v);
					}
				}
			}
			// Join all of the member texts together, separated with commas,
			// and wrap them in list()
			v = partial.length === 0 ? "list()" :
				gap ? "list(\n" + gap + partial.join(", " + gap) + "\n" + mind + ")" :
				"list(" + partial.join(", ") + ")";
			gap = mind;
			return(v);
		}
		return("");
	}
	
	// Stringify data to create a RJSON object
	sv.rjson.stringify = function (x, replacer, aerate) {
		// The stringify method takes a value and an optional replacer and returns
		// a RJSON text. The replacer can be a function that can replace values, or
		// an array of strings that will select the keys. A default replacer method
		// can be provided.
		var i;
		gap = "";
		indent = aerate ? " " : "";
		// If there is a replacer, it must be a function or an array.
		// Otherwise, throw an error.
		rep = replacer;
		if (replacer && typeof replacer !== "function" &&
			(typeof replacer !== "object" ||
			typeof replacer.length !== "number")) {
			throw new Error("sv.rjson.stringify");
		}
		// Make a fake root object containing our value under the key of ''.
		// Return the result of stringifying the value.
		return(str("", {"": x}));
	}
	
	// Evaluates an RJSON object. Warning! No protection against inserted code
	// This is a *feature* and we must use this only with trusted servers!
	sv.rjson.eval = function (x) {
		// Before evaluating the code, we need to transform ':=' into ','
		// to make the code contained in the Rjson object compatible with
		// JavaScript syntax
		return(eval("(" + x.replace(/:=/g, ",") + ")"));
	}

}());