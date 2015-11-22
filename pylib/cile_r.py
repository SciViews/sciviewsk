#!/usr/bin/env python
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
# The Original Code is SciViews-K by Philippe Grosjean et al.
#
# Contributor(s):
#   Philippe Grosjean
#   ActiveState Software Inc (code inspired from)
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


"""A Code Intelligence Language Engine for the R language.

A "Language Engine" is responsible for scanning content of
its language and generating CIX output that represents an outline of
the code elements in that content. See the CIX (Code Intelligence XML)
format:
    http://community.activestate.com/faq/codeintel-cix-schema
    
Module Usage:
    from cile_r import scan
    mtime = os.stat("bar.R")[stat.ST_MTIME]
    content = open("bar.R", "r").read()
    scan(content, "bar.R", mtime=mtime)
"""

__version__ = "1.0.0"

import os
import sys
import time
import optparse
import logging
import pprint
import glob

# Note: c*i*ElementTree is the codeintel system's slightly modified
# cElementTree. Use it exactly as you would the normal cElementTree API:
#   http://effbot.org/zone/element-index.htm
import ciElementTree as ET

from codeintel2.common import CILEError


#---- exceptions

class RCILEError(CILEError):
    pass


#---- global data

log = logging.getLogger("cile.r")
#log.setLevel(logging.DEBUG)


#---- public module interface

def scan_buf(buf, mtime=None, lang="R"):
    """Scan the given RBuffer return an ElementTree (conforming
    to the CIX schema) giving a summary of its code elements.
    
    @param buf {RBuffer} is the R buffer to scan
    @param mtime {int} is a modified time for the file (in seconds since
        the "epoch"). If it is not specified the _current_ time is used.
        Note that the default is not to stat() the file and use that
        because the given content might not reflect the saved file state.
    """
    # Dev Notes:
    # - This stub implementation of the R CILE return an "empty"
    #   summary for the given content, i.e. CIX content that says "there
    #   are no code elements in this R content".
    # - Use the following command (in the extension source dir) to
    #   debug/test your scanner:
    #       codeintel scan -p -l R <example-R-file>
    #   "codeintel" is a script available in the Komodo SDK.
    log.info("scan '%s'", buf.path)
    if mtime is None:
        mtime = int(time.time())

    # The 'path' attribute must use normalized dir separators.
    if sys.platform.startswith("win"):
        path = buf.path.replace('\\', '/')
    else:
        path = buf.path
        
    tree = ET.Element("codeintel", version="2.0",
                      xmlns="urn:activestate:cix:2.0")
    file = ET.SubElement(tree, "file", lang=lang, mtime=str(mtime))
    blob = ET.SubElement(file, "scope", ilk="blob", lang=lang,
                         name=os.path.basename(path))

    # Dev Note:
    # This is where you process the R content and add CIX elements
    # to 'blob' as per the CIX schema (cix-2.0.rng). Use the
    # "buf.accessor" API (see class Accessor in codeintel2.accessor) to
    # analyze. For example:
    # - A token stream of the content is available via:
    #       buf.accessor.gen_tokens()
    #   Use the "codeintel html -b <example-R-file>" command as
    #   a debugging tool.
    # - "buf.accessor.text" is the whole content of the file. If you have
    #   a separate tokenizer/scanner tool for R content, you may
    #   want to use it.

    return tree
