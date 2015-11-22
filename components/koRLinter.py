#!python
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
# 
# The contents of this file are subject to the Mozilla Public License
# Version 1.1 (the "License"); you may not use this file except in
# compliance with the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
# 
# Software distributed under the License is distributed on an "AS IS"
# basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
# License for the specific language governing rights and limitations
# under the License.
# 
# The Original Code is SciViews code, inspired from koPHPLinter.py.
# 
# The Initial Developer of the Original Code is ActiveState Software Inc.
# Portions created by ActiveState Software Inc are Copyright (C) 2000-2007
# ActiveState Software Inc. All Rights Reserved.
# 
# Contributor(s):
#   K. Barton
#   Ph. Grosjean <phgrosjean@sciviews.org>
# 
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
# 
# ***** END LICENSE BLOCK *****

from xpcom import components, nsError, COMException, ServerException
from xpcom._xpcom import PROXY_SYNC, PROXY_ALWAYS, PROXY_ASYNC
from koLintResult import *
from koLintResults import koLintResults
import os, sys, re
import tempfile
import string
#import process
#import koprocessutils
import logging

log = logging.getLogger('RLinter')
#log.setLevel(logging.DEBUG)

# R error line format with svTools::lint(..., type = "flat")
# warning|error+++line+++column+++error message\n

class KoRLinter:
    _com_interfaces_ = [components.interfaces.koILinter]
    _reg_desc_ = "Komodo R Linter"
    _reg_clsid_ = "{E5B7415C-81C6-4185-8B53-B527193D251E}"
    _reg_contractid_ = "@activestate.com/koLinter?language=R;1"
    _reg_categories_ = [
         ("category-komodo-linter", 'R'),
         ]
    
    def __init__(self):
        R = ""  # Default value points (no R application)
        self.prefs = components.classes["@activestate.com/koPrefService;1"].\
            getService(components.interfaces.koIPrefService).prefs
        pass
    
        #This is not used (yet) but kept for possible future reference
    def checkValidVersion(self):
        version = 1
        if not version:
            # Allow for None or empty string
            reject = True
        else:
            # Last point can be something like 10-beta
            #version = tuple([int(x) for x in re.match(r"(\d+)\.(\d+)\.(\d+)", version).groups()])
            #reject = (version < (4,0,5))
            reject = False
        if reject:
            errmsg = "Could not find a suitable R interpreter for "\
                     "linting."
            raise COMException(nsError.NS_ERROR_NOT_AVAILABLE, errmsg)
    
    def lint(self, request):
        """Lint the given R content.

Raise an exception if there is a problem.
"""
        text = request.content.encode("utf-8")
        #tabWidth = request.koDoc.tabWidth
        #log.debug("linting %s" % text[1:15])
        
        # Retrieve the path to R...
        R = ""
        if self.prefs.hasStringPref("r.application"):
            R = self.prefs.getStringPref("r.application")
        if R == "":
            errmsg = "Could not find a suitable R interpreter for linting."
            raise COMException(nsError.NS_ERROR_NOT_AVAILABLE, errmsg)
        #self.checkValidVersion()
        
        # Save R buffer to a temporary file
        Rfilename = tempfile.mktemp()
        fout = open(Rfilename, 'wb')
        fout.write(text)
        fout.close()
        
        p = None
        try:
            argv = [R] + ["--slave"] + ["-e", "try(Sys.setlocale('LC_CTYPE','UTF-8'),silent=TRUE);if(isTRUE(require('svTools',quietly=TRUE)))lint('" + os.path.basename(Rfilename) + "',type='flat',encoding='utf8')"]
            env = koprocessutils.getUserEnv()
            cwd = os.path.dirname(Rfilename)
            p = process.ProcessOpen(argv, cwd=cwd, env=env)
            stdout, stderr = p.communicate()
            # TODO: check stderr to see if an error was generated here!
            # The relevant output is contained in stdout.
            lines = stdout.splitlines(1)
            #log.debug('lint: ' + lines)
        except Exception, e:
            log.exception(e)
        finally:
            os.unlink(Rfilename)
            
        results = koLintResults()
        
        if lines:
            datalines = re.split('\r\n|\r|\n', text)
            numLines = len(datalines)
            lines = [l for l in lines if l.find('+++') != -1]
            
            for line in lines:
                result = KoLintResult()
                line = line.strip()
                items = line.split('+++')
                # Is this a warning or error?
                if items[0] == 'warning':
                     result.severity = result.SEV_WARNING
                else:
                     result.severity = result.SEV_ERROR
                # Get line and column number
                lineNo = int(items[1])
                columnNo = int(items[2])
                result.lineStart = result.lineEnd = lineNo
                result.columnStart = columnNo
                # TODO: this sometimes raises an error!?
                #result.columnEnd = len(datalines[result.lineEnd-1]) + 1
                result.columnEnd = len(datalines[result.lineEnd]) + 1
                # Get the error message
                if items[3]:
                    result.description = items[3]
                    #result.description = string.join(items[3].groups())
                else:
                    result.description = line
                results.addResult(result)
        return results
