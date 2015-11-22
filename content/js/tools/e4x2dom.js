// SciViews-K E4X functions, 'sv.tools.e4xdom' namespace
// From this post and modified by R. Francois so that it works with XUL:
// http://ecmanaut.blogspot.com/2006/03/e4x-and-dom.html
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// sv.tools.e4x2dom.importNode(e4x, doc);     // Translate e4x node to DOM node
// sv.tools.e4x2dom.appendTo(e4x, node, doc); // Append e4x node to a DOM node
// sv.tools.e4x2dom.setContent(e4x, node);    // Idem, but clear DOM node first
// sv.tools.e4x2dom.append(e4x, node, i);     // Append at 'i'th position
// sv.tools.e4x2dom.clear(node);              // Clear a DOM node
// sv.tools.e4x2dom.d4e(domNode);             // Translate DOM node to e4x node
////////////////////////////////////////////////////////////////////////////////

// Define the 'sv.tools.e4x2dom' namespace
if (typeof(sv.tools.e4x2dom) == 'undefined') sv.tools.e4x2dom = {};

var HTML = "http://www.w3.org/1999/xhtml";
var XUL  = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
var SVG  = "http://www.w3.org/2000/svg";
var RDF  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

// PhG: the following line generates an error => commented out
// I think that E4X is now disabled in Komodo!!!
//default xml namespace = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

// Translate e4x (JavaScript) node into a DOM node
sv.tools.e4x2dom.importNode = function (e4x, doc) {
	var me = this.importNode, xhtml, domTree, importMe;
	me.Const = me.Const || { mimeType: 'text/xml' };
	me.Static = me.Static || {};
	me.Static.parser = me.Static.parser || new DOMParser;
	xhtml = new XML('<testing\n' +
		'xmlns:html="http://www.w3.org/1999/xhtml"\n' +
		'xmlns:svg="http://www.w3.org/2000/svg"\n' +
		'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"\n' +
		'xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"/>\n');
	xhtml.test = e4x;
	domTree = me.Static.parser.parseFromString( xhtml.toXMLString().
		replace( />\n *</g, "><" ), me.Const.mimeType);
	importMe = domTree.documentElement.firstChild;
	while (importMe && importMe.nodeType != 1)
		importMe = importMe.nextSibling;
	if (!doc) doc = document;
	return(importMe ? doc.importNode(importMe, true) : null);
}

// Append an e4x node to a DOM node
sv.tools.e4x2dom.appendTo = function (e4x, node, doc) {
	return(node.appendChild(this.importNode(e4x, doc || node.ownerDocument)));
}

// Append an e4x node to a DOM node, clearing it first
sv.tools.e4x2dom.setContent = function (e4x, node) {
	this.clear(node);
	this.appendTo(e4x, node);
}

// Append an e4x node to a DOM node, clear first or not depending on 'i'
sv.tools.e4x2dom.append = function (e4x, node, i) {
	if (i == 0) {
		this.setContent(e4x, node);
	} else {
		this.appendTo(e4x, node);
	}
}

// Clear a DOM node
sv.tools.e4x2dom.clear = function (node) {
	while (node.firstChild)
		node.removeChild(node.firstChild);
}

// Translate a DOM node into an e4x (JavaScript) node
sv.tools.e4x2dom.d4e = function (domNode) {
	var xmls = new XMLSerializer();
	return(new XML(xmls.serializeToString(domNode)));
}
