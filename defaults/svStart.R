### SciViews install begin ###
## SciViews-R installation and startup for running R with Komodo/SciViews-K
## Version 0.9.11, 2010-02-09 Ph. Grosjean (phgrosjean@sciviews.org)
## Version 0.9.15, 2010-05-01 modified by K. Barton
## Version 0.9.19, 2010-10-03 modified by Ph. Grosjean
## Version 0.9.20, 2010-11-10 modified by K. Barton
## Version 0.9.23, 2011-08-05 modified by Ph. Grosjean
## Version 0.9.25, 2011-12-28 modified by Ph. Grosjean
## Version 0.9.27, 2012-04-22 modified by Ph. Grosjean
## Version 0.9.28, 2012-12-17 modified by Ph. Grosjean
## Version 0.9.29, 2013-02-08 modified by Ph. Grosjean (don't use locate on the Mac)
## Version 0.9.31, 2013-10-10 modified by Ph. Grosjean (pkg binaires v2 & v3)

## TODO: also use value in koDebug to debug server from within R!
## TODO: use the mechanism of startHttpServer() to retrieve default config
## for port and server name in startSocketServer(). Change the code here to
## benefit from this mechanism
## TODO: record these parameters on a hidden file in user's home folder
## that way, one should be able to reconfigure R for SciViews communication
## just by loading the svKomodo package... but without rechecking if
## required packages are installed, versions, etc...
## TODO: I have now a work-around with print.help_files_with_topic but still
## help(package = ....) gets to the R.app help => I also need a workaround
## there!

svStart <- function (minRVersion = "2.11.1", minVersion = NA,
## NOTE: minVersion is now also used as a list of required packages
remote.repos = "http://R-Forge.R-project.org", pkg.dir = ".",
debug = Sys.getenv("koDebug") == "TRUE",
pkgsLast = c("svKomodo", "SciViews"), # to be loaded at the end
pkgsDontLoad = c("codetools", "svTools", "ellipse", "MASS"),
skip = NULL)
{
	## Note (KB): it would make life a way easier to put all (and only)
	## the necessary routines in a SINGLE package.

	## Needed later for tryCatch'ing:
	err.null <- function (e) return(NULL)

	## With a switch to R v. 3.0.0, we now have two binaries: one for v2 and
	## one for version 3. For now, maintain both into separate dirs!
	if (.Platform$pkgType == "win.binary") {
		if (R.version$major < 3) {
			pkg.dir <- file.path(pkg.dir, "v2")
		} else pkg.dir <- file.path(pkg.dir, "v3")
	}
	
	## If minVersion not provided, get it from packages in 'default' directory
	pkg.extpat <- switch(.Platform$pkgType, win.binary = "zip", "tar\\.gz")
	pkgFiles <- dir(pkg.dir, pattern = paste("^.*_[0-9\\.\\-]+\\.", pkg.extpat,
		"$", sep=""))
	if (all(is.na(minVersion))) {
		minVersion <- structure(gsub(sprintf("(^[a-zA-Z]+_|\\.%s$)",
			pkg.extpat), "", pkgFiles), names = gsub("_.*$", "", pkgFiles))

		minVersion <- package_version(gsub(sprintf("(^[a-zA-Z]+_|\\.%s$)",
			pkg.extpat), "", pkgFiles))

		pkgNames <- gsub("_.*$", "", pkgFiles)
		## Select newest version if more then one exist
		v <- tapply(minVersion, pkgNames, max)
		minVersion <- as.character(structure(v, class = class(minVersion)))
		names(minVersion) <- names(v)
	}
	pkgs <- names(minVersion)

	i.skip <- !(pkgs %in% skip)
	pkgs <- pkgs[i.skip]
	minVersion <- minVersion[i.skip]
	pkgFiles <- pkgFiles[i.skip]

	## Needed because of dependency errors during a fresh installation...
	pkgs <- pkgs[order(match(pkgs,
		c("svMisc", "svSocket","svHttp", "svKomodo")))]

	## The lock file avoids starting several instances of R in a row
	path0 <- getwd()
	lockfile <- file.path(path0, "00LOCK")
	if (file.exists(lockfile)) {
		## We can safely assume that running svStart will not take more than
		## 5 minutes, if 00LOCK is older, it means something went wrong
		## previously, so we simply disregard it!
		if(difftime(Sys.time(), file.info(lockfile)[,"mtime"],
			units = "mins") < 5) {
			return (invisible(NULL))
		} else {
			file.remove(lockfile)
		}
	}
	file.create(lockfile)
	on.exit({
		file.remove(lockfile)
		## Self-destruction
		if(exists("svStart", envir = parent.frame(), inherits = TRUE))
			rm("svStart", envir = parent.frame(), inherits = TRUE)
		debugMsg("svStart exit")
	}) # Clean up

	if (debug) {
		"debugMsg" <- function (...) cat("DEBUG:", ..., "\n")
	} else {
		"debugMsg" <- function (...) {};
	}

	## Return if any of the sv* packages already loaded and Rserver running
	if (any(c("package:svHttp", "package:svSocket", "package:svKomodo",
		"package:svMisc") %in% search()) && existsFunction("getSocketServers")
		&& !is.na(getSocketServers()["Rserver"])) {
		invisible(return(NA))
	}

	## First of all, check R version... redefine compareVersion() because it is
	## not defined in very old R versions... and thus we don't get an explicit
	## error message in that particular case
	if (!existsFunction("compareVersion")) {
		"compareVersion" <- function (a, b) {
			a <- as.integer(strsplit(a, "[\\.-]")[[1]])
			b <- as.integer(strsplit(b, "[\\.-]")[[1]])
			for (k in 1:length(a)) {
				if (k <= length(b)) {
					if (a[k] > b[k]) return(1)
					else if (a[k] < b[k]) return(-1)
				} else return(1)
			}
			if (length(b) > length(a)) return(-1) else return(0)
		}
	}
	rVersion <- as.character(getRversion())
	res <- compareVersion(rVersion, minRVersion)
	if (res < 0) {
		res <- FALSE
		cat("R is too old for this version of SciViews (R >=",
			minVersion["R"], "is needed), please, upgrade it\n",
			file = stderr())
	} else res <- TRUE

	## Load main R packages
	## (tools added to the list because now required by svMisc)
	res <- all(sapply(c("methods", "datasets", "utils", "grDevices", "graphics",
		"stats", "tools"), function (x)
		require(x, quietly = TRUE, character.only = TRUE)))

	## Get environment variables
	if (res) {
		"svOption" <- function (arg.name,
		envName = gsub("\\.(\\w)", "\\U\\1", arg.name, perl = TRUE),
		default = NA, as.type = as.character, args = commandArgs(), ...) {
			pfx <- paste("^--", arg.name, "=", sep = "")
			x <- args[grep(pfx, args)]
			x <- if (!length(x)) Sys.getenv(envName) else sub(pfx, "", x)
			x <- as.type(x, ...)
			if (is.na(x) || x == "") x <- default
			x <- structure(list(x), names = arg.name)
			do.call("options", x)
			return(x)
		}

		args <- commandArgs()
		## If started --quiet, display a simplified message but not if started
		## -q, so that the user can still make it fully quiet!
		par <- args[grep("^--quiet$", args)]
		if (length(par) > 0) cat(R.version.string, "\n",
			sep = "", file = stderr())

		## Get SciViews socket client/server config from command line or vars
		## Type of server to use (either http or socket)
		svOption("ko.type", default = "socket", args = args)
		## Port used by the R socket server
		svOption("ko.serve", default = 8888, args = args, as.type = as.integer)
		## Machine where Komodo is running
		svOption("ko.host", default = "localhost", args = args)
		## Port used by the Komodo socket server
		svOption("ko.port", default = 7052, args = args, as.type = as.integer)
		## The id used by Komodo
		svOption("ko.id", default = "SciViewsK", args = args)
		## Which type of Komodo server do we use?
		svOption("ko.kotype", default = "file", args = args)
		## Do we reactivate Komodo?
		svOption("ko.activate", default = FALSE, args = args,
			as.type = as.logical)
		## The id used for this R kernel in Komodo
		svOption("R.id", envName = "Rid", default = "R", args = args)
		## If initial directory is "", or it does not exist or it is not a dir
		## we use the default home directory instead!
		## The initial directory to use for R
		## Note: initial directory is used to load/save workspace and history
		svOption("R.initdir", envName = "Rinitdir", default = "~",
			args = args, as.type = function (x, default.dir) {
				if (x == "" || !file.exists(x) || !file.info(x)$isdir) {
					return (NA)
				} else {
					return(x)
				}
			}
		)
		svOption("width", default = getOption("width", 80), args = args,
			as.type = as.integer)
		svOption("OutDec", default = getOption("OutDec", "."), args = args)
		svOption("OutSep", default = getOption("OutSep", ","), args = args)
	}
	## If ko.type is not socket, we don't load svSocket
	ko.type <- getOption("ko.type")
	if (ko.type != "socket")
		pkgsDontLoad <- c(pkgsDontLoad, "svSocket")
	
	## If ko.type is not http, we don't load svHttp
	if (ko.type != "http")
		pkgsDontLoad <- c(pkgsDontLoad, "svHttp")

	## Load tcltk package (if we use the socket server only)
	if (res && ko.type == "socket") {
		if (capabilities("tcltk")) {
			## Make sure tcltk can start: on Mac OS X < 10.5 only,
			## that is, darwin < 9, we need to check that X11 is installed
			## (optional component!) and started!
			## But this is not needed any more for R >= 2.8.0. Before we
			## activate this test, we must find a way to start Tk later,
			## when tktoplevel() is first invoked!
			#if (compareVersion(rVersion, "2.8.0") < 0) {
			if (regexpr("^darwin[5-8]", R.Version()$os) > -1) {
				## First, is the DISPLAY environment variable defined?
				dis <- Sys.getenv("DISPLAY")
				if (dis == "") {
					Sys.setenv(DISPLAY = ":0")	# Local X11
					dis <- Sys.getenv("DISPLAY")
				}
				## Second, if DISPLAY points to a default local X11, make sure
				## X11 is installed and started on this machine
				if (dis %in% c(":0", ":0.0", "localhost:0", "localhost:0.0",
					"127.0.0.1:0", "127.0.0.1:0.0")) {
					## X11 is optional on Mac OS X 10.3 Panther and 10.4 Tiger!
					## We locate 'open-x11' and run it,... not X11 directly!
					if (length(system('find /usr/bin/ -name "open-x11"',
						intern = TRUE)) == 0){
						cat("'open-x11' not found. Make sure you installed X11\n",
							file = stderr())
						cat("(see http://developer.apple.com/opensource/tools/",
							"runningx11.html\n", sep = "", file = stderr())
						res <- FALSE
					} else { # Make sure X11 is started
						## Trick: we try opening a non X11 prog,
						## effect is starting X11 alone
						system("open-x11 more", intern = TRUE)
					}
				}
				rm(dis)
			}

			if (res) {
				res <- suppressPackageStartupMessages(
					require(tcltk, quietly = TRUE))
				if (!res) {
					cat("Error starting tcltk. Make sure Tcl/Tk is installed ",
						"and can\nbe run on your machine. Then, with packages ",
						"svMisc, svSocket\nand svGUI installed, restart R or ",
						"type require(svGUI)\n", sep = "", file = stderr())
				}
			}
		} else cat("Tcl/Tk is required by SciViews,\n",
				"but it is not supported by this R installation\n",
				file = stderr())
	} else if (!res)
		cat("Problem loading standard R packages, check R installation\n",
			file = stderr())

	if (res) {
		## Load packages svMisc, svSocket, svHttp & svKomodo (possibly after
		## installing or upgrading them). User is supposed to agree with this
		## install when he tries to start and configure R from Komodo Edit
		#pkgs <- names(minVersion)
		#pkgs <- pkgs[!(pkgs %in% "R")]

		#ext <- switch(.Platform$pkgType, # There is a problem on some Macs
		#	# => always install from sources there! mac.binary = "\\.tgz",
		#	win.binary = "\\.zip", "\\.tar\\.gz")
		typ <- switch(.Platform$pkgType, # There is a problem on some Macs
			# => always install from sources there! mac.binary = "\\.tgz",
			win.binary = "win.binary", "source")

		## Find a library location with write access, usually, last item in the
		## list is fine
		lib <- .libPaths()
		k <- file.access(lib, 2) == 0
		if (!any(k)) {
			## If nothing is available to user, create user library location
			lib <- Sys.getenv("R_LIBS_USER")[1L]
			dir.create(lib, recursive = TRUE)
			## Update library paths
			.libPaths(lib)
		} else {
			lib <- tail(lib[k], 1)
		}

		debugMsg("Installing packages if needed:")
		sapply(pkgs, function (pkgName) {
			debugMsg("Now trying package:", pkgName)
			pkgFile <- dir(path = pkg.dir, pattern = sprintf("%s_.*\\.%s",
				pkgName, pkg.extpat))

			if (length(file) > 0) {
				pkgVersion <- gsub(sprintf("(^%s_|\\.%s$)", pkgName,
					pkg.extpat), "", basename(pkgFile))
				i <- order(package_version(pkgVersion), decreasing = TRUE)[1]
				pkgFile <-  pkgFile[i]
				pkgVersion <-  pkgVersion[i]

				## For some reasons (bug probably?) I cannot install a package
				## in R 2.10.1 under Mac OS X when the path to the package has
				## spaces. Also, correct a bug here when installing package
				## from a repository where we are not supposed to prepend a
				## path! Copy the file temporarily to the temp dir
				sourcefile <- file.path(pkg.dir, pkgFile)
				file <- file.path(tempdir(), pkgFile)
				repos <- NULL

				## Remove directory lock if exists (happens sometimes on linux)
				if (.Platform$OS.type == "unix") {
					system(paste("rm -r -f", file.path(lib, "00LOCK")))
				}
			} else {
				## No packages found, download from the web
				sourcefile <- NULL
				pkgFile <- pkgName
				repos <- remote.repos
			}

			#desc <- suppressWarnings(
			#	system.file("DESCRIPTION", package = pkgName))
			pkgIsInstalled <- pkgName %in% installed.packages()[, 1]

			if (!pkgIsInstalled || compareVersion(packageDescription(pkgName,
				fields = "Version"), minVersion[pkgName]) < 0) {
				if (!pkgIsInstalled) {
					cat("Installing missing package", sQuote(pkgName),
						paste("(version", pkgVersion, ")", sep = ""),
						"into", sQuote(lib), "\n")
				} else {
					cat("Updating package", sQuote(pkgName), "to version",
						pkgVersion, "\n")
				}
				## Copy the install file to the temporary directory
				if (!is.null(sourcefile))
					try(invisible(file.copy(sourcefile, file)))
				## Install or update the package
				try(install.packages(file, lib = lib, repos = repos,
					type = typ))
				## Erase the temporary file
				try(unlink(file), silent = TRUE)
			} else {
				debugMsg("Package", pkgName, "is up to date")
			}
		}) # End installing packages

		## Determine which packages we don't want to load
		pkgs <- pkgs[!(pkgs %in% pkgsDontLoad)]

		## Split pkgs to primary and secondary
		pkgsPrimary <- pkgs[!(pkgs %in% pkgsLast)]
		pkgsSecondary <- pkgs[pkgs %in% pkgsLast]

		## Do not load svKomodo yet
		res <- sapply(pkgsPrimary, function(pkgName)
			require(pkgName, quietly = TRUE, character.only = TRUE))

		if (!all(res)) {
			cat("Problem loading package(s):", paste(pkgsPrimary[!res],
				collapse = ", "), "\n", file = stderr())
		} else {
			if (ko.type == "socket") {
				## Try starting the R socket server now
				res <- !inherits(try(startSocketServer(port =
					getOption("ko.serve")), silent = TRUE), "try-error")
				debugMsg("Starting *socket* server")
			} else res <- TRUE

			if (!res) {
				cat("Impossible to start the SciViews R socket server\n(socket",
					getOption("ko.serve"), "already in use?)\n",
					file = stderr())
				cat("Solve the problem, then type: require(svSocket)\n",
					file = stderr())
				cat("or choose a different port for the server in Komodo\n",
					file = stderr())
			} else {
				## Finally, load svKomodo and SciViews
				res <- sapply(pkgsSecondary, function(pkgName)
					require(pkgName, quietly = TRUE, warn.conflicts = FALSE,
						character.only = TRUE))

				if (all(res)) {
					if (ko.type == "http") {
						## It is now time to start the HTTP server
						res <- !inherits(try(startHttpServer(port =
							getOption("ko.serve")), silent = TRUE),
							"try-error")
						debugMsg("Starting *http* server")
					} else res <- TRUE

					if (!all(res)) {
						cat("Cannot start the SciViews R HTTP server\n(port",
							getOption("ko.serve"), "already in use?)\n",
							file = stderr())
						cat("Solve the problem, then type: require(svHttp)\n",
							file = stderr())
						cat("or choose a different port for the server",
							"in Komodo\n", file = stderr())
					} else {
						cat("R is SciViews ready!\n", file = stderr())
						assignTemp(".SciViewsReady", TRUE)
					}

					## Indicate what we have as default packages
					if (ko.type == "http") {
						options(defaultPackages =
							unique(c(getOption("defaultPackages"), pkgs)))
					} else {
						options(defaultPackages =
							unique(c(getOption("defaultPackages"),
							"tcltk", pkgs)))
					}
				} else {
						cat("R is not SciViews ready, install latest",
						paste(pkgs, collapse = ", "), "packages\n",
						file = stderr())
				}
			}
		}
	}
	res <- all(res)	# All packages are loaded

	if (res) {
		## Make sure Komodo is started now
		## Note: in Mac OS X, you have to create the symbolic link manually
		## as explained in the Komodo Help with:
		## sudo ln -s "/Applications/Komodo Edit.app/Contents/MacOS/komodo" \
		##	/usr/local/bin/komodo
		## You must issue something similar too under Linux
		## (see Komodo installation guide) or the script will complain.
		if (Sys.getenv("koAppFile") != "") {
			Komodo <- Sys.getenv("koAppFile")
		} else Komodo <- ""

		if (Komodo != "") debugMsg("path to Komodo was passed in environment")

		## Look if and where komodo is installed
		if (.Platform$OS.type == "unix") {
			if (Komodo == "")
				Komodo <- "/usr/local/bin/komodo" # Default location
			if (!file.exists(Komodo)) {
				Komodo <- Sys.which("komodo")[1]
				debugMsg("which", "returned", Komodo)
			}

			isMac <- function () (grepl("^mac", .Platform$pkgType))
			if (length(Komodo) == 0 || Komodo == "") {
				if (!isMac()) {
					isLocate <- suppressWarnings(length(system('which locate',
						intern = TRUE)) > 0)
					if (!isLocate) { # locate is not there
						Komodo <- NULL
					} else {
						Komodo <- try(suppressWarnings(system(paste(
							"locate --basename -e --regex ^komodo$",
							"| grep -vF 'INSTALLDIR' | grep -F 'bin/komodo'",
							"| tail --lines=1"), intern = TRUE, ignore.stderr = TRUE)),
							silent = TRUE)
						debugMsg("locate komodo", "returned", Komodo)
					}
				} else Komodo <- NULL
			}

		} else { # Windows
		    ## If komodo path was not passed in environment
			if (Komodo == "") {
				Komodo <- NULL
				## On Windows, 'komodo' should be enough
				## But for reasons that escape me, Komodo seems to stip off its
				## own directory from the path variable. So, I have to restore
				## it from the Windows registry :-(

				## Try several ways to get Komodo path from registry.
				key <- paste("SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\",
					"App Paths\\komodo.exe", sep = "")
				Komodo <-
					tryCatch(readRegistry(key, hive = "HLM")[["(Default)"]],
					error = err.null)

				if (is.null(Komodo) || !file.exists(Komodo)) {
					key <- "Applications\\komodo.exe\\shell\\open\\command"
					Komodo <-
						tryCatch(readRegistry(key, hive = "HCR")[["(Default)"]],
							error = err.null)
					if (!is.null(Komodo))
						Komodo <- sub(" *\\\"%[1-9\\*].*$", "", Komodo)
				}

				if (is.null(Komodo) || !file.exists(Komodo)) {
					key <- paste("SYSTEM\\CurrentControlSet\\Control\\",
						"Session Manager\\Environment", sep = "")
					Path <-
						tryCatch(readRegistry(key, hive = "HLM")$Path,
							error = err.null)
					if (!is.null(Path) && !is.na(Path) && Path != "") {
						Path <- strsplit(Path, ";")[[1]]
						Path <- Path[sapply(Path,
							function (x)
								file.exists(file.path(x, "komodo.exe")))][1]
						Komodo <- gsub("\\\\+", "\\\\", file.path(Path,
							"komodo.exe", fsep = "\\"))
					}
				}
				debugMsg("Komodo searched for in registry in", key)
			}
			debugMsg("Komodo path is:", Komodo)
		}

		if (length(Komodo) && Komodo != "" && file.exists(Komodo)) {
			## Change the editor and the pager to Komodo
			options(pager2 = getOption("pager"))
			## A custom pager consists in displaying the file in Komodo
			svPager <- function (files, header, title, delete.file) {
				require(svKomodo)
				files <- gsub("\\", "\\\\", files[1], fixed = TRUE)
				res <- tryCatch(koCmd(sprintf('sv.r.pager("%s", "%s")', files, title)),
					error = function (e) return(FALSE))
				if (res == FALSE) {
					## Try using pager2 instead
					pager2 <- getOption("pager2")
					if (is.null(pager2)) {
						stop("You must start Komodo Edit for displaying this file!")
					} else if (is.function(pager2)) {
						pager2(files = files, header = header, title = title,
							delete.file = delete.file)
					} else {
						## Replacement for the following line of code to avoid
						## using .Internal()
						#.Internal(file.show(files, header, title, delete.file, pager2))
						file.show(files, header = header, title = title,
							delete.file = delete.file, pager = pager2)						
					}
				} else {
					if (delete.file) {
						cmd <- paste('window.setTimeout("try { ',
							'sv.tools.file.getfile(\\"%s\\").remove(false); } ',
							'catch(e) {}", 10000);', sep = "")
						koCmd(sprintf(cmd, files))
					}
				}
			}

			options(browser2 = getOption("browser"))
			svBrowser <- function (url) {
				require(svKomodo)
				url <- gsub("\\", "\\\\", url, fixed = TRUE)
				## If the URL starts with '/', I could safely assume a file path
				## on Unix or Mac and prepend 'file://'
				url <- sub("^/", "file:///", url)
				res <- tryCatch(koCmd(sprintf("sv.command.openHelp(\"%s\")", url)),
					error = function (e) return(FALSE))
				if (res == FALSE) {
					## Try using browser2 instead
					browser2 <- getOption("browser2")
					if (is.null(browser2)) {
						stop("You must start Komodo Edit for browsing files")
					} else browseURL(url, browser = browser2)
				}
			}
			options(editor2 = getOption("editor"))
			options(editor = Komodo, browser = svBrowser, pager = svPager)
		} else {
			Komodo <- NULL
			cat("R cannot find Komodo.", file = stderr())
			if (.Platform$OS.type == "unix") {
				cat("Please, follow instructions at",
					"http://www.sciviews.org/SciViews-K to install it",
					"correctly. In particular, you must create a symbolic",
					"link in /user/local/bin: sudo ln -s",
					"<KomodoBinLocation>/komodo /usr/local/bin/komodo",
					"otherwise, R cannot find it!", sep = "\n", file = stderr())
			} else {
				cat("Please, make sure you install it correctly\n",
					"You can find it at",
					"http://www.activestate.com/Products/komodo_edit.\n",
					file = stderr())
			}
		}

		## Make sure we use HTML help (required for Alt-F1 and Alt-Shift-F1)
		## to display R help in Komodo Edit
		## (in Windows, chmhelp is the default up to R 2.9.2)
		##Old code: if (.Platform$OS.type == "windows") options(chmhelp = FALSE)
		##Old code: options(htmlhelp = TRUE)
		## In R 2.10, help system is completely changed
		options(help_type = "html")
		## Make sure the help server is started
		port <- try(tools::startDynamicHelp(), silent = TRUE)
		if (inherits(res, "try-error"))
			port <- try(tools::startDynamicHelp(NA), silent = TRUE)
		## Record the home page for the help server in an option
		options(helphome = paste("http://127.0.0.1:", port,
			"/doc/html/index.html", sep = ""))

		## I need to get the help file URL, but help() does not provide it any
		## more! This is a temporary workaround for this problem
		assignTemp("getHelpURL", function (x, ...) {
			file <- as.character(x)
			if (length(file) == 0) return("")
			## Extension ".html" may be missing
			htmlfile <- basename(file)
			if (R.Version()$`svn rev` >= 67550) {
				port <- tools::startDynamicHelp(NA)
			} else {
				port <- getNamespace("tools")$httpdPort
			}
			if (length(file) > 1) {
				## If more then one topic is found
				return(paste("http://127.0.0.1:", port,
					"/library/NULL/help/", attr(x,"topic"), sep = ""))
			} else {
				if(substring(htmlfile, nchar(htmlfile) -4) != ".html")
					htmlfile <- paste(htmlfile, ".html", sep="")
				return(paste("http://127.0.0.1:", port,
				"/library/", basename(dirname(dirname(file))),
				"/html/", htmlfile, sep = ""))
			}
		})

## print() method of object returned by help() is very unflexible for R.app and
## does not allow in any way to use anything else than the R.app internal
## browser for help!!!
## That makes me very unhappy! Hey guys, I would like to use SciViews help
## browser here! So, no other solution than to be even harsher, and to force
## rewriting of the print function in base environment!!!
## (problem emailed to Simon Urbanek on 03/11/2009... I hope he will propose
## a work-around for this in R 2.12!!!)
#if (compareVersion(rVersion, "2.11.0") < 0) {
#	source("print.help_files_with_topic210.R")
#} else if (compareVersion(rVersion, "2.14.0") < 0) {
#	source("print.help_files_with_topic211.R")
#} else {
#	source("print.help_files_with_topic214.R")
#}
## In case we are in R.app, install our own browser
if (.Platform$GUI == "AQUA") {
	guiTools <- as.environment("tools:RGUI")
	guiTools$aqua.browser2 <- guiTools$aqua.browser
	guiTools$aqua.browser <- getOption("browser")
}

		## Change the working directory to the provided directory
		try(setwd(getOption("R.initdir")), silent = TRUE)

		## Create a .Last.sys function that clears some variables in .GlobalEnv
		## and then, switch to R.initdir before closing R. The function is
		## stored in TempEnv()
		assignTemp(".Last.sys", function () {
			## Eliminate some known hidden variables from .GlobalEnv to prevent
			## saving them in the .RData file
			if (exists(".required", envir = .GlobalEnv, inherits = FALSE))
				rm(.required, envir = .GlobalEnv, inherits = FALSE)
			## Note: .SciViewsReady is now recorded in TempEnv() instead of
			## .GlobalEnv, but we leave this code for old workspaces...
			if (exists(".SciViewsReady", envir = .GlobalEnv, inherits = FALSE))
				rm(.SciViewsReady, envir = .GlobalEnv, inherits = FALSE)
			## If a R.initdir is defined, make sure to switch to it, so that
			## the session's workspace and command history are written at the
			## right place (in case of error, no change is made!)
			try(setwd(getOption("R.initdir")), silent = TRUE)
			## Clean up everything in Komodo
			tryCatch(
				svKomodo::koCmd("window.setTimeout(\"sv.r.closed();\", 1000);"),
				error = function (e) invisible(NULL))
		})

		msg <- paste("Session directory is", dQuote(getOption("R.initdir")))
		msg2 <- NULL

		## Do we load .RData and .Rhistory now?
		if (!"--vanilla" %in% args && !"--no-restore" %in% args &&
			!"--no.restore-data" %in% args) {
				if (file.exists(".RData")) {
					load(".RData", envir = .GlobalEnv)
					msg2 <- append(msg2, "data loaded")
				} else {
					msg2 <- append(msg2, "no data")
				}

				if (file.exists(".Rhistory")) {
					## On R Tk gui:
					## "Error in loadhistory(file): no history available"
					## So, do it inside a try()
					history.loaded <- try(loadhistory(), silent = TRUE)
					if (inherits(history.loaded, "try-error"))  {
						msg2 <- append(msg2, "history cannot be loaded")
					} else {
						msg2 <- append(msg2, "history loaded")
					}
				} else {
					msg2 <- append(msg2, "no history")
				}
		} else {
			msg2 <- append(msg2, "data and history not loaded")
		}

		cat(msg, " (", paste(msg2, collapse = ", "),  ")", "\n",
			sep = "", file = stderr())

		## Do we reactivate Komodo now?
		koact <- getOption("ko.activate")
		debugMsg("Reactivate Komodo:", koact)
		if (getTemp(".SciViewsReady", FALSE) && koact) {
			if ((.Platform$pkgType == "mac.binary")) {
				system("osascript -e 'tell application \"Komodo\" to activate'",
					wait = FALSE)
			} else if (!is.null(Komodo)) {
				## TODO: The following starts komodo if not started yet,
				## but does not activate it!
				system(shQuote(Komodo), wait = FALSE)
			}
			## Indicate to Komodo that R is ready
			## and test also communication from R to Komodo!
		#	koCmd('sv.cmdout.message("<<<data>>>", 10000, true);',
		#		data = paste("'", getOption("R.id"), "' (R ",
		#		R.Version()$major, ".", R.Version()$minor,
		#		") connected. Session dir: ",
		#		path.expand(getOption("R.initdir")), sep = ""))
			## ... and refresh the object explorer
			## TODO!
			
			## Differ synching R <-> Komodo to avoid deadlock situation
			# That does not work!
			#koCmd(paste('window.setTimeout("sv.r.objects.getPackageList(true,',
			#	'true, true);", 500)', sep = ""))
			#koCmd('window.setTimeout("sv.r.test(true, true);", 500)')
		}
		## Update info in Komodo
		#debugMsg("Contacting Komodo with koCmd")
		#invisible(koCmd(paste(
		#	"sv.socket.rUpdate()",
		#	"sv.cmdout.append('R is started')",
		#	"sv.command.updateRStatus(true)",
		#	sep = ";"))
		#)
		## Refreshing Komodo's GUI elements
		try(koCmd(paste('sv.r.running = true; sv.socket.charset = "',
			localeToCharset()[1],
			'"; sv.cmdout.message("' , R.version.string, ' is ready!");',
			' window.setTimeout("sv.r.objects.getPackageList(true, true,',
			' true);", 1000);', sep = "")), silent = TRUE)
		#try(koRefresh(force = TRUE), silent = TRUE)
	}
	
	## Save the whole config
	.SciViewsConfig <- list()
	.SciViewsConfig$ko.type <- getOption("ko.type")
	.SciViewsConfig$ko.host <- getOption("ko.host")
	.SciViewsConfig$ko.port <- getOption("ko.port")
	.SciViewsConfig$ko.kotype <- getOption("ko.kotype")
	.SciViewsConfig$ko.serve <- getOption("ko.serve")
	.SciViewsConfig$ko.activate <- getOption("ko.activate")
	.SciViewsConfig$ko.id <- getOption("ko.id")
	.SciViewsConfig$R.id <- getOption("R.id")
	.SciViewsConfig$R.initdir <- getOption("R.initdir")
	.SciViewsConfig$width <- getOption("width")
	.SciViewsConfig$OutDec <- getOption("OutDec")
	.SciViewsConfig$OutSep <- getOption("OutSep")
	## Save this to a file...
	save(.SciViewsConfig, file = "~/.SciViewsConfig.RData")
	
	## Do we have a .Rprofile file to source?
	rprofile <- file.path(c(getwd(), Sys.getenv("R_USER")), ".Rprofile")
	rprofile <- rprofile[file.exists(rprofile)][1]
	if (!is.na(rprofile)) {
		source(rprofile)
		debugMsg("Loaded file:", rprofile)
	}
	
	return(invisible(res))
}
