// SciViews-K interpolationquery functions
// Define functions to drive the custom interpolationquery dialog box
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
 * Modified and adapted for SciViews-K by Ph. Grosjean.
 * 
 * The Initial Developer of the Original Code is ActiveState Software Inc.
 * Portions created by ActiveState Software Inc are Copyright (C) 2000-2007
 * ActiveState Software Inc. All Rights Reserved.
 * 
 * Contributor(s):
 *   ActiveState Software Inc
 *   Ph. Grosjean
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

/* String interpolation query dialog (see interpolate.js)
 *
 * Used when a strings being interpolated include codes requiring that the user
 * be asked for information to place in the string.
 *
 * With this version, we got more help on the code being constructed
 * and also the possibility to fill mru lists using a R command
 */

var gQueries = null;
var gHelpWin = null;
var gIds = new Object();
var args = new Object();
var argNames = new Object();
var sv = null;
var gOnOK = "";

function OnLoad () {
    var dialog = document.getElementById("dialog-interpolationquery")
    var okButton = dialog.getButton("accept");
    var cancelButton = dialog.getButton("cancel");
    okButton.setAttribute("accesskey", "o");
    cancelButton.setAttribute("accesskey", "c");
    
	// PhG added to retrieve default tooltip from prefs
	var prefsSvc = Components.classes["@activestate.com/koPrefService;1"].
		getService(Components.interfaces.koIPrefService);
	var prefs = prefsSvc.prefs;
	
    // PhG added to provide further help on R snippets
    var helpButton = dialog.getButton("help");
    helpButton.setAttribute("accesskey", "?");
    helpButton.setAttribute("hidden", "true"); // Hidden by default

    // Process input arguments.
    if (typeof(window.arguments[0].title) != "undefined" &&
        window.arguments[0].title != null) {
        document.title = window.arguments[0].title;
    } else {
        document.title = "Interpolation Query";
    }
    gQueries = window.arguments[0].queries;
    sv = window.arguments[0].sv;

    // Generate UI for the queries.
    var queryRows = document.getElementById("query-rows");
    var q, label, textbox, row, hbox, i;
    try {
        for (i = 0; i < gQueries.length; i++) {
            // Want the following XUL for each query:
            //    <row align="center">
            //        <label id="query0-label"
            //               value="QUESTION"
            //               control="query0-textbox"
            //               crop="end"
            //               flex="1"/>
            //        <textbox id="query<i>-textbox"
            //                 style="min-height: 1.8em;"
            //                 flex="1"
            //                 value="<answer>"
            //                 type="autocomplete"
            //                 autocompletepopup="popupTextboxAutoComplete"
            //                 autocompletesearch="mru"
            //                 autocompletesearchparam="dialog-interpolationquery-<mruName>Mru"
            //                 maxrows="10"
            //                 enablehistory="true"
            //                 completeselectedindex="true"
            //                 tabscrolling="true"
            //                 ontextentered="this.focus();"
            //                 onfocus="this.select();"/>
            //    </row>
            //
            // unless this is a password query (q.isPassword), then we want the
            // <textbox/> to be:
            //        ...
            //        <textbox id="query<i>-textbox"
            //                 style="min-height: 1.8em;"
            //                 flex="1"
            //                 value="<answer>"
            //                 type="password"
            //                 onfocus="this.select();"/>
            //        ...
            q = gQueries[i];

            // Special case: if query is "R-desc" or "R-tip", use it
            // for extra features of our R interpolation query dialog box
            // and make sure we return nothing from it
            switch (q.question) {            
			 case "R-desc":
                var queryDesc = document.getElementById("query-desc");
                if (queryDesc.value == "") {
                    queryDesc.value = q.answer;
                    queryDesc.setAttribute("tooltiptext", q.answer);
                } else {
                    queryDesc.value = queryDesc.value + " " + q.answer;
                    queryDesc.setAttribute("tooltiptext", queryDesc.value);
                }
                //queryDesc.setAttribute("hidden", "false");
                // Make sure we return nothing from here!
                q.answer = "";
                break;
            
             case "R-tip":
                // Set the tooltip text of a query box to the provided string
				var id = gIds[q.answer.match(/^[^:]+(?=:)/)];
				if (typeof(id) != 'undefined') {
					// Change the tooltip for this item
					document.getElementById(id).setAttribute("tooltiptext",
						q.answer.replace(/^[^:]+:/, ""));
				}
                // Make sure we return nothing from here!
                q.answer = "";
                break;
            
			 case "R-onfocus":
                // Set the onfocus action for this textbox
				var id = gIds[q.answer.match(/^[^:]+(?=:)/)];
				if (typeof(id) != 'undefined') {
					// Change the onfocus attribute for this item
					document.getElementById(id).setAttribute("onfocus",
						q.answer.replace(/^[^:]+:/, "") + " this.select();");
				}
                // Make sure we return nothing from here!
                q.answer = "";
                break;
			
			 case "R-onok":
                // Set the onok action
				gOnOK = q.answer;
                // Make sure we return nothing from here!
                q.answer = "";
                break;
			
             case "R-help":
             case "URL-help":
                helpButton.setAttribute("hidden", "false");
                dialog.setAttribute("ondialoghelp",
                    "Help('" + q.answer + "');");
                // Make sure we return nothing from here!
                q.answer = "";
                break;
            
             case "RWiki-help":
                helpButton.setAttribute("hidden", "false");
                // Get the RWiki base URL
				var baseURL = "http:/wiki.r-project.org/rwiki/doku.php?id="
				baseURL = sv.prefs.getPref("sciviews.rwiki.help.base",
					baseURL);
                dialog.setAttribute("ondialoghelp",
                    "Help('" + baseURL + q.answer + "');");
                // Make sure we return nothing from here!
                q.answer = "";
                break;
            
             default:
                row = document.createElement("row");
                row.setAttribute("align", "center");
				
                label = document.createElement("label");
                label.setAttribute("id", "query"+i+"-label");
                // PhG: restrict label to first part of 'label-list' pair
				label.setAttribute("value", q.question.replace(/-.*$/, "")+" =");
                label.setAttribute("control", "query"+i+"-textbox");
                label.setAttribute("crop", "end");
                label.setAttribute("flex", "1");
                row.appendChild(label);
    
                textbox = document.createElement("textbox");
                textbox.setAttribute("id", "query"+i+"-textbox");
				// PhG: save the correspondance between q.question and id
				gIds[q.question] = "query"+i+"-textbox";
                textbox.setAttribute("style", "min-height: 1.8em;");
                textbox.setAttribute("flex", "1");
				
                if (q.answer) {
                    textbox.setAttribute("value", q.answer);
                } else {
                    textbox.setAttribute("value", "");
                }
                textbox.setAttribute("onfocus", "this.select();");
				textbox.setAttribute("onblur",
					"if (this.value != args['" + q.question + "']) args['" +
					q.question + "'] = this.value;");
				
    
                if (q.isPassword) {
                    textbox.setAttribute("type", "password");
                } else {
                    textbox.setAttribute("type", "autocomplete");
                    textbox.setAttribute("autocompletepopup", "popupTextboxAutoComplete");
                    textbox.setAttribute("autocompletesearch", "mru");
                    if (q.mruName) {
						textbox.setAttribute("autocompletesearchparam", 
                            "dialog-interpolationquery-"+
							q.mruName.replace(/^.*-/, "")+"Mru");
                        textbox.setAttribute("enablehistory", "true");
                    } else {
                        // Disable autocomplete: no mruName given.
                        textbox.setAttribute("disableautocomplete", "true");
                        textbox.removeAttribute("enablehistory"); 
                    }
                    textbox.setAttribute("maxrows", "10");
                    textbox.setAttribute("completeselectedindex", "true");
                    // PhG: was set to true, but changed to false for easier navig
                    textbox.setAttribute("tabscrolling", "false");
                    textbox.setAttribute("ontextentered", "this.focus();");
                }
				// PhG: if a default tooltip is defined for this item, set it:
				if (prefs.hasStringPref("dialog-tip-" + q.question))
					textbox.setAttribute("tooltiptext",
						prefs.getStringPref("dialog-tip-" + q.question));	
                
				row.appendChild(textbox); 
                queryRows.appendChild(row);
				
				// PhG: add this to the args object
				args[q.question] = q.answer;
            }
        }
    } catch(ex) {
        dump("error adding interpolation query rows: " + ex + "\n");
    }

    window.sizeToContent();
    dialog.moveToAlertPosition();
}

function OK () {
    try { gHelpWin.closeHelp(); } catch(e) { }
    // Store users answers to query objects.
    for (var i = 0; i < gQueries.length; i++) {
        var q = gQueries[i];
        // Skip special %ask fields like "R-desc" or "R-tip"
        if (!q.question.match(/^(R-onfocus|R-onok|R-desc|R-tip|R-help|RWiki-help|URL-help)$/i)) {
            var id = "query"+i+"-textbox";
            var queryTextbox = document.getElementById(id);
            if (queryTextbox.value) {
                q.answer = queryTextbox.value;
                if (q.mruName) ko.mru.addFromACTextbox(queryTextbox);
            } else {
                q.answer = "";
            }
        }
    }
	window.arguments[0].retval = "OK";
	// Do we have onOK code to execute?
	if (gOnOK != "") eval(gOnOK);
    return(true);
}

function Cancel () {
    try { gHelpWin.close(); } catch(e) { }
    window.arguments[0].retval = "Cancel";
    return(true);
}

function Help (uri) {
    // Try to differentiate an URL from a help topic
	var isUri = uri.search(/^((f|ht)tps?|chrome|about|file):\/{0,3}/) === 0;
	if (isUri) {
        ShowHelp(uri);
    } else {
        // If uri is a R help topic, get the corresponding R HTML help page
        // R must be started and linked to Komodo for this to work
        if (sv.r.running) {
            var cmd = 'cat(getHelpURL(help("' + uri + '", help_type = "html")))';
            var res = sv.r.evalCallback(cmd, ShowHelp);
        } else {
            alert("There is help available for this item, but R must be " +
                  "started to display it. Close this dialog box and select " +
                  "R -> Start R in the Komodo menu to launch R...");    
        }
    }
}

function ShowHelp (uri) {
    // Since we are a modal dialog box, we cannot reuse the RHelpWindow
    // So, we use a much simpler Rinterpolationhelp dialog box instead
    var obj = new Object();
    obj.title = document.title + " Help";
    obj.uri = uri; 
    gHelpWin = window.openDialog("chrome://sciviewsk/content/Rinterpolationhelp.xul",
            "RSnippetHelp", "chrome=yes,modal,resizable=yes," +
            "scrollbars=yes,status=no,close", obj);
}
