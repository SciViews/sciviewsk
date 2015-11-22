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

# Registers the R wiki language in Komodo.

import logging
from koUDLLanguageBase import KoUDLLanguage
#from xpcom import components #, nsError, COMException, ServerException


log = logging.getLogger("koRwikiLanguage")
#log.setLevel(logging.DEBUG)


def registerLanguage(registry):
    log.debug("Registering language R wiki")
    registry.registerLanguage(KoRwikiLanguage())


class KoRwikiLanguage(KoUDLLanguage):
    
    # ------------ Komodo Registration Information ------------ #
    
    name = "Rwiki"
    lexresLangName = "Rwiki"
    _reg_desc_ = "%s Language" % name
    _reg_contractid_ = "@activestate.com/koLanguage?language=%s;1" % name
    _reg_categories_ = [("komodo-language", name)]
    _reg_clsid_ = "7de21e4c-23d3-513c-9b31-6e8dc4ab72bf"
    defaultExtension = '.Rwiki'
    
    # ------------ Commenting Controls ------------ #
    
    commentDelimiterInfo = {
        "line": [ "//", ],
    }
    
    # ------------ Indentation Controls ------------ #
    
    # To support automatic indenting and dedenting after "{([" and "})]"
    supportsSmartIndent = "text"
    # Other smart indenting types are:
    #   'brace', 'python', 'XML' and 'keyword'
    
    # Indent/dedent after these words.
    #_indenting_statements = [u'switch', ]
    #_dedenting_statements = [u'return', ]
    
    # ------------ Sub-language Controls ------------ #
    
    #Check: Update 'lang_from_udl_family' as appropriate for your
    #      lexer definition. There are four UDL language families:
    #           M (markup), i.e. HTML or XML
    #           CSL (client-side language), e.g. JavaScript
    #           SSL (server-side language), e.g. Perl, PHP, Python
    #           TPL (template language), e.g. RHTML, Django, Smarty
    #      'lang_from_udl_family' maps each UDL family code (M,
    #      CSL, ...) to the sub-language name in your language.
    #      Some examples:
    #        lang_from_udl_family = {   # A PHP file can contain
    #           'M': 'HTML',            #   HTML
    #           'SSL': 'PHP',           #   PHP
    #           'CSL': 'JavaScript',    #   JavaScript
    #        }
    #        lang_from_udl_family = {   # An RHTML file can contain
    #           'M': 'HTML',            #   HTML
    #           'SSL': 'Ruby',          #   Ruby
    #           'CSL': 'JavaScript',    #   JavaScript
    #           'TPL': 'RHTML',         #   RHTML template code
    #        }
    #        lang_from_udl_family = {   # A plain XML can just contain
    #           'M': 'XML',             #   XML
    #        }
    lang_from_udl_family = {
        'M': 'RWiki',
        'SSL': 'R'
    }
    
    # ------------ Miscellaneous ------------ #
    
    #primary = 1
    
    downloadURL = "http://www.sciviews.org"
    searchURL = "http://www.rseek.org/"
    
    sample = """== A h2 title
    
A  paragraph of text with **bold** and __italic_ text...

* Item 1,
* Item 2

"""
