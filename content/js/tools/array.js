// SciViews-K array functions
// Various functions to manipulate arrays, 'sv.tools.array' namespace'
// Copyright (c) 2008-2010, Romain Francois and Kamil Barton
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// sv.tools.array.contains(a, s);   // Does array 'a' contain 's'
// sv.tools.array.unique(a);        // Keep unique items in array 'a'
// sv.tools.array.duplicates(a);    // Which items are duplicated in array 'a'
// sv.tools.array.remove(a, s);     // Eliminate 's' from 'a'
// sv.tools.array.removeItem(a, s); // Return an array with 's' removed from 'a'
// sv.tools.array.CSVToArray(data, sep); // Convert CSV data to an array
////////////////////////////////////////////////////////////////////////////////

// Define the 'sv.tools.array' namespace
if (typeof(sv) == 'undefined') sv = {};
if (typeof(sv.tools) == 'undefined') sv.tools = {};
if (typeof(sv.tools.array) == 'undefined') sv.tools.array = {};

sv.tools.array.contains = function array_contains (a, s)
	(a.indexOf(s) !== -1);

sv.tools.array.unique = function array_unique (a)
	a.reduce(function (x, j) {
		if (x.indexOf(j) == -1) x.push(j);
		return(x)
	}, []);

sv.tools.array.duplicates = function array_duplicates (a) {
	var dup = [];
	a.forEach(function (el, i, x) {
		if (i > 0 && x.lastIndexOf(el, i - 1) != -1) dup.push(el)
	});
	return(dup);
}

sv.tools.array.remove = function array_remove (a, s)
	a.filter(function(x) x !== s);

sv.tools.array.removeItem = function (a, s) {
	var b = [];
	for (i in a)
		if (i != s) b[i] = a[i]
	return(b);
}

// From http://www.bennadel.com/index.cfm?dax=blog:1504.view
sv.tools.array.CSVToArray = function csv_to_array (data, sep) {
	sep = (sep || ",");
	var objPattern = new RegExp((
		// Delimiters
		"(\\" + sep + "|\\r?\\n|\\r|^)" +
		// Quoted fields
		"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
		// Standard fields
		"([^\"\\" + sep + "\\r\\n]*))"
    ), "gi");
	var arrData = [[]];
	var arrMatches = objPattern.exec(data);
	while (arrMatches) {
		var strMatchedDelimiter = arrMatches[1];
		if (strMatchedDelimiter.length &&
			(strMatchedDelimiter != sep)) {
			arrData.push([]);
        }
		if (arrMatches[2]) {
			var strMatchedValue = arrMatches[2]
				.replace(new RegExp( "\"\"", "g" ),	"\"");
		} else {
			var strMatchedValue = arrMatches[3];
		}
		arrData[arrData.length - 1].push(strMatchedValue);
		arrMatches = objPattern.exec(data);
	}
	return(arrData);
}
