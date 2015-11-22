// SciViews-K R console functions, 'sv.r.console' namespace
// Define functions to manage the Komodo Edit R console
// Copyright (c) 2008, Romain Francois
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// sv.r.console.init();                     // Initialize the R console
// sv.r.console.getCurrentCommand();        // Get the current command
// sv.r.console.setCurrentCommand(cmd);     // Set the current command
// sv.r.console.handleConsoleKeyPress(e);   // Observe key press
// sv.r.console.handleConsoleKeyUp(e);      // Observe key up
// sv.r.console.getConsoleContent();        // Get console content
// sv.r.console.setConsoleContent(cmd);     // Set consle content
// sv.r.console.clearConsoleContent();      // Clear console
// sv.r.console.run(cmd);                   // Run a command in the console
// sv.r.console.run_cb(data);               // Callback for run command
// sv.r.console.parse();                    // Parse R code and try to run it
// sv.r.console.parse_cb(data);             // Callback for parse command
//
//// Command history
// sv.r.console.history;                    // The command history
// sv.r.console.historyIndex;               // Selected item in the history 
// sv.r.console.addCommandToHistory(cmd);   // Add cmd to history
// sv.r.console.getHistoryRegex();          // Filter command history
// sv.r.console.refreshHistory();           // Refresh command history
//
// Completion list
// sv.r.console.getCompletionTypes();       // Get the type of completion
// sv.r.console.complete();                 // Calculate completion list
// sv.r.console.complete_cb(data, counter); // Callback for complete()
// sv.r.console.completeExplicit();         // Calculate explicit completion
// sv.r.console.completeExplicit_cb(data);  // Callback for completeExplicit()
// sv.r.console.clearCompletionTab();       // Clear the completion list
// sv.r.console.updateCompletionTab(completions); // Update completion list
// sv.r.console.updateCompletionChoiceSetting(event, type); // Compl. settings
////////////////////////////////////////////////////////////////////////////////

if (typeof(sv.r.console) == 'undefined') sv.r.console = { };

// Initialize the R console
sv.r.console.init = function () {
    var types = ["arguments", "functions", "packages", "history"];
    var defaults = ["true", "true", "true", "false"];
    var type;
    var checked;
    for (var i = 0; i < types.length; i++) {
        type = types[i];
        //if (sv.prefs.getPref("sciviews.console.completion.setting." +
        //    type) == undefined) {
        sv.prefs.setPref("sciviews.console.completion.setting." + type,
            defaults[i], true); 
        //}
        document.getElementById("sciviews_rconsole_completion_cb_" + type).
            checked = sv.prefs.getPref("sciviews.console.completion.setting." +
            type ) == "true" ;
    }
}

// Accessors for the _cmd object
sv.r.console._cmd = "";

// Get the current edited command
sv.r.console.getCurrentCommand = function () {
  return(sv.r.console._cmd);
}

// Set the current command
sv.r.console.setCurrentCommand = function (cmd) {
    sv.r.console._cmd = cmd;
}

// Observe key press
sv.r.console.handleConsoleKeyPress = function (e) {
    // cycle history
    if (e.ctrlKey && (e.keyCode == 38 || e.keyCode == 40)) {
        // nothing is in the history
        if (sv.r.console.history.length == 0) {
            return(0);
        }
    
        var rx = sv.r.console.getHistoryRegex();
        var loop = function(i, rx) {
            var cmd = sv.r.console.history[i];
            if (!rx || rx.test(cmd)) {
                sv.r.console.setConsoleContent(cmd);
                sv.r.console.historyIndex = i;
                return(true);
            }
            return(false);
        }
    
        if (e.keyCode == 38) { 
            // [ctrl] + [up]: cycle up history
            for (var i = sv.r.console.historyIndex - 1; i >= 0; i--) {
                if (loop(i, rx)) return(0);
            }
            for (var i = sv.r.console.history.length-1;
                i >= sv.r.console.historyIndex; i--) {
                if (loop(i, rx)) return(0);
            }
        } else {
            // [ctrl] + [down]: cycle down history
            for (var i = sv.r.console.historyIndex + 1;
                i < sv.r.console.history.length; i++) {
                if (loop(i, rx)) return(0);
            }
            for (var i = 0; i <= sv.r.console.historyIndex; i++) {
                if (loop(i, rx)) return(0);
            }
        }
        return(0);  
    }
  
    if (e.keyCode == 13) { // [enter] pressed : submit to R
        sv.r.console.setCurrentCommand(sv.r.console.getConsoleContent());
        sv.r.console.parse();
        return(0); 
    }
    return(0);
}

// Observe key up
sv.r.console.handleConsoleKeyUp = function (e) {
    if (e.keyCode == 9) { // [tab]: explicit completion, 
        // FIXME: tabs are not caught here, and the <textbox> loses the focus
        sv.r.console.completeExplicit();
    } else {
        sv.r.console.complete(); 
    }
}

// Get console content
sv.r.console.getConsoleContent = function () {
    return document.getElementById("sciviews_rconsole_console_input").value;
}

// Set the content of the console
sv.r.console.setConsoleContent = function (cmd) {
    if (!cmd) cmd = "";
    document.getElementById("sciviews_rconsole_console_input").value = cmd;
}

// Clear console
sv.r.console.clearConsoleContent = function () {
    document.getElementById("sciviews_rconsole_console_input").value = "";
}

// Function to run R code in the console
// TODO: modify this using the context in the call to evalCallback
sv.r.console.run = function (cmd) {
    sv.r.console.setCurrentCommand(cmd);
    sv.r.console.parse();
}

// Callback called after an R command is run
sv.r.console.run_cb  = function (data) {
    var output = document.getElementById("sciviews_rconsole_console_results");
    var cmd = sv.r.console.getCurrentCommand();
  
    var div =
        <html:pre class="consoleInput" xmlns:html="http://www.w3.org/1999/xhtml">{ "R> " + cmd }</html:pre>;
    sv.tools.e4x2dom.appendTo(div, output);
  
    // FIXME: replace the dot with something invisible (space gets swallowed by the <pre>)
    //        or use something else than a <pre>
    data = data.replace(/^ /, ".");
    var div =
        <html:pre class="consoleOutput" xmlns:html="http://www.w3.org/1999/xhtml">{data}</html:pre>;
    sv.tools.e4x2dom.appendTo(div, output);
  
    // add the current command to the history and refresh the history
    sv.r.console.addCommandToHistory(cmd);
    sv.r.console.refreshHistory();
  
    // reset the command
    sv.r.console.setConsoleContent("");
    //sv.robjects.refreshPackage(".GlobalEnv");
}

// Parse code using Parse and run it if possible
sv.r.console.parse = function () {
    var cmd = "Parse('" + sv.r.console.getCurrentCommand().
        replace(/'/g, "\\'") + "')";
    sv.r.evalCallback(cmd, sv.r.console.parse_cb);
}

// Callback called after an R command is parsed
sv.r.console.parse_cb = function (data) {
    if (data.result !== undefined) data = data.result;
    
    if (data.substring(0, 10) == "expression") {
        // command is ok, run it
        sv.r.evalCallback(sv.r.console.getCurrentCommand(),
            sv.r.console.run_cb);
    } 
}

// TODO: make the history persistant
sv.r.console.history = [];
sv.r.console.historyIndex = 0;

// Add command to the history
sv.r.console.addCommandToHistory = function (cmd) {
    sv.r.console.history[sv.r.console.history.length] = cmd;
}

// Filter history
sv.r.console.getHistoryRegex = function () {
    var txt = document.getElementById("sciviews_rconsole_history_filter");
    if (txt == "") return(false);
    try {
        var out = new RegExp(txt);
    } catch(e) {
        return(false);
    }
    return(out);
}

// Refresh history
sv.r.console.refreshHistory = function () {
    var his = document
        .getElementById("sciviews_rconsole_console_history_richlistbox");
    var cmd;
    var item ;
    var filter = new RegExp(document
        .getElementById("sciviews_rconsole_history_filter").value);
    sv.tools.e4x2dom.clear(his);
    for (i = sv.r.console.history.length - 1; i >= 0; i--) {
        cmd = sv.r.console.history[i];
        if (filter.test(cmd)) {
            item = <richlistitem class="historyListitem">
                <html:pre xmlns:html="http://www.w3.org/1999/xhtml" class="historyPre">
                    {cmd}
                </html:pre>
            </richlistitem>;
            sv.tools.e4x2dom.appendTo(item, his);
        }
    } 
}

// Get completion types
sv.r.console.getCompletionTypes = function () {
    var out = [];
    var types = ["arguments", "packages", "functions"];
    for (var i = 0; i < types.length; i++) {
        if (sv.prefs.getPref("sciviews.console.completion.setting." +
            types[i]) == "true") {
            out[out.length] = types[i];
        }
    }
    return(out);
}

// Completion
sv.r.console.complete = function () {
    sv.r.console.clearCompletionTab();
    sv.r.console._completionCounter++;
    var types = sv.r.console.getCompletionTypes();
    if (types != "") {
        var types_vector = 'c("' + types[0];
        for (var i = 1; i < types.length; i++) {
            types_vector += '", "' + types[i];
        }
        types_vector += '") ';
        cmd = "CompletePlus('" + sv.r.console.getConsoleContent().replace(/'/g,
            "\\'")  + "' , simplify = TRUE, types= " + types_vector + " )";
        sv.r.evalCallback(cmd, sv.r.console.complete_cb,
            sv.r.console._completionCounter);
    }
}

// Callback for completion
sv.r.console.complete_cb = function (data, counter) {
    if (counter == sv.r.console._completionCounter && data != "") {
        var completions = data.split("\n");
        sv.r.console.updateCompletionTab(completions);
    }
}

// Completion asked by the user
sv.r.console.completeExplicit = function () {
    // cmd = "cat(completion('" + sv.r.console.getConsoleContent().
    //      replace(/'/g, "\\'")  + "'))";
    // PhG: if this gets reactivated, do not forget to make a form for HTTP and another one for socket!
    // sv.r.evalCallback(cmd, sv.r.console.completeExplicit_cb); 
}

// Callback for explicit completion
sv.r.console.completeExplicit_cb = function (data) {
    if (data.result !== undefined) data = data.result;
    
    var completions = data.split("\t");
    if (completions.length == 1) {
        // sv.r.console.setConsoleContent(sv.r.console.getConsoleContent( ) +
        //    completions[0]);
    } else {
        // sv.r.console.updateCompletion(completions);
    }
}

// Clear completion list
sv.r.console.clearCompletionTab = function () {
    var compTree = document
        .getElementById("sciviews_rconsole_completion_tree_main");
    sv.tools.e4x2dom.clear(compTree);
}

// Update completion list
sv.r.console.updateCompletionTab = function (completions) {
    var cmd = sv.r.console.getConsoleContent();
    var histCompletions = [];
    // TODO: consider using some sort of grep for this instead
    try {
        var cmdRx = new RegExp(sv.tools.strings.toRegex(cmd));
        var currentCmd;
        for (var i = sv.r.console.history.length - 1; i >= 0; i--) {
            currentCmd = sv.r.console.history[i];
            if (cmdRx.test(currentCmd))
                histCompletions[histCompletions.length] = [currentCmd, "", ""];
        }
    } catch(e) {
        // Problem when creating the RegExp
        sv.log.exception(e, "Problem when creating the regex from the command");
    }
  
    // TODO: use other objects for this
    var argCompletions = [];
    var argRx = new RegExp("=");
    var packCompletions = [];
    var packRx = new RegExp("::");
    var otherCompletions = [];
  
    if( completions.length > 0) {
        var tab, comp;
        for (var i = 0; i < completions.length; i++) {
            if (completions[i] != "") {
                tab = completions[i].split("\t");
                comp = tab[0];
                if (argRx.test(comp)) {
                    argCompletions[argCompletions.length] = tab;
                } else if (packRx.test(comp)) {
                    packCompletions[packCompletions.length] = tab;
                } else {
                    otherCompletions[otherCompletions.length] = tab;
                }
            }
        }
    }
  
    // TODO: find a way to describe each completion
    //        - description of function from help page
    //        - description of arguments
    //        - description of package : use packageDescription
    var makeTree = function (tab, name, root) {
        if (sv.prefs.getPref( "sciviews.console.completion.setting.arguments")
            == "true" && tab.length > 0) {
            var newItem = <treeitem container="true" open="true">
                <treerow>
                    <treecell label={name} />
                    <treecell label="" />
                    <treecell label="" />
                </treerow>
                <treechildren />
            </treeitem> ;
            newItem.treechildren.treeitem = new XMLList();                
            for (var i = 0; i < tab.length; i++) {
                var item = tab[i];
                newItem.treechildren.treeitem +=
                    <treeitem>
                        <treerow>
                            <treecell label={item[0]} />
                            <treecell label={item[1]} />
                            <treecell label={item[2]} />
                        </treerow>
                    </treeitem>
            }
            sv.tools.e4x2dom.appendTo(newItem, root);
        }
    }
    var compTree = document
        .getElementById("sciviews_rconsole_completion_tree_main");
  
    // TODO: move the if to the makeTree function  
    makeTree(argCompletions, "arguments", compTree);
    makeTree(packCompletions, "packages", compTree);
    makeTree(otherCompletions, "functions", compTree);
    makeTree(histCompletions, "history", compTree);  
}

// Update completion choices
sv.r.console.updateCompletionChoiceSetting = function (event, type) {
    var checked = event.target.checked;
    if (checked) {
        checked = "false";
    } else {
        checked = "true";
    }
    sv.prefs.setPref("sciviews.console.completion.setting." + type, checked, true); 
}

// Completion counter
sv.r.console._completionCounter = 0;
