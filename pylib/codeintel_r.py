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
#   ActiveState Software Inc (code inspired from Komodo code)
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


"""R support for codeintel.

This file will be imported by the codeintel system on startup and the
register() function called to register this language with the system. All
Code Intelligence for this language is controlled through this module.
"""
# TODO: include calltip for abbreviations in the code intelligence (+ cache entries?)

import os
import sys
import logging
import operator

from codeintel2.common import *
from codeintel2.citadel import CitadelBuffer, CitadelLangIntel
from codeintel2.langintel import LangIntel
from codeintel2.langintel import ParenStyleCalltipIntelMixin, ProgLangTriggerIntelMixin
from codeintel2.udl import UDLBuffer, UDLCILEDriver, UDLLexer
from codeintel2.util import CompareNPunctLast
from codeintel2.accessor import AccessorCache, KoDocumentAccessor

#from SilverCity import find_lexer_module_by_id, PropertySet, WordList

from SilverCity.ScintillaConstants import SCE_UDL_SSL_DEFAULT, SCE_UDL_SSL_IDENTIFIER, SCE_UDL_SSL_OPERATOR, SCE_UDL_SSL_VARIABLE, SCE_UDL_SSL_WORD, SCE_UDL_SSL_COMMENT, SCE_UDL_SSL_COMMENTBLOCK, SCE_UDL_SSL_STRING

try:
    from xpcom.server import UnwrapObject
    _xpcom_ = True
except ImportError:
    _xpcom_ = False

from xpcom import components
R = components.classes["@sciviews.org/svRinterpreter;1"].\
    getService(components.interfaces.svIRinterpreter)


#---- Globals

lang = "R"
log = logging.getLogger("codeintel.r")
#log.setLevel(logging.WARNING)
log.setLevel(logging.DEBUG)

# These keywords and builtin functions are copied from "Rlex.udl".
# Reserved keywords
keywords = [
    "...",
    "break",
    "else",
    "FALSE",
    "for",
    "function",
    "if",
    "in",
    "Inf",
    "NA",
    "NaN",
    "next",
    "NULL",
    "repeat",
    "TRUE",
    "while",
    # Non reserved keywords
    ".Alias",
    ".ArgsEnv",
    ".AutoloadEnv",
    ".BaseNamespaceEnv",
    ".C",
    ".Call",
    ".Call.graphics",
    ".Defunct",
    ".Deprecated",
    ".Device",
    ".Devices",
    ".Export",
    ".External",
    ".External.graphics",
    ".First.lib",
    ".First.sys",
    ".Fortran",
    ".GenericArgsEnv",
    ".GlobalEnv",
    ".Import",
    ".ImportFrom",
    ".Internal",
    ".Last.lib",
    ".Last.value",
    ".Library",
    ".Library.site",
    ".MFclass",
    ".Machine",
    ".NotYetImplemented",
    ".NotYetUsed",
    ".OptRequireMethods",
    ".Options",
    ".Platform",
    ".Primitive",
    ".S3PrimitiveGenerics",
    ".S3method",
    ".Script",
    ".TAOCP1997init",
    ".Tcl",
    ".Tcl.args",
    ".Tcl.args.objv",
    ".Tcl.callback",
    ".Tcl.objv",
    ".Tk.ID",
    ".Tk.newwin",
    ".Tk.subwin",
    ".TraceWithMethods",
    ".Traceback",
    ".checkMFClasses",
    ".decode_numeric_version",
    ".deparseOpts",
    ".doTrace",
    ".doTracePrint",
    ".dynLibs",
    ".encode_numeric_version",
    ".expand_R_libs_env_var",
    ".find.package",
    ".getRequiredPackages",
    ".getRequiredPackages2",
    ".getXlevels",
    ".guiCmd",
    ".guiObjBrowse",
    ".guiObjCallback",
    ".guiObjInfo",
    ".guiObjMenu",
    ".handleSimpleError",
    ".isMethodsDispatchOn",
    ".isOpen",
    ".knownS3Generics",
    ".koCmd",
    ".leap.seconds",
    ".libPaths",
    ".makeMessage",
    ".make_numeric_version",
    ".mergeExportMethods",
    ".mergeImportMethods",
    ".noGenerics",
    ".packageStartupMessage",
    ".packages",
    ".path.package",
    ".primTrace",
    ".primUntrace",
    ".readRDS",
    ".row_names_info",
    ".saveRDS",
    ".set_row_names",
    ".signalSimpleWarning",
    ".slotNames",
    ".standard_regexps",
    ".subset",
    ".subset2",
    ".untracedFunction",
    ".userHooksEnv",
    ".valueClassTest",
    "AIC",
    "ARMAacf",
    "ARMAtoMA",
    "Arg",
    "Args",
    "Arith",
    "Axis",
    "Box.test",
    "C",
    "CIDFont",
    "CRAN.packages",
    "CallTip",
    "Compare",
    "Complete",
    "CompletePlus",
    "Complex",
    "Conj",
    "Cstack_info",
    "D",
    "Encoding",
    "F",
    "Filter",
    "Find",
    "Gamma",
    "HoltWinters",
    "I",
    "IQR",
    "ISOdate",
    "ISOdatetime",
    "Im",
    "KalmanForecast",
    "KalmanLike",
    "KalmanRun",
    "KalmanSmooth",
    "LETTERS",
    "La.chol",
    "La.chol2inv",
    "La.eigen",
    "La.svd",
    "Logic",
    "Machine",
    "Map",
    "Math",
    "Math.Date",
    "Math.POSIXt",
    "Math.data.frame",
    "Math.difftime",
    "Math.factor",
    "Math2",
    "MethodAddCoerce",
    "MethodsList",
    "MethodsListSelect",
    "Mod",
    "NCOL",
    "NLSstAsymptotic",
    "NLSstClosestX",
    "NLSstLfAsymptote",
    "NLSstRtAsymptote",
    "NROW",
    "Negate",
    "NextMethod",
    "Null",
    "Ops",
    "Ops.Date",
    "Ops.POSIXt",
    "Ops.data.frame",
    "Ops.difftime",
    "Ops.factor",
    "Ops.numeric_version",
    "Ops.ordered",
    "PP.test",
    "Parse",
    "Platform",
    "Position",
    "Quote",
    "R.Version",
    "R.home",
    "R.version",
    "R.version.string",
    "RNGkind",
    "RNGversion",
    "RShowDoc",
    "RSiteSearch",
    "R_system_version",
    "Rapp.updates",
    "Rd_db",
    "Rd_parse",
    "Rdindex",
    "Re",
    "Recall",
    "Reduce",
    "Rprof",
    "Rprofmem",
    "Rtangle",
    "RtangleSetup",
    "RtangleWritedoc",
    "RweaveChunkPrefix",
    "RweaveEvalWithOpt",
    "RweaveLatex",
    "RweaveLatexFinish",
    "RweaveLatexOptions",
    "RweaveLatexSetup",
    "RweaveLatexWritedoc",
    "RweaveTryStop",
    "SSD",
    "SSasymp",
    "SSasympOff",
    "SSasympOrig",
    "SSbiexp",
    "SSfol",
    "SSfpl",
    "SSgompertz",
    "SSlogis",
    "SSmicmen",
    "SSweibull",
    "Shepard",
    "SignatureMethod",
    "SocketServerProc_8888",
    "Source",
    "Stangle",
    "StructTS",
    "Summary",
    "Summary.Date",
    "Summary.POSIXct",
    "Summary.POSIXlt",
    "Summary.data.frame",
    "Summary.difftime",
    "Summary.factor",
    "Summary.numeric_version",
    "Sweave",
    "SweaveHooks",
    "SweaveSyntConv",
    "Sys.Date",
    "Sys.chmod",
    "Sys.getenv",
    "Sys.getlocale",
    "Sys.getpid",
    "Sys.glob",
    "Sys.info",
    "Sys.localeconv",
    "Sys.putenv",
    "Sys.setenv",
    "Sys.setlocale",
    "Sys.sleep",
    "Sys.tempdir",
    "Sys.time",
    "Sys.timezone",
    "Sys.umask",
    "Sys.unsetenv",
    "Sys.userdir",
    "Sys.which",
    "T",
    "TempEnv",
    "TukeyHSD",
    "TukeyHSD.aov",
    "Type1Font",
    "URLdecode",
    "URLencode",
    "UseMethod",
    "Vectorize",
    "Version",
    "View",
    "X11",
    "X11.options",
    "X11Font",
    "X11Fonts",
    "abbreviate",
    "abline",
    "abs",
    "acf",
    "acf2AR",
    "acos",
    "acosh",
    "add.scope",
    "add1",
    "addActions",
    "addIcons",
    "addItems",
    "addMethods",
    "addNextMethod",
    "addTaskCallback",
    "addTclPath",
    "addTemp",
    "addmargins",
    "addterm",
    "aggregate",
    "aggregate.data.frame",
    "aggregate.default",
    "aggregate.ts",
    "agrep",
    "alarm",
    "alias",
    "alist",
    "all",
    "all.equal",
    "all.equal.POSIXct",
    "all.equal.character",
    "all.equal.default",
    "all.equal.factor",
    "all.equal.formula",
    "all.equal.language",
    "all.equal.list",
    "all.equal.numeric",
    "all.equal.raw",
    "all.names",
    "all.vars",
    "allGenerics",
    "allNames",
    "anova",
    "anova.glm",
    "anova.glmlist",
    "anova.lm",
    "anova.lmlist",
    "anova.mlm",
    "anovalist.lm",
    "ansari.test",
    "any",
    "aov",
    "aperm",
    "append",
    "apply",
    "approx",
    "approxfun",
    "apropos",
    "ar",
    "ar.burg",
    "ar.mle",
    "ar.ols",
    "ar.yw",
    "area",
    "args",
    "argsAnywhere",
    "arima",
    "arima.sim",
    "arima0",
    "arima0.diag",
    "array",
    "arrows",
    "as",
    "as.Date",
    "as.Date.POSIXct",
    "as.Date.POSIXlt",
    "as.Date.character",
    "as.Date.date",
    "as.Date.dates",
    "as.Date.default",
    "as.Date.factor",
    "as.Date.numeric",
    "as.POSIXct",
    "as.POSIXct.Date",
    "as.POSIXct.POSIXlt",
    "as.POSIXct.date",
    "as.POSIXct.dates",
    "as.POSIXct.default",
    "as.POSIXct.numeric",
    "as.POSIXlt",
    "as.POSIXlt.Date",
    "as.POSIXlt.POSIXct",
    "as.POSIXlt.character",
    "as.POSIXlt.date",
    "as.POSIXlt.dates",
    "as.POSIXlt.default",
    "as.POSIXlt.factor",
    "as.POSIXlt.numeric",
    "as.array",
    "as.call",
    "as.character",
    "as.character.Date",
    "as.character.POSIXt",
    "as.character.condition",
    "as.character.default",
    "as.character.error",
    "as.character.factor",
    "as.character.hexmode",
    "as.character.numeric_version",
    "as.character.octmode",
    "as.character.srcref",
    "as.complex",
    "as.data.frame",
    "as.data.frame.AsIs",
    "as.data.frame.Date",
    "as.data.frame.POSIXct",
    "as.data.frame.POSIXlt",
    "as.data.frame.array",
    "as.data.frame.character",
    "as.data.frame.complex",
    "as.data.frame.data.frame",
    "as.data.frame.default",
    "as.data.frame.difftime",
    "as.data.frame.factor",
    "as.data.frame.integer",
    "as.data.frame.list",
    "as.data.frame.logical",
    "as.data.frame.matrix",
    "as.data.frame.model.matrix",
    "as.data.frame.numeric",
    "as.data.frame.numeric_version",
    "as.data.frame.ordered",
    "as.data.frame.raw",
    "as.data.frame.table",
    "as.data.frame.ts",
    "as.data.frame.vector",
    "as.dendrogram",
    "as.difftime",
    "as.dist",
    "as.double",
    "as.double.POSIXlt",
    "as.double.difftime",
    "as.environment",
    "as.expression",
    "as.expression.default",
    "as.factor",
    "as.formula",
    "as.fractions",
    "as.function",
    "as.function.default",
    "as.graphicsAnnot",
    "as.hclust",
    "as.integer",
    "as.list",
    "as.list.data.frame",
    "as.list.default",
    "as.list.environment",
    "as.list.factor",
    "as.list.numeric_version",
    "as.logical",
    "as.matrix",
    "as.matrix.POSIXlt",
    "as.matrix.data.frame",
    "as.matrix.default",
    "as.matrix.noquote",
    "as.name",
    "as.null",
    "as.null.default",
    "as.numeric",
    "as.numeric_version",
    "as.octmode",
    "as.ordered",
    "as.package_version",
    "as.pairlist",
    "as.person",
    "as.personList",
    "as.qr",
    "as.raw",
    "as.real",
    "as.relistable",
    "as.roman",
    "as.single",
    "as.single.default",
    "as.stepfun",
    "as.symbol",
    "as.table",
    "as.table.default",
    "as.tclObj",
    "as.ts",
    "as.vector",
    "as.vector.factor",
    "asMethodDefinition",
    "asNamespace",
    "asOneSidedFormula",
    "asS4",
    "asin",
    "asinh",
    "assign",
    "assignClassDef",
    "assignInNamespace",
    "assignMethodsMetaData",
    "assignTemp",
    "assocplot",
    "atan",
    "atan2",
    "atanh",
    "attach",
    "attachNamespace",
    "attr",
    "attr.all.equal",
    "attributes",
    "autoload",
    "autoloader",
    "available.packages",
    "ave",
    "axTicks",
    "axis",
    "axis.Date",
    "axis.POSIXct",
    "backsolve",
    "balanceMethodsList",
    "bandwidth.kernel",
    "bandwidth.nrd",
    "barplot",
    "barplot.default",
    "bartlett.test",
    "baseenv",
    "basename",
    "bcv",
    "besselI",
    "besselJ",
    "besselK",
    "besselY",
    "beta",
    "bindingIsActive",
    "bindingIsLocked",
    "bindtextdomain",
    "binom.test",
    "binomial",
    "biplot",
    "bitmap",
    "bmp",
    "body",
    "box",
    "boxcox",
    "boxplot",
    "boxplot.default",
    "boxplot.stats",
    "bquote",
    "browse.pkgs",
    "browseEnv",
    "browseURL",
    "browseVignettes",
    "browser",
    "bug.report",
    "buildVignettes",
    "builtins",
    "bw.SJ",
    "bw.bcv",
    "bw.nrd",
    "bw.nrd0",
    "bw.ucv",
    "bxp",
    "by",
    "by.data.frame",
    "by.default",
    "bzfile",
    "c",
    "c.Date",
    "c.POSIXct",
    "c.POSIXlt",
    "c.noquote",
    "c.numeric_version",
    "cacheGenericsMetaData",
    "cacheMetaData",
    "cacheMethod",
    "cairo_pdf",
    "cairo_ps",
    "call",
    "callCC",
    "callGeneric",
    "callNextMethod",
    "canCoerce",
    "cancor",
    "capabilities",
    "capture.output",
    "captureAll",
    "case.names",
    "casefold",
    "cat",
    "category",
    "cbind",
    "cbind.data.frame",
    "cbind2",
    "ccf",
    "cdplot",
    "ceiling",
    "changeTemp",
    "char.expand",
    "charToRaw",
    "character",
    "charmatch",
    "chartr",
    "check.options",
    "checkCRAN",
    "checkDocFiles",
    "checkDocStyle",
    "checkFF",
    "checkMD5sums",
    "checkNEWS",
    "checkReplaceFuns",
    "checkS3methods",
    "checkSlotAssignment",
    "checkTnF",
    "checkVignettes",
    "check_tzones",
    "chisq.test",
    "chol",
    "chol.default",
    "chol2inv",
    "choose",
    "chooseCRANmirror",
    "chull",
    "citEntry",
    "citFooter",
    "citHeader",
    "citation",
    "class",
    "classMetaName",
    "clearNames",
    "clip",
    "clipsource",
    "close",
    "close.connection",
    "close.screen",
    "close.socket",
    "close.srcfile",
    "closeAllConnections",
    "closeSocketClients",
    "cm",
    "cm.colors",
    "cmdscale",
    "co.intervals",
    "codes",
    "codes.factor",
    "codes.ordered",
    "codoc",
    "codocClasses",
    "codocData",
    "coef",
    "coefficients",
    "coerce",
    "col",
    "col2rgb",
    "colMeans",
    "colSums",
    "colnames",
    "colorConverter",
    "colorRamp",
    "colorRampPalette",
    "colors",
    "colours",
    "combn",
    "commandArgs",
    "comment",
    "compareRVersion",
    "compareVersion",
    "complete.cases",
    "completeClassDefinition",
    "completeExtends",
    "completeSubclasses",
    "complex",
    "computeRestarts",
    "con2tr",
    "conditionCall",
    "conditionCall.condition",
    "conditionMessage",
    "conditionMessage.condition",
    "confint",
    "confint.default",
    "conflicts",
    "conformMethod",
    "constrOptim",
    "contour",
    "contour.default",
    "contourLines",
    "contr.SAS",
    "contr.helmert",
    "contr.poly",
    "contr.sdif",
    "contr.sum",
    "contr.treatment",
    "contrasts",
    "contrib.url",
    "contributors",
    "convertColor",
    "convolve",
    "cooks.distance",
    "cophenetic",
    "coplot",
    "cor",
    "cor.test",
    "corresp",
    "cos",
    "cosh",
    "count.fields",
    "cov",
    "cov.mcd",
    "cov.mve",
    "cov.rob",
    "cov.trob",
    "cov.wt",
    "cov2cor",
    "covratio",
    "cpgram",
    "createCallTipFile",
    "createSyntaxFile",
    "crossprod",
    "cummax",
    "cummin",
    "cumprod",
    "cumsum",
    "curve",
    "cut",
    "cut.Date",
    "cut.POSIXt",
    "cut.default",
    "cutree",
    "cycle",
    "dQuote",
    "data",
    "data.class",
    "data.entry",
    "data.frame",
    "data.manager",
    "data.matrix",
    "dataentry",
    "date",
    "dbeta",
    "dbinom",
    "dcauchy",
    "dchisq",
    "de",
    "de.ncols",
    "de.restore",
    "de.setup",
    "debug",
    "debugger",
    "decompose",
    "def",
    "default.stringsAsFactors",
    "defaultDumpName",
    "defaultPrototype",
    "delay",
    "delayedAssign",
    "delete.response",
    "delimMatch",
    "deltat",
    "demo",
    "dendrapply",
    "density",
    "density.default",
    "denumerate",
    "denumerate.formula",
    "deparse",
    "deriv",
    "deriv.default",
    "deriv.formula",
    "deriv3",
    "deriv3.default",
    "deriv3.formula",
    "descArgs",
    "descFun",
    "det",
    "detach",
    "determinant",
    "determinant.matrix",
    "dev.control",
    "dev.copy",
    "dev.copy2eps",
    "dev.copy2pdf",
    "dev.cur",
    "dev.interactive",
    "dev.list",
    "dev.new",
    "dev.next",
    "dev.off",
    "dev.prev",
    "dev.print",
    "dev.set",
    "dev.size",
    "dev2bitmap",
    "devAskNewPage",
    "deviance",
    "deviceIsInteractive",
    "dexp",
    "df",
    "df.kernel",
    "df.residual",
    "dfbeta",
    "dfbetas",
    "dffits",
    "dgamma",
    "dgeom",
    "dget",
    "dhyper",
    "diag",
    "diff",
    "diff.Date",
    "diff.POSIXt",
    "diff.default",
    "diff.ts",
    "diffinv",
    "difftime",
    "digamma",
    "dim",
    "dim.data.frame",
    "dimnames",
    "dimnames.data.frame",
    "dir",
    "dir.create",
    "dirname",
    "dist",
    "dlnorm",
    "dlogis",
    "dmultinom",
    "dnbinom",
    "dnorm",
    "do.call",
    "doPrimitiveMethod",
    "dose.p",
    "dotchart",
    "double",
    "download.file",
    "download.packages",
    "dpois",
    "dput",
    "drop",
    "drop.scope",
    "drop.terms",
    "drop1",
    "dropterm",
    "dsignrank",
    "dt",
    "dummy.coef",
    "dump",
    "dump.frames",
    "dumpMethod",
    "dumpMethods",
    "dunif",
    "duplicated",
    "duplicated.POSIXlt",
    "duplicated.array",
    "duplicated.data.frame",
    "duplicated.default",
    "duplicated.matrix",
    "dweibull",
    "dwilcox",
    "dyn.load",
    "dyn.unload",
    "eapply",
    "ecdf",
    "edit",
    "eff.aovlist",
    "effects",
    "eigen",
    "el",
    "elNamed",
    "emacs",
    "embed",
    "embedFonts",
    "empty.dump",
    "emptyMethodsList",
    "emptyenv",
    "encodeString",
    "encoded_text_to_latex",
    "end",
    "enlist",
    "env.profile",
    "environment",
    "environmentIsLocked",
    "environmentName",
    "eqscplot",
    "erase.screen",
    "estVar",
    "eval",
    "eval.parent",
    "evalq",
    "example",
    "exists",
    "existsFunction",
    "existsMethod",
    "existsTemp",
    "exp",
    "expand.grid",
    "expand.model.frame",
    "expm1",
    "expression",
    "extendrange",
    "extends",
    "extractAIC",
    "factanal",
    "factor",
    "factor.scope",
    "factorial",
    "family",
    "fbeta",
    "fft",
    "fifo",
    "file",
    "file.access",
    "file.append",
    "file.choose",
    "file.copy",
    "file.create",
    "file.edit",
    "file.exists",
    "file.info",
    "file.path",
    "file.remove",
    "file.rename",
    "file.show",
    "file.symlink",
    "file_path_as_absolute",
    "file_path_sans_ext",
    "file_test",
    "filled.contour",
    "filter",
    "finalDefaultMethod",
    "find",
    "findClass",
    "findFunction",
    "findInterval",
    "findMethod",
    "findMethodSignatures",
    "findMethods",
    "findPackageEnv",
    "findRestart",
    "findUnique",
    "fisher.test",
    "fitdistr",
    "fitted",
    "fitted.values",
    "fivenum",
    "fix",
    "fixInNamespace",
    "fixPre1.8",
    "fligner.test",
    "floor",
    "flush",
    "flush.connection",
    "flush.console",
    "force",
    "formalArgs",
    "formals",
    "format",
    "format.AsIs",
    "format.Date",
    "format.POSIXct",
    "format.POSIXlt",
    "format.char",
    "format.data.frame",
    "format.default",
    "format.difftime",
    "format.factor",
    "format.hexmode",
    "format.info",
    "format.octmode",
    "format.pval",
    "formatC",
    "formatDL",
    "formatOL",
    "formatUL",
    "formula",
    "forwardsolve",
    "fourfoldplot",
    "fractions",
    "frame",
    "frequency",
    "frequency.polygon",
    "friedman.test",
    "ftable",
    "functionBody",
    "gamma",
    "gamma.dispersion",
    "gamma.shape",
    "gammaCody",
    "gaussian",
    "gc",
    "gc.time",
    "gcinfo",
    "gctorture",
    "generic.skeleton",
    "get",
    "getAccess",
    "getAllConnections",
    "getAllMethods",
    "getAllSuperClasses",
    "getAnywhere",
    "getCConverterDescriptions",
    "getCConverterStatus",
    "getCRANmirrors",
    "getCallingDLL",
    "getCallingDLLe",
    "getClass",
    "getClassDef",
    "getClassName",
    "getClassPackage",
    "getClasses",
    "getConnection",
    "getDLLRegisteredRoutines",
    "getDLLRegisteredRoutines.DLLInfo",
    "getDLLRegisteredRoutines.character",
    "getDataPart",
    "getDepList",
    "getEnvironment",
    "getExportedValue",
    "getExtends",
    "getFromNamespace",
    "getFunction",
    "getFunctions",
    "getGeneric",
    "getGenerics",
    "getGraphicsEvent",
    "getGroup",
    "getGroupMembers",
    "getHook",
    "getInitial",
    "getKeywords",
    "getLoadedDLLs",
    "getMethod",
    "getMethods",
    "getMethodsForDispatch",
    "getMethodsMetaData",
    "getNamespace",
    "getNamespaceExports",
    "getNamespaceImports",
    "getNamespaceInfo",
    "getNamespaceName",
    "getNamespaceUsers",
    "getNamespaceVersion",
    "getNativeSymbolInfo",
    "getNumCConverters",
    "getOption",
    "getPackageName",
    "getProperties",
    "getPrototype",
    "getRversion",
    "getS3method",
    "getSlots",
    "getSocketClients",
    "getSocketClientsNames",
    "getSocketServerName",
    "getSocketServers",
    "getSrcLines",
    "getSubclasses",
    "getTaskCallbackNames",
    "getTemp",
    "getTkProgressBar",
    "getTxtProgressBar",
    "getValidity",
    "getVirtual",
    "get_all_vars",
    "getenv",
    "geterrmessage",
    "gettext",
    "gettextf",
    "getwd",
    "ginv",
    "gl",
    "glm",
    "glm.control",
    "glm.convert",
    "glm.fit",
    "glm.fit.null",
    "glm.nb",
    "glmmPQL",
    "glob2rx",
    "globalenv",
    "graphics.off",
    "gray",
    "gray.colors",
    "grconvertX",
    "grconvertY",
    "gregexpr",
    "grep",
    "grey",
    "grey.colors",
    "grid",
    "gsub",
    "guiCallTip",
    "guiCmd",
    "guiComplete",
    "guiDDEInstall",
    "guiExport",
    "guiImport",
    "guiInstall",
    "guiLoad",
    "guiReport",
    "guiSave",
    "guiSetwd",
    "guiSource",
    "guiUninstall",
    "gzcon",
    "gzfile",
    "hasArg",
    "hasMethod",
    "hasMethods",
    "hasTsp",
    "hat",
    "hatvalues",
    "hatvalues.lm",
    "hcl",
    "hclust",
    "head",
    "head.matrix",
    "heat.colors",
    "heatmap",
    "help",
    "help.search",
    "help.start",
    "helpSearchWeb",
    "hist",
    "hist.FD",
    "hist.default",
    "hist.scott",
    "history",
    "hsv",
    "httpclient",
    "huber",
    "hubers",
    "iconv",
    "iconvlist",
    "identical",
    "identify",
    "identity",
    "ifelse",
    "image",
    "image.default",
    "implicitGeneric",
    "importIntoEnv",
    "index.search",
    "influence",
    "influence.measures",
    "inherits",
    "initialize",
    "insertMethod",
    "install.packages",
    "installFoundDepends",
    "installed.packages",
    "intToBits",
    "intToUtf8",
    "integer",
    "integrate",
    "interaction",
    "interaction.plot",
    "interactive",
    "intersect",
    "inverse.gaussian",
    "inverse.rle",
    "invisible",
    "invokeRestart",
    "invokeRestartInteractively",
    "is",
    "is.R",
    "is.array",
    "is.atomic",
    "is.call",
    "is.character",
    "is.complex",
    "is.data.frame",
    "is.double",
    "is.element",
    "is.empty.model",
    "is.environment",
    "is.expression",
    "is.factor",
    "is.finite",
    "is.fractions",
    "is.function",
    "is.infinite",
    "is.integer",
    "is.language",
    "is.leaf",
    "is.list",
    "is.loaded",
    "is.logical",
    "is.matrix",
    "is.mts",
    "is.na",
    "is.na.POSIXlt",
    "is.na.data.frame",
    "is.name",
    "is.nan",
    "is.null",
    "is.numeric",
    "is.numeric.Date",
    "is.numeric.POSIXt",
    "is.numeric_version",
    "is.object",
    "is.ordered",
    "is.package_version",
    "is.pairlist",
    "is.primitive",
    "is.qr",
    "is.raw",
    "is.real",
    "is.recursive",
    "is.relistable",
    "is.single",
    "is.stepfun",
    "is.symbol",
    "is.table",
    "is.tclObj",
    "is.tkwin",
    "is.ts",
    "is.tskernel",
    "is.unsorted",
    "is.vector",
    "isAqua",
    "isBaseNamespace",
    "isClass",
    "isClassDef",
    "isClassUnion",
    "isGeneric",
    "isGrammarSymbol",
    "isGroup",
    "isHelp",
    "isIncomplete",
    "isMac",
    "isNamespace",
    "isOpen",
    "isRestart",
    "isRgui",
    "isS4",
    "isSDI",
    "isSealedClass",
    "isSealedMethod",
    "isSeekable",
    "isSymmetric",
    "isSymmetric.matrix",
    "isTRUE",
    "isVirtualClass",
    "isWin",
    "isoMDS",
    "isoreg",
    "jitter",
    "jpeg",
    "julian",
    "julian.Date",
    "julian.POSIXt",
    "kappa",
    "kappa.default",
    "kappa.lm",
    "kappa.qr",
    "kappa.tri",
    "kde2d",
    "kernapply",
    "kernel",
    "kmeans",
    "knots",
    "koCmd",
    "kronecker",
    "kruskal.test",
    "ks.test",
    "ksmooth",
    "l10n_info",
    "labels",
    "labels.default",
    "lag",
    "lag.plot",
    "languageEl",
    "lapply",
    "layout",
    "layout.show",
    "lazyLoad",
    "lazyLoadDBfetch",
    "lbeta",
    "lchoose",
    "lcm",
    "lda",
    "ldahist",
    "legend",
    "length",
    "letters",
    "levels",
    "levels.default",
    "lfactorial",
    "lgamma",
    "library",
    "library.dynam",
    "library.dynam.unload",
    "licence",
    "license",
    "limitedLabels",
    "line",
    "linearizeMlist",
    "lines",
    "lines.default",
    "lines.ts",
    "list",
    "list.files",
    "listFromMethods",
    "listFromMlist",
    "listMethods",
    "listTypes",
    "list_files_with_exts",
    "list_files_with_type",
    "lm",
    "lm.fit",
    "lm.fit.null",
    "lm.gls",
    "lm.influence",
    "lm.ridge",
    "lm.wfit",
    "lm.wfit.null",
    "lmsreg",
    "lmwork",
    "load",
    "loadMethod",
    "loadNamespace",
    "loadURL",
    "loadedNamespaces",
    "loadhistory",
    "loadingNamespaceInfo",
    "loadings",
    "local",
    "localeToCharset",
    "locator",
    "lockBinding",
    "lockEnvironment",
    "loess",
    "loess.control",
    "loess.smooth",
    "log",
    "log10",
    "log1p",
    "log2",
    "logLik",
    "logb",
    "logical",
    "loglin",
    "loglm",
    "loglm1",
    "logtrans",
    "lower.tri",
    "lowess",
    "lqs",
    "lqs.formula",
    "ls",
    "ls.diag",
    "ls.print",
    "ls.str",
    "lsf.str",
    "lsfit",
    "ltsreg",
    "machine",
    "mad",
    "mahalanobis",
    "main.help.url",
    "make.link",
    "make.names",
    "make.packages.html",
    "make.rgb",
    "make.socket",
    "make.unique",
    "makeARIMA",
    "makeActiveBinding",
    "makeClassRepresentation",
    "makeExtends",
    "makeGeneric",
    "makeMethodsList",
    "makePrototypeFromClassDef",
    "makeRweaveLatexCodeRunner",
    "makeStandardGeneric",
    "makepredictcall",
    "manglePackageName",
    "manova",
    "mantelhaen.test",
    "mapply",
    "margin.table",
    "mat.or.vec",
    "match",
    "match.arg",
    "match.call",
    "match.fun",
    "matchSignature",
    "matlines",
    "matplot",
    "matpoints",
    "matrix",
    "mauchley.test",
    "mauchly.test",
    "max",
    "max.col",
    "mca",
    "mcnemar.test",
    "md5sum",
    "mean",
    "mean.Date",
    "mean.POSIXct",
    "mean.POSIXlt",
    "mean.data.frame",
    "mean.default",
    "mean.difftime",
    "median",
    "median.default",
    "medpolish",
    "mem.limits",
    "memory.limit",
    "memory.profile",
    "memory.size",
    "menu",
    "merge",
    "merge.data.frame",
    "merge.default",
    "mergeMethods",
    "message",
    "metaNameUndo",
    "method.skeleton",
    "methodSignatureMatrix",
    "methods",
    "methodsPackageMetaName",
    "mget",
    "min",
    "mirror2html",
    "missing",
    "missingArg",
    "mlistMetaName",
    "mode",
    "model.extract",
    "model.frame",
    "model.frame.aovlist",
    "model.frame.default",
    "model.frame.glm",
    "model.frame.lm",
    "model.matrix",
    "model.matrix.default",
    "model.matrix.lm",
    "model.offset",
    "model.response",
    "model.tables",
    "model.weights",
    "modifyList",
    "month.abb",
    "month.name",
    "monthplot",
    "months",
    "months.Date",
    "months.POSIXt",
    "mood.test",
    "mosaicplot",
    "mtext",
    "mvfft",
    "mvrnorm",
    "n2mfrow",
    "na.action",
    "na.contiguous",
    "na.exclude",
    "na.fail",
    "na.omit",
    "na.pass",
    "names",
    "namespaceExport",
    "namespaceImport",
    "namespaceImportClasses",
    "namespaceImportFrom",
    "namespaceImportMethods",
    "napredict",
    "naprint",
    "naresid",
    "nargs",
    "nchar",
    "nclass.FD",
    "nclass.Sturges",
    "nclass.freq",
    "nclass.scott",
    "ncol",
    "neg.bin",
    "negative.binomial",
    "negexp.SSival",
    "new",
    "new.env",
    "new.packages",
    "newBasic",
    "newClassRepresentation",
    "newEmptyObject",
    "nextn",
    "ngettext",
    "nlevels",
    "nlm",
    "nlminb",
    "nls",
    "nls.control",
    "noquote",
    "normalizePath",
    "nrow",
    "nsl",
    "numeric",
    "numericDeriv",
    "numeric_version",
    "nzchar",
    "objBrowse",
    "objClear",
    "objDir",
    "objInfo",
    "objList",
    "objMenu",
    "objSearch",
    "object.size",
    "objects",
    "offset",
    "old.packages",
    "oldClass",
    "on.exit",
    "oneway.test",
    "open",
    "open.connection",
    "open.srcfile",
    "open.srcfilecopy",
    "optim",
    "optimise",
    "optimize",
    "options",
    "order",
    "order.dendrogram",
    "ordered",
    "outer",
    "p.adjust",
    "pacf",
    "packBits",
    "package.contents",
    "package.dependencies",
    "package.description",
    "package.manager",
    "package.skeleton",
    "packageDescription",
    "packageEvent",
    "packageHasNamespace",
    "packageSlot",
    "packageStartupMessage",
    "packageStatus",
    "package_version",
    "page",
    "pairlist",
    "pairs",
    "pairs.default",
    "pairwise.prop.test",
    "pairwise.t.test",
    "pairwise.table",
    "pairwise.wilcox.test",
    "palette",
    "panel.smooth",
    "par",
    "parSocket",
    "parcoord",
    "parent.env",
    "parent.frame",
    "parse",
    "parse.dcf",
    "parseNamespaceFile",
    "paste",
    "path.expand",
    "pbeta",
    "pbinom",
    "pbirthday",
    "pcauchy",
    "pchisq",
    "pdf",
    "pdf.options",
    "pdfFonts",
    "pentagamma",
    "person",
    "personList",
    "persp",
    "pexp",
    "pf",
    "pgamma",
    "pgeom",
    "phyper",
    "pi",
    "pico",
    "pictex",
    "pie",
    "piechart",
    "pipe",
    "pkgDepends",
    "pkgVignettes",
    "plclust",
    "plnorm",
    "plogis",
    "plot",
    "plot.TukeyHSD",
    "plot.default",
    "plot.density",
    "plot.design",
    "plot.ecdf",
    "plot.lm",
    "plot.mlm",
    "plot.new",
    "plot.spec",
    "plot.spec.coherency",
    "plot.spec.phase",
    "plot.stepfun",
    "plot.ts",
    "plot.window",
    "plot.xy",
    "pmatch",
    "pmax",
    "pmax.int",
    "pmin",
    "pmin.int",
    "pnbinom",
    "png",
    "pnorm",
    "points",
    "points.default",
    "poisson",
    "polr",
    "poly",
    "polygon",
    "polym",
    "polyroot",
    "pos.to.env",
    "possibleExtends",
    "postscript",
    "postscriptFont",
    "postscriptFonts",
    "power",
    "power.anova.test",
    "power.prop.test",
    "power.t.test",
    "ppoints",
    "ppois",
    "ppr",
    "prcomp",
    "predict",
    "predict.glm",
    "predict.lm",
    "predict.mlm",
    "predict.poly",
    "preplot",
    "pretty",
    "prettyNum",
    "princomp",
    "print",
    "print.AsIs",
    "print.DLLInfo",
    "print.DLLInfoList",
    "print.DLLRegisteredRoutines",
    "print.Date",
    "print.NativeRoutineList",
    "print.POSIXct",
    "print.POSIXlt",
    "print.anova",
    "print.atomic",
    "print.by",
    "print.coefmat",
    "print.condition",
    "print.connection",
    "print.data.frame",
    "print.default",
    "print.density",
    "print.difftime",
    "print.factor",
    "print.family",
    "print.formula",
    "print.ftable",
    "print.glm",
    "print.hexmode",
    "print.infl",
    "print.integrate",
    "print.libraryIQR",
    "print.listof",
    "print.lm",
    "print.logLik",
    "print.noquote",
    "print.numeric_version",
    "print.octmode",
    "print.packageInfo",
    "print.proc_time",
    "print.restart",
    "print.rle",
    "print.simple.list",
    "print.srcfile",
    "print.srcref",
    "print.summary.table",
    "print.table",
    "print.terms",
    "print.ts",
    "print.warnings",
    "printCoefmat",
    "printNoClass",
    "prmatrix",
    "proc.time",
    "processSocket",
    "prod",
    "profile",
    "progress",
    "prohibitGeneric",
    "proj",
    "promax",
    "prompt",
    "promptClass",
    "promptData",
    "promptMethods",
    "promptPackage",
    "prop.table",
    "prop.test",
    "prop.trend.test",
    "prototype",
    "provide",
    "ps.options",
    "psi.bisquare",
    "psi.hampel",
    "psi.huber",
    "psigamma",
    "psignrank",
    "pt",
    "ptukey",
    "punif",
    "pushBack",
    "pushBackLength",
    "pweibull",
    "pwilcox",
    "q",
    "qbeta",
    "qbinom",
    "qbirthday",
    "qcauchy",
    "qchisq",
    "qda",
    "qexp",
    "qf",
    "qgamma",
    "qgeom",
    "qhyper",
    "qlnorm",
    "qlogis",
    "qnbinom",
    "qnorm",
    "qpois",
    "qqline",
    "qqnorm",
    "qqnorm.default",
    "qqplot",
    "qr",
    "qr.Q",
    "qr.R",
    "qr.X",
    "qr.coef",
    "qr.default",
    "qr.fitted",
    "qr.qty",
    "qr.qy",
    "qr.resid",
    "qr.solve",
    "qsignrank",
    "qt",
    "qtukey",
    "quade.test",
    "quantile",
    "quantile.default",
    "quarters",
    "quarters.Date",
    "quarters.POSIXt",
    "quartz",
    "quartz.options",
    "quartz.save",
    "quartzFont",
    "quartzFonts",
    "quasi",
    "quasibinomial",
    "quasipoisson",
    "quit",
    "qunif",
    "quote",
    "qweibull",
    "qwilcox",
    "r",
    "r2dtable",
    "rainbow",
    "range",
    "range.default",
    "rank",
    "rapply",
    "rational",
    "raw",
    "rawShift",
    "rawToBits",
    "rawToChar",
    "rbeta",
    "rbind",
    "rbind.data.frame",
    "rbind2",
    "rbinom",
    "rc.getOption",
    "rc.options",
    "rc.settings",
    "rc.status",
    "rcauchy",
    "rchisq",
    "rcond",
    "read.00Index",
    "read.DIF",
    "read.csv",
    "read.csv2",
    "read.dcf",
    "read.delim",
    "read.delim2",
    "read.fortran",
    "read.ftable",
    "read.fwf",
    "read.socket",
    "read.table",
    "read.table.url",
    "readBin",
    "readChar",
    "readCitationFile",
    "readLines",
    "readNEWS",
    "readline",
    "real",
    "reconcilePropertiesAndPrototype",
    "recordGraphics",
    "recordPlot",
    "recover",
    "rect",
    "rect.hclust",
    "reformulate",
    "reg.finalizer",
    "regexpr",
    "registerImplicitGenerics",
    "registerS3method",
    "registerS3methods",
    "relevel",
    "relist",
    "rematchDefinition",
    "remove",
    "remove.packages",
    "removeCConverter",
    "removeClass",
    "removeGeneric",
    "removeMethod",
    "removeMethods",
    "removeMethodsObject",
    "removeTaskCallback",
    "renumerate",
    "renumerate.formula",
    "reorder",
    "rep",
    "rep.Date",
    "rep.POSIXct",
    "rep.POSIXlt",
    "rep.factor",
    "rep.int",
    "replace",
    "replayPlot",
    "replicate",
    "replications",
    "representation",
    "require",
    "requireMethods",
    "resetClass",
    "resetGeneric",
    "reshape",
    "reshapeLong",
    "reshapeWide",
    "resid",
    "residuals",
    "residuals.default",
    "residuals.glm",
    "residuals.lm",
    "restart",
    "restartDescription",
    "restartFormals",
    "retracemem",
    "return",
    "rev",
    "rev.default",
    "rexp",
    "rf",
    "rgamma",
    "rgb",
    "rgb2hsv",
    "rgeom",
    "rhyper",
    "rle",
    "rlm",
    "rlnorm",
    "rlogis",
    "rm",
    "rmTemp",
    "rms.curv",
    "rmultinom",
    "rnbinom",
    "rnegbin",
    "rnorm",
    "round",
    "round.Date",
    "round.POSIXt",
    "round.difftime",
    "row",
    "row.names",
    "row.names.data.frame",
    "row.names.default",
    "rowMeans",
    "rowSums",
    "rownames",
    "rowsum",
    "rowsum.data.frame",
    "rowsum.default",
    "rpois",
    "rsignrank",
    "rstandard",
    "rstandard.glm",
    "rstandard.lm",
    "rstudent",
    "rstudent.glm",
    "rstudent.lm",
    "rt",
    "rug",
    "runif",
    "runmed",
    "rweibull",
    "rwilcox",
    "sQuote",
    "sammon",
    "sample",
    "sapply",
    "save",
    "save.image",
    "saveNamespaceImage",
    "savePlot",
    "savehistory",
    "scale",
    "scale.default",
    "scan",
    "scan.url",
    "scatter.smooth",
    "screen",
    "screeplot",
    "sd",
    "se.contrast",
    "sealClass",
    "search",
    "searchpaths",
    "seek",
    "seek.connection",
    "seemsS4Object",
    "segments",
    "select",
    "select.list",
    "selectMethod",
    "selfStart",
    "sendSocketClients",
    "seq",
    "seq.Date",
    "seq.POSIXt",
    "seq.default",
    "seq.int",
    "seq_along",
    "seq_len",
    "sequence",
    "serialize",
    "sessionData",
    "sessionInfo",
    "set.seed",
    "setAs",
    "setCConverterStatus",
    "setClass",
    "setClassUnion",
    "setDataPart",
    "setEPS",
    "setGeneric",
    "setGenericImplicit",
    "setGroupGeneric",
    "setHook",
    "setIs",
    "setMethod",
    "setNames",
    "setNamespaceInfo",
    "setOldClass",
    "setPS",
    "setPackageName",
    "setPrimitiveMethods",
    "setReplaceMethod",
    "setRepositories",
    "setTkProgressBar",
    "setTxtProgressBar",
    "setValidity",
    "setdiff",
    "setequal",
    "setwd",
    "shQuote",
    "shapiro.test",
    "show",
    "showClass",
    "showConnections",
    "showDefault",
    "showExtends",
    "showMethods",
    "showMlist",
    "showNonASCII",
    "sigToEnv",
    "sign",
    "signalCondition",
    "signature",
    "signif",
    "simpleCondition",
    "simpleError",
    "simpleMessage",
    "simpleWarning",
    "simulate",
    "sin",
    "single",
    "sinh",
    "sink",
    "sink.number",
    "slice.index",
    "slot",
    "slotNames",
    "smooth",
    "smooth.spline",
    "smoothEnds",
    "socketConnection",
    "socketSelect",
    "solve",
    "solve.default",
    "solve.qr",
    "sort",
    "sort.POSIXlt",
    "sort.default",
    "sort.int",
    "sort.list",
    "sortedXyData",
    "source",
    "source.url",
    "spec.ar",
    "spec.pgram",
    "spec.taper",
    "spectrum",
    "spineplot",
    "spline",
    "splinefun",
    "split",
    "split.data.frame",
    "split.default",
    "split.screen",
    "sprintf",
    "sqrt",
    "srcfile",
    "srcfilecopy",
    "srcref",
    "stack",
    "standardGeneric",
    "stars",
    "start",
    "startSocketServer",
    "stat.anova",
    "stderr",
    "stdin",
    "stdout",
    "stdres",
    "stem",
    "step",
    "stepAIC",
    "stepfun",
    "stl",
    "stop",
    "stopSocketServer",
    "stopifnot",
    "storage.mode",
    "str",
    "strOptions",
    "strftime",
    "strheight",
    "stripchart",
    "strptime",
    "strsplit",
    "strtrim",
    "structure",
    "strwidth",
    "strwrap",
    "studres",
    "sub",
    "subset",
    "subset.data.frame",
    "subset.default",
    "subset.matrix",
    "substitute",
    "substituteDirect",
    "substituteFunctionArgs",
    "substr",
    "substring",
    "sum",
    "summary",
    "summary.Date",
    "summary.POSIXct",
    "summary.POSIXlt",
    "summary.aov",
    "summary.aovlist",
    "summary.connection",
    "summary.data.frame",
    "summary.default",
    "summary.factor",
    "summary.glm",
    "summary.infl",
    "summary.lm",
    "summary.manova",
    "summary.matrix",
    "summary.mlm",
    "summary.stepfun",
    "summary.table",
    "summaryRprof",
    "sunflowerplot",
    "superClassDepth",
    "suppressMessages",
    "suppressPackageStartupMessages",
    "suppressWarnings",
    "supsmu",
    "svd",
    "svg",
    "sweep",
    "switch",
    "symbol.C",
    "symbol.For",
    "symbols",
    "symnum",
    "sys.call",
    "sys.calls",
    "sys.frame",
    "sys.frames",
    "sys.function",
    "sys.load.image",
    "sys.nframe",
    "sys.on.exit",
    "sys.parent",
    "sys.parents",
    "sys.save.image",
    "sys.source",
    "sys.status",
    "system",
    "system.file",
    "system.time",
    "t",
    "t.data.frame",
    "t.default",
    "t.test",
    "table",
    "tabulate",
    "tail",
    "tail.matrix",
    "tan",
    "tanh",
    "tapply",
    "taskCallbackManager",
    "tcl",
    "tclArray",
    "tclObj",
    "tclRequire",
    "tclServiceMode",
    "tclVar",
    "tclclose",
    "tclfile.dir",
    "tclfile.tail",
    "tclopen",
    "tclputs",
    "tclread",
    "tclvalue",
    "tcrossprod",
    "tempdir",
    "tempfile",
    "tempvar",
    "termplot",
    "terms",
    "terms.aovlist",
    "terms.default",
    "terms.formula",
    "terms.terms",
    "terrain.colors",
    "testPlatformEquivalence",
    "testVirtual",
    "tetragamma",
    "texi2dvi",
    "text",
    "text.default",
    "textConnection",
    "textConnectionValue",
    "theta.md",
    "theta.ml",
    "theta.mm",
    "tiff",
    "time",
    "timestamp",
    "title",
    "tkProgressBar",
    "tkStartGUI",
    "tkXselection.clear",
    "tkXselection.get",
    "tkXselection.handle",
    "tkXselection.own",
    "tk_select.list",
    "tkactivate",
    "tkadd",
    "tkaddtag",
    "tkbbox",
    "tkbell",
    "tkbind",
    "tkbindtags",
    "tkbutton",
    "tkcanvas",
    "tkcanvasx",
    "tkcanvasy",
    "tkcget",
    "tkcheckbutton",
    "tkchooseDirectory",
    "tkclipboard.append",
    "tkclipboard.clear",
    "tkclose",
    "tkcmd",
    "tkcompare",
    "tkconfigure",
    "tkcoords",
    "tkcreate",
    "tkcurselection",
    "tkdchars",
    "tkdebug",
    "tkdelete",
    "tkdelta",
    "tkdeselect",
    "tkdestroy",
    "tkdialog",
    "tkdlineinfo",
    "tkdtag",
    "tkdump",
    "tkentry",
    "tkentrycget",
    "tkentryconfigure",
    "tkevent.add",
    "tkevent.delete",
    "tkevent.generate",
    "tkevent.info",
    "tkfile.dir",
    "tkfile.tail",
    "tkfind",
    "tkflash",
    "tkfocus",
    "tkfont.actual",
    "tkfont.configure",
    "tkfont.create",
    "tkfont.delete",
    "tkfont.families",
    "tkfont.measure",
    "tkfont.metrics",
    "tkfont.names",
    "tkfraction",
    "tkframe",
    "tkget",
    "tkgetOpenFile",
    "tkgetSaveFile",
    "tkgettags",
    "tkgrab",
    "tkgrab.current",
    "tkgrab.release",
    "tkgrab.set",
    "tkgrab.status",
    "tkgrid",
    "tkgrid.bbox",
    "tkgrid.columnconfigure",
    "tkgrid.configure",
    "tkgrid.forget",
    "tkgrid.info",
    "tkgrid.location",
    "tkgrid.propagate",
    "tkgrid.remove",
    "tkgrid.rowconfigure",
    "tkgrid.size",
    "tkgrid.slaves",
    "tkicursor",
    "tkidentify",
    "tkimage.cget",
    "tkimage.configure",
    "tkimage.create",
    "tkimage.names",
    "tkindex",
    "tkinsert",
    "tkinvoke",
    "tkitembind",
    "tkitemcget",
    "tkitemconfigure",
    "tkitemfocus",
    "tkitemlower",
    "tkitemraise",
    "tkitemscale",
    "tklabel",
    "tklistbox",
    "tklower",
    "tkmark.gravity",
    "tkmark.names",
    "tkmark.next",
    "tkmark.previous",
    "tkmark.set",
    "tkmark.unset",
    "tkmenu",
    "tkmenubutton",
    "tkmessage",
    "tkmessageBox",
    "tkmove",
    "tknearest",
    "tkopen",
    "tkpack",
    "tkpack.configure",
    "tkpack.forget",
    "tkpack.info",
    "tkpack.propagate",
    "tkpack.slaves",
    "tkpager",
    "tkplace",
    "tkplace.configure",
    "tkplace.forget",
    "tkplace.info",
    "tkplace.slaves",
    "tkpopup",
    "tkpost",
    "tkpostcascade",
    "tkpostscript",
    "tkputs",
    "tkradiobutton",
    "tkraise",
    "tkread",
    "tkscale",
    "tkscan.dragto",
    "tkscan.mark",
    "tkscrollbar",
    "tksearch",
    "tksee",
    "tkselect",
    "tkselection.adjust",
    "tkselection.anchor",
    "tkselection.clear",
    "tkselection.from",
    "tkselection.includes",
    "tkselection.present",
    "tkselection.range",
    "tkselection.set",
    "tkselection.to",
    "tkset",
    "tksize",
    "tktag.add",
    "tktag.bind",
    "tktag.cget",
    "tktag.configure",
    "tktag.delete",
    "tktag.lower",
    "tktag.names",
    "tktag.nextrange",
    "tktag.prevrange",
    "tktag.raise",
    "tktag.ranges",
    "tktag.remove",
    "tktext",
    "tktitle",
    "tktoggle",
    "tktoplevel",
    "tktype",
    "tkunpost",
    "tkwait.variable",
    "tkwait.visibility",
    "tkwait.window",
    "tkwidget",
    "tkwindow.cget",
    "tkwindow.configure",
    "tkwindow.create",
    "tkwindow.names",
    "tkwinfo",
    "tkwm.aspect",
    "tkwm.client",
    "tkwm.colormapwindows",
    "tkwm.command",
    "tkwm.deiconify",
    "tkwm.focusmodel",
    "tkwm.frame",
    "tkwm.geometry",
    "tkwm.grid",
    "tkwm.group",
    "tkwm.iconbitmap",
    "tkwm.iconify",
    "tkwm.iconmask",
    "tkwm.iconname",
    "tkwm.iconposition",
    "tkwm.iconwindow",
    "tkwm.maxsize",
    "tkwm.minsize",
    "tkwm.overrideredirect",
    "tkwm.positionfrom",
    "tkwm.protocol",
    "tkwm.resizable",
    "tkwm.sizefrom",
    "tkwm.state",
    "tkwm.title",
    "tkwm.transient",
    "tkwm.withdraw",
    "tkxview",
    "tkxview.moveto",
    "tkxview.scroll",
    "tkyposition",
    "tkyview",
    "tkyview.moveto",
    "tkyview.scroll",
    "toBibtex",
    "toLatex",
    "toString",
    "toString.default",
    "toeplitz",
    "tolower",
    "topenv",
    "topo.colors",
    "toupper",
    "trObjList",
    "trObjSearch",
    "trace",
    "traceOff",
    "traceOn",
    "traceback",
    "tracemem",
    "tracingState",
    "trans3d",
    "transform",
    "transform.data.frame",
    "transform.default",
    "trigamma",
    "truehist",
    "trunc",
    "trunc.Date",
    "trunc.POSIXt",
    "truncate",
    "truncate.connection",
    "try",
    "tryCatch",
    "tryNew",
    "trySilent",
    "ts",
    "ts.intersect",
    "ts.plot",
    "ts.union",
    "tsSmooth",
    "tsdiag",
    "tsp",
    "ttkbutton",
    "ttkcheckbutton",
    "ttkcombobox",
    "ttkentry",
    "ttkframe",
    "ttkimage",
    "ttklabel",
    "ttklabelframe",
    "ttkmenubutton",
    "ttknotebook",
    "ttkpanedwindow",
    "ttkprogressbar",
    "ttkradiobutton",
    "ttkscrollbar",
    "ttkseparator",
    "ttksizegrip",
    "ttktreeview",
    "txtProgressBar",
    "type.convert",
    "typeof",
    "ucv",
    "unRematchDefinition",
    "unclass",
    "undebug",
    "undoc",
    "union",
    "unique",
    "unique.POSIXlt",
    "unique.array",
    "unique.data.frame",
    "unique.default",
    "unique.matrix",
    "uniroot",
    "units",
    "units.difftime",
    "unix",
    "unix.time",
    "unlink",
    "unlist",
    "unloadNamespace",
    "unlockBinding",
    "unname",
    "unserialize",
    "unsplit",
    "unstack",
    "untrace",
    "untracemem",
    "unz",
    "update",
    "update.default",
    "update.formula",
    "update.packageStatus",
    "update.packages",
    "upgrade",
    "upper.tri",
    "url",
    "url.show",
    "utf8ToInt",
    "validObject",
    "validSlotNames",
    "var",
    "var.test",
    "variable.names",
    "varimax",
    "vcov",
    "vector",
    "version",
    "vi",
    "vignette",
    "vignetteDepends",
    "warning",
    "warnings",
    "weekdays",
    "weekdays.Date",
    "weekdays.POSIXt",
    "weighted.mean",
    "weighted.residuals",
    "weights",
    "which",
    "which.max",
    "which.min",
    "width.SJ",
    "wilcox.test",
    "window",
    "with",
    "with.default",
    "withCallingHandlers",
    "withRestarts",
    "withVisible",
    "within",
    "within.data.frame",
    "within.list",
    "write",
    "write.csv",
    "write.csv2",
    "write.dcf",
    "write.ftable",
    "write.matrix",
    "write.socket",
    "write.table",
    "write.table0",
    "writeBin",
    "writeChar",
    "writeLines",
    "write_PACKAGES",
    "wsbrowser",
    "x11",
    "xedit",
    "xemacs",
    "xfig",
    "xgettext",
    "xgettext2pot",
    "xinch",
    "xngettext",
    "xor",
    "xpdrows.data.frame",
    "xspline",
    "xtabs",
    "xy.coords",
    "xyTable",
    "xyinch",
    "xyz.coords",
    "yinch",
    "zapsmall",
    "zip.file.extract",
]


#---- Lexer class

# Dev Notes:
# Komodo's editing component is based on scintilla (scintilla.org). This
# project provides C++-based lexers for a number of languages -- these
# lexers are used for syntax coloring and folding in Komodo. Komodo also
# has a UDL system for writing UDL-based lexers that is simpler than
# writing C++-based lexers and has support for multi-language files.
#
# The codeintel system has a Lexer class that is a wrapper around these
# lexers. You must define a Lexer class for lang R. If Komodo's
# scintilla lexer for R is UDL-based, then this is simply:
#
#   from codeintel2.udl import UDLLexer
#   class RLexer(UDLLexer):
#       lang = lang
#
# Otherwise (the lexer for R is one of Komodo's existing C++ lexers
# then this is something like the following. See lang_python.py or
# lang_perl.py in your Komodo installation for an example. "SilverCity"
# is the name of a package that provides Python module APIs for Scintilla
# lexers.
#
#import SilverCity
#from SilverCity.Lexer import Lexer
#from SilverCity import ScintillaConstants
#class RLexer(Lexer):
#    lang = lang
#    def __init__(self):
#        self._properties = SilverCity.PropertySet()
#        self._lexer = SilverCity.find_lexer_module_by_id(ScintillaConstants.SCLEX_R)
#        self._keyword_lists = [
#           # Dev Notes: What goes here depends on the C++ lexer
#           # implementation.
#        ]
class RLexer(UDLLexer):
    lang = lang

# TODO: how to update keyword lists dynamically?

    #def __init__(self):
    #self._properties = SilverCity.PropertySet()
    #self._keyword_lists = [
        #SilverCity.WordList(SilverCity.Keywords.perl_keywords),
        #SilverCity.WordList("")
    #]
    #SilverCity.WordList("fsfsd fsfsdf")



# possible R triggers:
# library|require(<|>     available packages
# detach(<|>      loaded namespaces
# data(<|>        available datasets
# func(<|>        calltip or argument names
# func(arg,<|>    argument names
# func(firstar<|>    argument names
# func(arg, secondar<|>    argument names
# list $ <|>        list elements
# s4object @ <|>    slots
# namespace:: <|>  objects within namespace
# namespace::: <|>  objects within namespace
# variab<|>       complete variable names
# "<|>            file paths
# Note that each name may be single, double or backtick quoted, or in multiple
# lines
## completion for 'library(' or 'require(' R command :
## 'unique(unlist(lapply(.libPaths(), dir)))'


#---- LangIntel class

# Dev Notes:
# All language should define a LangIntel class. (In some rare cases it
# isn't needed but there is little reason not to have the empty subclass.)
#
# One instance of the LangIntel class will be created for each codeintel
# language. Code browser functionality and some buffer functionality
# often defers to the LangIntel singleton.
#
# This is especially important for multi-lang files. For example, an
# HTML buffer uses the JavaScriptLangIntel and the CSSLangIntel for
# handling codeintel functionality in <script> and <style> tags.
#
# See other lang_*.py and codeintel_*.py files in your Komodo installation for
# examples of usage.

# PhG: replaced by:
#class RLangIntel(LangIntel):
class RLangIntel(LangIntel, ParenStyleCalltipIntelMixin, ProgLangTriggerIntelMixin):
    lang = lang

    # PhG: added
    # Used by ProgLangTriggerIntelMixin.preceding_trg_from_pos()
    trg_chars = tuple('$@[( ')
    calltip_trg_chars = tuple('(,')
    
    # named styles used by the class
    whitespace_style = SCE_UDL_SSL_DEFAULT
    operator_style   = SCE_UDL_SSL_OPERATOR
    identifier_style = SCE_UDL_SSL_IDENTIFIER
    keyword_style    = SCE_UDL_SSL_WORD
    variable_style   = SCE_UDL_SSL_VARIABLE
    string_style     = SCE_UDL_SSL_STRING
    comment_styles   = (SCE_UDL_SSL_COMMENT, SCE_UDL_SSL_COMMENTBLOCK)
    comment_styles_or_whitespace = comment_styles + (whitespace_style, )
    word_styles      = ( variable_style, identifier_style, keyword_style)

    type_sep = u'\u001e'
    pathsep = os.sep + ("" if(os.altsep is None) else os.altsep)


    koPrefs = components.classes["@activestate.com/koPrefService;1"] \
        .getService(components.interfaces.koIPrefService).prefs

    ##
    # Implicit codeintel triggering event, i.e. when typing in the editor.
    #
    # @param buf {components.interfaces.koICodeIntelBuffer}
    # @param pos {int} The cursor position in the editor/text.
    # @param implicit {bool} Automatically called, else manually called?
    #
    def trg_from_pos(self, buf, pos, implicit=True, DEBUG=False, ac=None):
        DEBUG = True
        if pos < 1:
            return None

        # accessor {codeintel2.accessor.Accessor} - Examine text and styling.
        accessor = buf.accessor
        last_pos = pos-1
        char = accessor.char_at_pos(last_pos)
        style = accessor.style_at_pos(last_pos)
        if DEBUG:
            print "trg_from_pos: char: %r, style: %d" % (char, accessor.style_at_pos(last_pos), )
        
        # PhG: next paragraph replaced by...
        #if style in (SCE_UDL_SSL_WORD, SCE_UDL_SSL_IDENTIFIER):
        #    # Functions/builtins completion trigger.
        #    start, end = accessor.contiguous_style_range_from_pos(last_pos)
        #    if DEBUG:
        #        print "identifier style, start: %d, end: %d" % (start, end)
        #    # Trigger when two characters have been typed.
        #    if (last_pos - start) == 1:
        #        if DEBUG:
        #            print "triggered:: complete identifiers"
        #        return Trigger(self.lang, TRG_FORM_CPLN, "identifiers",
        #                       start, implicit,
        #                       word_start=start, word_end=end)
        if char == " " and (not (style in (SCE_UDL_SSL_COMMENT, SCE_UDL_SSL_COMMENTBLOCK))):
            # Look the char just before all spaces, tabs or carriage return
            # We do not trigger it if we are in a comment!
            p = last_pos-1
            min_p = max(0, p-500)      # Don't bother looking more than 500 chars
            if DEBUG:
                print "Checking char just before spaces"
            while p >= min_p:
                #accessor.style_at_pos(p) in jsClassifier.comment_styles:
                ch = accessor.char_at_pos(p)
                st = accessor.style_at_pos(p)
                p -= 1
                if (not (ch in " \t\v\r\n")) and \
                (not (st in (SCE_UDL_SSL_COMMENT, SCE_UDL_SSL_COMMENTBLOCK))):
                    break
            if ch == ",":
                # Calculate a completion list for function arguments
                if DEBUG:
                    print "triggered:: complete arguments"
                return Trigger(self.lang, TRG_FORM_CPLN, "arguments",
                               pos, implicit)
            elif ch == "=":
                # TODO: Try to provide correct completion for function arguments
                if DEBUG:
                    print "triggered:: complete identifiers"
                return Trigger(self.lang, TRG_FORM_CPLN, "identifiers",
                               pos, implicit)
            return None
        if char == '$' or char == '@':
            # Variable completion trigger.
            if DEBUG:
                print "triggered:: complete variables"
            return Trigger(self.lang, TRG_FORM_CPLN, "variables",
                           pos, implicit)
        elif char == '[':
            # Quoted variable completion trigger.
            if DEBUG:
                print "triggered:: complete quoted variables"
            return Trigger(self.lang, TRG_FORM_CPLN, "quotevariables",
                           pos, implicit)            
        elif char == '(' or char == ',':
            # Function calltip trigger.
            if DEBUG:
                print "triggered:: function calltip"
            return Trigger(self.lang, TRG_FORM_CALLTIP,
                           "call-signature", pos, implicit)
        elif style in (SCE_UDL_SSL_WORD, SCE_UDL_SSL_IDENTIFIER):
            # Functions/builtins completion trigger.
            start, end = accessor.contiguous_style_range_from_pos(last_pos)
            if DEBUG:
                print "identifier style, start: %d, end: %d" % (start, end)
            # Trigger when two characters have been typed.
            if (last_pos - start) == 1:
                if DEBUG:
                    print "triggered:: complete identifiers"
                return Trigger(self.lang, TRG_FORM_CPLN, "identifiers",
                               start, implicit)
        
        return None

    ##
    # Explicit triggering event, i.e. Ctrl+J.
    #
    # @param buf {components.interfaces.koICodeIntelBuffer}
    # @param pos {int} The cursor position in the editor/text.
    # @param implicit {bool} Automatically called, else manually called?
    #
    def preceding_trg_from_pos(self, buf, pos, curr_pos,
                               preceding_trg_terminators=None, DEBUG=False):
        DEBUG = True
        if pos < 3:
            return None

        # accessor {codeintel2.accessor.Accessor} - Examine text and styling.
        accessor = buf.accessor
        last_pos = pos-1
        char = accessor.char_at_pos(last_pos)
        style = accessor.style_at_pos(last_pos)
        if DEBUG:
            print "pos: %d, curr_pos: %d" % (pos, curr_pos)
            print "char: %r, style: %d" % (char, style)
        
        # PhG: next paragraph replaced by...
        #if style in (SCE_UDL_SSL_WORD, SCE_UDL_SSL_IDENTIFIER):
        #    # Functions/builtins completion trigger.
        #    start, end = accessor.contiguous_style_range_from_pos(last_pos)
        #    if DEBUG:
        #        print "triggered:: complete identifiers"
        #    return Trigger(self.lang, TRG_FORM_CPLN, "identifiers",
        #                   start, implicit=False,
        #                   word_start=start, word_end=end)
        
        if char == " " and (not (style in (SCE_UDL_SSL_COMMENT, SCE_UDL_SSL_COMMENTBLOCK))):
            # Look the char just before all spaces, tabs or carriage return
            # We do not trigger it if we are in a comment!
            p = last_pos-1
            min_p = max(0, p-500)      # Don't bother looking more than 500 chars
            if DEBUG:
                print "Checking char just before spaces"
            while p >= min_p:
                #accessor.style_at_pos(p) in jsClassifier.comment_styles:
                ch = accessor.char_at_pos(p)
                st = accessor.style_at_pos(p)
                p -= 1
                if (not (ch in " \t\v\r\n")) and \
                (not (st in (SCE_UDL_SSL_COMMENT, SCE_UDL_SSL_COMMENTBLOCK))):
                    break
            if ch == ",":
                # Calculate a completion list for function arguments
                if DEBUG:
                    print "triggered:: complete arguments"
                return Trigger(self.lang, TRG_FORM_CPLN, "arguments",
                               pos, implicit=False)
            elif ch == "=":
                # TODO: Try to provide correct completion for function arguments
                if DEBUG:
                    print "triggered:: complete identifiers"
                return Trigger(self.lang, TRG_FORM_CPLN, "identifiers",
                               pos, implicit=False)
            return None
        if char == '$'or char == '@':
            return Trigger(self.lang, TRG_FORM_CPLN, "variables",
                            pos, implicit=False)
        elif char == '[':
            return Trigger(self.lang, TRG_FORM_CPLN, "quotevariables",
                            pos, implicit=False)
        elif char == '(' or char == ',':
            # Function calltip trigger.
            if DEBUG:
                print "triggered:: function calltip"
            return Trigger(self.lang, TRG_FORM_CALLTIP,
                           "call-signature", pos, implicit=False)
        elif style in (SCE_UDL_SSL_VARIABLE, ):
            start, end = accessor.contiguous_style_range_from_pos(last_pos)
            if DEBUG:
                print "triggered:: complete variables"
            return Trigger(self.lang, TRG_FORM_CPLN, "variables",
                           start+1, implicit=False)
        elif style in (SCE_UDL_SSL_WORD, SCE_UDL_SSL_IDENTIFIER):
            # Functions/builtins completion trigger.
            start, end = accessor.contiguous_style_range_from_pos(last_pos)
            if DEBUG:
                print "triggered:: complete identifiers"
            return Trigger(self.lang, TRG_FORM_CPLN, "identifiers",
                           start, implicit=False)
        else:
            # Functions/builtins completion trigger.
            start, end = accessor.contiguous_style_range_from_pos(last_pos)
            if DEBUG:
                print "triggered:: complete identifiers"
            return Trigger(self.lang, TRG_FORM_CPLN, "identifiers",
                           start, implicit=False)
        
        return None

    ##
    # Provide the list of completions or the calltip string.
    # Completions are a list of tuple (type, name) items.
    #
    # Note: This example is *not* asynchronous.
    def async_eval_at_trg(self, buf, trg, ctlr):
        if _xpcom_:
            trg = UnwrapObject(trg)
            ctlr = UnwrapObject(ctlr)
        pos = trg.pos
        ctlr.start(buf, trg)

        if trg.id == (self.lang, TRG_FORM_CPLN, "identifiers"):
# First, check if there is an abbreviation
            
# TODO: convert this into Python and integrate
#            		var ke = ko.views.manager.currentView.scimoz;
#		var sel = ke.selText;
#		if (sv.abbrev.callTipActive & ke.callTipActive()) { ke.callTipCancel(); }
#		// Only activate tip if current selection is empty!
#		if (sel == "") {
#			var trig = ko.interpolate.getWordUnderCursor(ke);
#			var snip = sv.abbrev.findAbbrevSnippet(trig);
#			if(snip) {
#				var tip = snip.value;
#				tip = tip.replace("!@#_anchor", "");
#				tip = tip.replace("!@#_currentPos", "");
#				ke.callTipShow(ke.anchor, "Meta+T expands:\n" + tip);
#				sv.abbrev.callTipActive = true;
#			}
#		}
#	} catch(e) { log.exception(e); }   
            # Return all known keywords and builtins.
            #ctlr.set_cplns(self._get_all_known_identifiers(buf))
            start, end = buf.accessor.contiguous_style_range_from_pos(pos)
            self._autocomplete(buf, start, end)
            ctlr.done("success")
            return
            
            
#            word_start = trg.extra.get("word_start")
#            word_end = trg.extra.get("word_end")
#            if word_start is not None and word_end is not None:
#                # Only return keywords that start with the given 2-char prefix.
#                prefix = buf.accessor.text_range(word_start, word_end)[:2]
#                cplns = [x for x in keywords if x.startswith(prefix)]
#                cplns = [("keyword", x) for x in sorted(cplns, cmp=CompareNPunctLast)]
#                ctlr.set_cplns(cplns)
#                ctlr.done("success")
#                return
        
        #PhG: added!
        if trg.id == (self.lang, TRG_FORM_CPLN, "variables"):
            # Find all variables in the current file, complete using them.
            #ctlr.set_cplns(self._get_all_variables_in_buffer(buf))
            self._autocomplete(buf, pos, pos)
            ctlr.done("success")
            return

        if trg.id == (self.lang, TRG_FORM_CPLN, "quotevariables"):
            # Find all variables in the current file, complete using them.
            #ctlr.set_cplns(self._get_all_variables_in_buffer(buf))
            self._autocomplete(buf, pos, pos)
            ctlr.done("success")
            return
        
        if trg.id == (self.lang, TRG_FORM_CPLN, "arguments"):
            # Return all arguments of current function.
            #ctlr.set_cplns(self._get_all_known_arguments(buf))
            self._autocomplete(buf, pos, pos)
            ctlr.done("success")
            return

        if trg.id == (self.lang, TRG_FORM_CALLTIP, "call-signature"):
            # Get function calltip.
            working_text = buf.accessor.text_range(max(0, pos-500), pos)
            complete_zone = buf.accessor.text_range(pos, pos)
            calltip = R.calltip(working_text)
            # This is done asynchronously by the R.calltip() function
            #if calltip:
            #    ctlr.set_calltips([calltip])
            ctlr.done("success")
            return
        # PhG: ennd of additions

        ctlr.error("Unknown trigger type: %r" % (trg, ))
        ctlr.done("error")
        

    # PhG: added...
        ##
    # Internal functions
    #

    def _autocomplete(self, buf, start, end):
        # Get autocompletion list.
        # TODO: a more sensible way to get the piece of code to complete!
        working_text = buf.accessor.text_range(max(0, start-200), end)
        complete_zone = buf.accessor.text_range(start, end)
        complete = R.complete(working_text)
        return complete
    
    # Not used for R autocomplete, but good to keep
    #def _get_all_variables_in_buffer(self, buf):
    #    all_variables = set()
    #    for token in buf.accessor.gen_tokens():
    #        if token.get('style') == SCE_UDL_SSL_VARIABLE:
    #            all_variables.add(token.get('text')[0:])
    #    return [("variable", x) for x in sorted(all_variables, cmp=CompareNPunctLast)]

    #_identifier_cplns = None
    #def _get_all_known_identifiers(self, buf):
    #    if RLangIntel._identifier_cplns is None:
    #        cplns = [("keyword", x) for x in keywords]
    #        cplns += [("function", x) for x in builtins]
    #        RLangIntel._identifier_cplns = sorted(cplns, cmp=CompareNPunctLast, key=operator.itemgetter(1))
    #    return RLangIntel._identifier_cplns

#---- Buffer class

# Dev Notes:
# Every language must define a Buffer class. An instance of this class
# is created for every file of this language opened in Komodo. Most of
# that APIs for scanning, looking for autocomplete/calltip trigger points
# and determining the appropriate completions and calltips are called on
# this class.
#
# Currently a full explanation of these API is beyond the scope of this
# stub. Resources for more info are:
# - the base class definitions (Buffer, CitadelBuffer, UDLBuffer) for
#   descriptions of the APIs
# - lang_*.py files in your Komodo installation as examples
# - the upcoming "Anatomy of a Komodo Extension" tutorial
# - the Komodo community forums:
#   http://community.activestate.com/products/Komodo
# - the Komodo discussion lists:
#   http://listserv.activestate.com/mailman/listinfo/komodo-discuss
#   http://listserv.activestate.com/mailman/listinfo/komodo-beta
#
class RBuffer(UDLBuffer):
    # Dev Note: What to sub-class from?
    # - If this is a UDL-based language: codeintel2.udl.UDLBuffer
    # - Else if this is a programming language (it has functions,
    #   variables, classes, etc.): codeintel2.citadel.CitadelBuffer
    # - Otherwise: codeintel2.buffer.Buffer
    lang = lang

    # Uncomment and assign the appropriate languages - these are used to
    # determine which language controls the completions for a given UDL family.
    #m_lang = "HTML"
    #m_lang = "XML"
    #css_lang = "CSS"
    #csl_lang = "JavaScript"
    m_lang = "Rwiki"
    ssl_lang = "R"
    #tpl_lang = "Rd"

    cb_show_if_empty = True

    # Close the completion dialog when encountering any of these chars.
    #PhG: changed...
    #cpln_stop_chars = "_ ()*-=+<>{}[]^&|;:'\",?~`!@#%\\/"
    cpln_fillup_chars = "\t" #"~`!$@#%^&*()-=+{}[]|\\;:'\",<>?/\t\n\r"
    cpln_stop_chars = "~`!$@#%^&*()-=+{}[]|\\;:'\",<>?/ "


#---- CILE Driver class

# Dev Notes:
# A CILE (Code Intelligence Language Engine) is the code that scans
# Rd content and returns a description of the code in that file.
# See "cile_rd.py" for more details.
#
# The CILE Driver is a class that calls this CILE. If Rd is
# multi-lang (i.e. can contain sections of different language content,
# e.g. HTML can contain markup, JavaScript and CSS), then you will need
# to also implement "scan_multilang()".
class RCILEDriver(UDLCILEDriver):
    lang = lang

    def scan_purelang(self, buf):
        import cile_r
        return cile_r.scan_buf(buf)


#---- registration

def register(mgr):
    """Register language support with the Manager."""
    mgr.set_lang_info(
        lang,
        silvercity_lexer=RLexer(),
        buf_class=RBuffer,
        langintel_class=RLangIntel,
        import_handler_class=None,
        cile_driver_class=RCILEDriver,
        # Dev Note: set to false if this language does not support
        # autocomplete/calltips.
        is_cpln_lang=True)



##### PhG: the code to be converted... later on!
#class RLangIntel(CitadelLangIntel, ParenStyleCalltipIntelMixin,
#                   ProgLangTriggerIntelMixin):
#    lang = lang
#
#    # Used by ProgLangTriggerIntelMixin.preceding_trg_from_pos()
#    trg_chars = tuple('$@[( ')
#    calltip_trg_chars = tuple('(,')
#    
#    # named styles used by the class
#    whitespace_style = SCE_UDL_SSL_DEFAULT
#    operator_style   = SCE_UDL_SSL_OPERATOR
#    identifier_style = SCE_UDL_SSL_IDENTIFIER
#    keyword_style    = SCE_UDL_SSL_WORD
#    variable_style   = SCE_UDL_SSL_VARIABLE
#    string_style     = SCE_UDL_SSL_STRING
#    comment_styles   = (SCE_UDL_SSL_COMMENT, SCE_UDL_SSL_COMMENTBLOCK)
#    comment_styles_or_whitespace = comment_styles + (whitespace_style, )
#    word_styles      = ( variable_style, identifier_style, keyword_style)
#
#    type_sep = u'\u001e'
#    pathsep = os.sep + ("" if(os.altsep is None) else os.altsep)
#
#
#    koPrefs = components.classes["@activestate.com/koPrefService;1"] \
#        .getService(components.interfaces.koIPrefService).prefs
#
#    #def __init__:
#    #    CitadelLangIntel.__init__(self)
#    #    ParenStyleCalltipIntelMixin.__init__(self)
#    #    ProgLangTriggerIntelMixin.__init__(self)
#    #
#
#    ##
#    # Implicit triggering event, i.e. when typing in the editor.
#    #
#    # TODO: trigger positions
#    def trg_from_pos(self, buf, pos, implicit=True, DEBUG=False, ac=None):
#        #DEBUG = True
#        
#        """If the given position is a _likely_ trigger point, return a
#        relevant Trigger instance. Otherwise return the None.
#            "pos" is the position at which to check for a trigger point.
#            "implicit" (optional) is a boolean indicating if this trigger
#                is being implicitly checked (i.e. as a side-effect of
#                typing). Defaults to true.
#        """
#        if pos < 3:
#            return None
#
#        accessor = buf.accessor
#        last_pos = pos-1
#        
#        char = accessor.char_at_pos(last_pos)
#        style = accessor.style_at_pos(last_pos)
#        if DEBUG:
#            print "trg_from_pos: char: %r, style: %d" % (char, accessor.style_at_pos(last_pos), )
#        if char == " " and (not (style in (SCE_UDL_SSL_COMMENT, SCE_UDL_SSL_COMMENTBLOCK))):
#            # Look the char just before all spaces, tabs or carriage return
#            # We do not trigger it if we are in a comment!
#            p = last_pos-1
#            min_p = max(0, p-500)      # Don't bother looking more than 500 chars
#            if DEBUG:
#                print "Checking char just before spaces"
#            while p >= min_p:
#                #accessor.style_at_pos(p) in jsClassifier.comment_styles:
#                ch = accessor.char_at_pos(p)
#                st = accessor.style_at_pos(p)
#                p -= 1
#                if (not (ch in " \t\v\r\n")) and \
#                (not (st in (SCE_UDL_SSL_COMMENT, SCE_UDL_SSL_COMMENTBLOCK))):
#                    break
#            if ch == ",":
#                # Calculate a completion list for function arguments
#                if DEBUG:
#                    print "triggered:: complete arguments"
#                return Trigger(self.lang, TRG_FORM_CPLN, "arguments",
#                               pos, implicit)
#            elif ch == "=":
#                # TODO: Try to provide correct completion for function arguments
#                if DEBUG:
#                    print "triggered:: complete identifiers"
#                return Trigger(self.lang, TRG_FORM_CPLN, "identifiers",
#                               pos, implicit)
#            return None
#        if char == '$' or char == '@':
#            # Variable completion trigger.
#            if DEBUG:
#                print "triggered:: complete variables"
#            return Trigger(self.lang, TRG_FORM_CPLN, "variables",
#                           pos, implicit)
#        elif char == '[':
#            # Quoted variable completion trigger.
#            if DEBUG:
#                print "triggered:: complete quoted variables"
#            return Trigger(self.lang, TRG_FORM_CPLN, "quotevariables",
#                           pos, implicit)            
#        elif char == '(' or char == ',':
#            # Function calltip trigger.
#            if DEBUG:
#                print "triggered:: function calltip"
#            return Trigger(self.lang, TRG_FORM_CALLTIP,
#                           "call-signature", pos, implicit)
#        elif style in (SCE_UDL_SSL_WORD, SCE_UDL_SSL_IDENTIFIER):
#            # Functions/builtins completion trigger.
#            start, end = accessor.contiguous_style_range_from_pos(last_pos)
#            if DEBUG:
#                print "identifier style, start: %d, end: %d" % (start, end)
#            # Trigger when two characters have been typed.
#            if (last_pos - start) == 1:
#                if DEBUG:
#                    print "triggered:: complete identifiers"
#                return Trigger(self.lang, TRG_FORM_CPLN, "identifiers",
#                               start, implicit)
#        return None
#
#    ##
#    # Explicit triggering event, i.e. Ctrl+J.
#    #
#    def preceding_trg_from_pos(self, buf, pos, curr_pos,
#                               preceding_trg_terminators=None, DEBUG=False):
#        #DEBUG = True
#        if pos < 3:
#            return None
#
#        accessor = buf.accessor
#        last_pos = pos-1
#        char = accessor.char_at_pos(last_pos)
#        style = accessor.style_at_pos(last_pos)
#        if DEBUG:
#            print "pos: %d, curr_pos: %d" % (pos, curr_pos)
#            print "char: %r, style: %d" % (char, style)
#        if char == " " and (not (style in (SCE_UDL_SSL_COMMENT, SCE_UDL_SSL_COMMENTBLOCK))):
#            # Look the char just before all spaces, tabs or carriage return
#            # We do not trigger it if we are in a comment!
#            p = last_pos-1
#            min_p = max(0, p-500)      # Don't bother looking more than 500 chars
#            if DEBUG:
#                print "Checking char just before spaces"
#            while p >= min_p:
#                #accessor.style_at_pos(p) in jsClassifier.comment_styles:
#                ch = accessor.char_at_pos(p)
#                st = accessor.style_at_pos(p)
#                p -= 1
#                if (not (ch in " \t\v\r\n")) and \
#                (not (st in (SCE_UDL_SSL_COMMENT, SCE_UDL_SSL_COMMENTBLOCK))):
#                    break
#            if ch == ",":
#                # Calculate a completion list for function arguments
#                if DEBUG:
#                    print "triggered:: complete arguments"
#                return Trigger(self.lang, TRG_FORM_CPLN, "arguments",
#                               pos, implicit=False)
#            elif ch == "=":
#                # TODO: Try to provide correct completion for function arguments
#                if DEBUG:
#                    print "triggered:: complete identifiers"
#                return Trigger(self.lang, TRG_FORM_CPLN, "identifiers",
#                               pos, implicit=False)
#            return None
#        if char == '$'or char == '@':
#            return Trigger(self.lang, TRG_FORM_CPLN, "variables",
#                            pos, implicit=False)
#        elif char == '[':
#            return Trigger(self.lang, TRG_FORM_CPLN, "quotevariables",
#                            pos, implicit=False)
#        elif char == '(' or char == ',':
#            # Function calltip trigger.
#            if DEBUG:
#                print "triggered:: function calltip"
#            return Trigger(self.lang, TRG_FORM_CALLTIP,
#                           "call-signature", pos, implicit=False)
#        elif style in (SCE_UDL_SSL_VARIABLE, ):
#            start, end = accessor.contiguous_style_range_from_pos(last_pos)
#            if DEBUG:
#                print "triggered:: complete variables"
#            return Trigger(self.lang, TRG_FORM_CPLN, "variables",
#                           start+1, implicit=False)
#        elif style in (SCE_UDL_SSL_WORD, SCE_UDL_SSL_IDENTIFIER):
#            # Functions/builtins completion trigger.
#            start, end = accessor.contiguous_style_range_from_pos(last_pos)
#            if DEBUG:
#                print "triggered:: complete identifiers"
#            return Trigger(self.lang, TRG_FORM_CPLN, "identifiers",
#                           start, implicit=False)
#        else:
#            # Functions/builtins completion trigger.
#            start, end = accessor.contiguous_style_range_from_pos(last_pos)
#            if DEBUG:
#                print "triggered:: complete identifiers"
#            return Trigger(self.lang, TRG_FORM_CPLN, "identifiers",
#                           start, implicit=False)
#        return None
#
#    ##
#    # Provide the list of completions or the calltip string.
#    # Completions are a list of tuple (type, name) items.
#    def async_eval_at_trg(self, buf, trg, ctlr):
#        if _xpcom_:
#            trg = UnwrapObject(trg)
#            ctlr = UnwrapObject(ctlr)
#        pos = trg.pos
#        ctlr.start(buf, trg)
#
#        if trg.id == (self.lang, TRG_FORM_CPLN, "variables"):
#            # Find all variables in the current file, complete using them.
#            #ctlr.set_cplns(self._get_all_variables_in_buffer(buf))
#            self._autocomplete(buf, pos, pos)
#            ctlr.done("success")
#            return
#
#        if trg.id == (self.lang, TRG_FORM_CPLN, "quotevariables"):
#            # Find all variables in the current file, complete using them.
#            #ctlr.set_cplns(self._get_all_variables_in_buffer(buf))
#            self._autocomplete(buf, pos, pos)
#            ctlr.done("success")
#            return
#
#        if trg.id == (self.lang, TRG_FORM_CPLN, "identifiers"):
#            # First, check if there is an abbreviation
#            
## TODO: convert this into Python and integrate
##      var ke = ko.views.manager.currentView.scimoz;
##      var sel = ke.selText;
##      if (sv.abbrev.callTipActive & ke.callTipActive()) { ke.callTipCancel(); }
##          // Only activate tip if current selection is empty!
##          if (sel == "") {
##              var trig = ko.interpolate.getWordUnderCursor(ke);
##              var snip = sv.abbrev.findAbbrevSnippet(trig);
##              if(snip) {
##                  var tip = snip.value;
##                  tip = tip.replace("!@#_anchor", "");
##                  tip = tip.replace("!@#_currentPos", "");
##                  ke.callTipShow(ke.anchor, "Meta+T expands:\n" + tip);
##                  sv.abbrev.callTipActive = true;
##              }
##          }
##      } catch(e) { log.exception(e); }
#            
#            
#            # Return all known keywords and builtins.
#            #ctlr.set_cplns(self._get_all_known_identifiers(buf))
#            start, end = buf.accessor.contiguous_style_range_from_pos(pos)
#            self._autocomplete(buf, start, end)
#            ctlr.done("success")
#            return
#        
#        if trg.id == (self.lang, TRG_FORM_CPLN, "arguments"):
#            # Return all arguments of current function.
#            #ctlr.set_cplns(self._get_all_known_arguments(buf))
#            self._autocomplete(buf, pos, pos)
#            ctlr.done("success")
#            return
#
#        if trg.id == (self.lang, TRG_FORM_CALLTIP, "call-signature"):
#            # Get function calltip.
#            working_text = buf.accessor.text_range(max(0, pos-500), pos)
#            complete_zone = buf.accessor.text_range(pos, pos)
#            calltip = R.calltip(working_text)
#            # This is done asynchronously by the R.calltip() function
#            #if calltip:
#            #    ctlr.set_calltips([calltip])
#            ctlr.done("success")
#            return
#
#        ctlr.error("Unknown trigger type: %r" % (trg, ))
#        ctlr.done("error")
#
#    ##
#    # Internal functions
#    #
#
#    def _autocomplete(self, buf, start, end):
#        # Get autocompletion list.
#        working_text = buf.accessor.text_range(max(0, start-500), end)
#        complete_zone = buf.accessor.text_range(start, end)
#        complete = R.complete(working_text)
#        return complete
#    
#    # Not used for R autocomplete, but good to keep
#    #def _get_all_variables_in_buffer(self, buf):
#    #    all_variables = set()
#    #    for token in buf.accessor.gen_tokens():
#    #        if token.get('style') == SCE_UDL_SSL_VARIABLE:
#    #            all_variables.add(token.get('text')[0:])
#    #    return [("variable", x) for x in sorted(all_variables, cmp=CompareNPunctLast)]
#
#    #_identifier_cplns = None
#    #def _get_all_known_identifiers(self, buf):
#    #    if RLangIntel._identifier_cplns is None:
#    #        cplns = [("keyword", x) for x in keywords]
#    #        cplns += [("function", x) for x in builtins]
#    #        RLangIntel._identifier_cplns = sorted(cplns, cmp=CompareNPunctLast, key=operator.itemgetter(1))
#    #    return RLangIntel._identifier_cplns
#
#
##---- Buffer class
## Dev Notes:
## Every language must define a Buffer class. An instance of this class
## is created for every file of this language opened in Komodo. Most of
## that APIs for scanning, looking for autocomplete/calltip trigger points
## and determining the appropriate completions and calltips are called on
## this class.
##
## Currently a full explanation of these API is beyond the scope of this
## stub. Resources for more info are:
## - the base class definitions (Buffer, CitadelBuffer, UDLBuffer) for
##   descriptions of the APIs
## - lang_*.py files in your Komodo installation as examples
## - the upcoming "Anatomy of a Komodo Extension" tutorial
## - the Komodo community forums:
##   http://community.activestate.com/products/Komodo
## - the Komodo discussion lists:
##   http://listserv.activestate.com/mailman/listinfo/komodo-discuss
##   http://listserv.activestate.com/mailman/listinfo/komodo-beta
##
#class RBuffer(CitadelBuffer):
#    # Dev Note: What to sub-class from?
#    # - If this is a UDL-based language: codeintel2.udl.UDLBuffer
#    # - Else if this is a programming language (it has functions,
#    #   variables, classes, etc.): codeintel2.citadel.CitadelBuffer
#    # - Otherwise: codeintel2.buffer.Buffer
#    lang = lang
#
#    cb_show_if_empty = True
#
#    cpln_fillup_chars = "\t" #"~`!$@#%^&*()-=+{}[]|\\;:'\",<>?/\t\n\r"
#    cpln_stop_chars = "~`!$@#%^&*()-=+{}[]|\\;:'\",<>?/ "
#
#    # Dev Note: many details elided.
#
#
##---- CILE Driver class
## Dev Notes:
## A CILE (Code Intelligence Language Engine) is the code that scans
## R content and returns a description of the code in that file.
## See "cile_r.py" for more details.
##
## The CILE Driver is a class that calls this CILE. If R is
## multi-lang (i.e. can contain sections of different language content,
## e.g. HTML can contain markup, JavaScript and CSS), then you will need
## to also implement "scan_multilang()".
#class RCILEDriver(CILEDriver):
#    lang = lang
#
#    def scan_purelang(self, buf):
#        import cile_r
#        return cile_r.scan_buf(buf)
#
#
##---- Registration
#def register(mgr):
#    """Register language support with the Manager."""
#    mgr.set_lang_info(
#        lang,
#        silvercity_lexer=RLexer(),
#        buf_class=RBuffer,
#        langintel_class=RLangIntel,
#        import_handler_class=None,
#        cile_driver_class=RCILEDriver,
#        is_cpln_lang=True)
#
