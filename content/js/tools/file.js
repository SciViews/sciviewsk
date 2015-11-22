// SciViews-K file related functions
// Various file related functions in 'sv.tools.file' namespace
// Copyright (c) 2008-2010, Kamil Barton
// License: MPL 1.1/GPL 2.0/LGPL 2.1
////////////////////////////////////////////////////////////////////////////////
// sv.tools.file.defaultEncoding;  // Default file encoding to use (utf8 by def)
// sv.tools.file.TYPE_DIRECTORY;   // Type of file... dir, file or none
// sv.tools.file.TYPE_FILE;
// sv.tools.file.TYPE_NONE;
// sv.tools.file.read(filename, encoding);	// Read a file with encoding
// sv.tools.file.write(filename, content, encoding, append);
//                                 // Write in a file with encoding
// sv.tools.file.exists(file); 	   // Checks for file existence, returns 2 for
//                                    directory, 1 for file, otherwise 0
// sv.tools.file.exists(file); 	   // Alternate version of file.exists()
// sv.tools.file.temp(prefix);	   // Creates unique temporary file, accessible
//									  by all users, and returns its name
// sv.tools.file.specDir(dirName)  // Translate special directory name
// sv.tools.file.getfile(baseDir, [pathComponents]);
//                                 // Create nsILocalFile object from array
//                                    and/or special dir name
// sv.tools.file.path(...); 	   // Create path from concatenated arguments:
//                                    - special directory names are translated,
//                                    - relative paths are expanded.
// sv.tools.file.getURI(file);     // Get an URI for an file
// sv.tools.file.readURI(uri);	   // Read data from an URI
// sv.tools.file.pathFromURI(uri); // Converts an URI to local path
// sv.tools.file.list(dirname, pattern, noext);
//                                 // List all files matching pattern in
//                                    dirname with(out) extension
// sv.tools.file.whereIs(appName); // Tries to find full application path,
//                                    returns null if not found
// sv.tools.file.getDir(path, isFile, createFile); // Make sure a dir exists
// sv.tools.file.zipUnpack(zipPath, targetDir); // Unzip a file
////////////////////////////////////////////////////////////////////////////////

if (typeof(sv) == 'undefined') var sv = {};

// Define the 'sv.tools' namespace
if (typeof(sv.tools) == 'undefined') sv.tools = {};
// Define the 'sv.tools.file' namespace
if (typeof(sv.tools.file) == 'undefined') sv.tools.file = {};

(function () {
	// Default file encoding to use
	var _this = this;
	this.defaultEncoding = "utf8";
	this.TYPE_DIRECTORY = 2;
	this.TYPE_FILE = 1;
	this.TYPE_NONE = 0;

	// Read a file with encoding
	this.read = function (filename, encoding) {
		if (!encoding) encoding = _this.defaultEncoding;
		var file = Components.classes["@mozilla.org/file/local;1"]
			.createInstance(Components.interfaces.nsILocalFile);
		var fis = Components.classes["@mozilla.org/network/file-input-stream;1"]
			.createInstance(Components.interfaces.nsIFileInputStream);
		var is = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
			.createInstance(Components.interfaces.nsIConverterInputStream);
		try {
			file.initWithPath(filename);
			fis.init(file, -1, -1, 0);
			is.init(fis, encoding, 1024, 0xFFFD);
			var ret = "";
			if (is instanceof Components.interfaces.nsIUnicharLineInputStream) {
				var str = {};
				var cont;
				do {
					cont = is.readString(4096, str);
					ret += str.value;
				} while (cont);
			}
		} catch (e) {
			sv.log.exception(e, "Error while trying to read " + filename, true);
		}
		finally {
			is.close();
			fis.close();
		}
		return(ret);
	}

	// Write in a file with encoding
	this.write = function (filename, content, encoding, append) {
		if (!encoding) encoding = _this.defaultEncoding;
		append = append? 0x10 : 0x20;
		var file = Components.classes["@mozilla.org/file/local;1"]
			.createInstance(Components.interfaces.nsILocalFile);
		var fos = Components.classes["@mozilla.org/network/file-output-stream;1"]
			.createInstance(Components.interfaces.nsIFileOutputStream);
		var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
			.createInstance(Components.interfaces.nsIConverterOutputStream);
		// PR_CREATE_FILE = 0x08
		// PR_WRONLY 	  = 0x02
		// PR_APPEND 	  = 0x10
		// PR_TRUNCATE 	  = 0x20
		try {
			file.initWithPath(filename);
			fos.init(file, 0x08 | 0x02 | append, -1, 0);
			os.init(fos, encoding, 0, 0x0000);
			os.writeString(content);
		} catch (e) {
			sv.log.exception(e, "Error while trying to write in " + filename +
				" (sv.tools.file.write)", true)
		} finally {
			os.close();
		}
	}

	// Check for file existence, returns 2 for dir, 1 for file, otherwise 0
	this.exists = function (path) {
		var file = Components.classes["@mozilla.org/file/local;1"]
			.createInstance(Components.interfaces.nsILocalFile);
		try {
			file.initWithPath(path);
		} catch(e) { return(_this.TYPE_NONE); }

		if (file.exists()) {
			if (file.isDirectory()) {
				return(_this.TYPE_DIRECTORY);
			} else if (file.isFile()) {
				return(_this.TYPE_FILE);
			}
		}
		return(_this.TYPE_NONE);
	}

	this.exists2 = function (path) {
		var sysutils = Components.classes['@activestate.com/koSysUtils;1']
			.getService(Components.interfaces.koISysUtils);

		if (sysutils.IsDir(path)) return(_this.TYPE_DIRECTORY);
		if (sysutils.IsFile(path)) return(_this.TYPE_FILE);
		return(_this.TYPE_NONE);
	}

	// Create unique temporary file, accessible by all users; returns its name
	this.temp = function (prefix) {
		var nsIFile = Components.interfaces.nsIFile;
		var dirSvc = Components.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties);
		var tempDir = dirSvc.get("TmpD", nsIFile).path;
		var tmpfile = Components.classes["@mozilla.org/file/local;1"]
			.createInstance(Components.interfaces.nsILocalFile);
		if (!prefix) prefix = "svtmp";
		tmpfile.initWithPath(tempDir);
		tmpfile.append(prefix)
		tmpfile.createUnique(nsIFile.NORMAL_FILE_TYPE, 0777);
		return(tmpfile.path);
	}

	// ProfD = profile dir, DefProfRt = user like/root/.mozilla,
	// UChrm = %profile%/chrome, DefRt = %installation%/defaults,
	// PrfDef = %installation%/defaults/pref, Home = OS root,
	// TmpD = OS tmp, Desk = desktop dir, etc.
	this.specDir = function (dirName) {
		var file;
		if (dirName == "~")
			dirName = (navigator.platform.indexOf("Win") == 0)? "Pers" : "Home";
		try {
			try {
				file = Components
					.classes["@mozilla.org/file/directory_service;1"]
					.getService(Components.interfaces.nsIProperties)
					.get(dirName, Components.interfaces.nsILocalFile)
					.path;
			} catch(e) {
				// If above fails, try Komodo directories too:
				var dirs = Components.classes['@activestate.com/koDirs;1']
					.getService(Components.interfaces.koIDirs);
				//PhG: this does not work any more on Komodo 8, but commenting
				// out this line leads to undefined as answer in case of a
				// wrong item => should be OK.
				//if (dirs.propertyIsEnumerable(dirName))
				file = dirs[dirName];
			}
		} catch(e) {}
		return(file ? file : dirName);
	}

	// Create nsILocalFile object from path
	// concatenates arguments if needed
	this.getfile = function (path) {
		path = _this.path.apply(_this, Array.apply(null, arguments));
		var file = Components.classes["@mozilla.org/file/local;1"]
			.createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(path);
		return(file);
	}

	// Concatenate the arguments into a file path
	// First element of a path can be a name of a special directory:
	// eg., "ProfD", "TmpD", "Home", "Pers", "Desk", "Progs".
	// For all possibilities, see reference at:
	// https://developer.mozilla.org/En/Code_snippets:File_I/O
	// Additionally, Komodo paths are translated:
	// "userDataDir", "supportDir", "hostUserDataDir", "factoryCommonDataDir",
	// "commonDataDir, "userCacheDir", "sdkDir", "docDir", "installDir",
	// "mozBinDir", "binDir", "pythonExe", "binDBGPDir", "perlDBGPDir" and
	// "pythonDBGPDir".
	// Leading "~" is expanded to a home dir ("My documents" on windows).
	// Following arguments can be specified as single array or string
	// example: sv.tools.file.path("~/workspace/dir1", "dir2", "file1.tmp")
	// would produce something like that:
	// "c:\users\bob\MyDocuments\workspace\dir1\dir2\file1.tmp"
	// "/home/bob/workspace/dir1/dir2/file1.tmp"
	this.path = function (path) {
		var os = Components.classes['@activestate.com/koOs;1']
			.getService(Components.interfaces.koIOs);
		var sep = os.sep;
		if (typeof path.join == "undefined")
			path = Array.apply(null, arguments);
		// 'flatten' the array:
		var res = [];
		for (var i in path) res = res.concat(path[i]);
		var dir0;
		path = res.join(sep);
		if (os.name == "nt") path = path.replace(/\/+/g, sep);
		dir0 = path.split(sep, 1)[0];
		path = sv.tools.file.specDir(dir0) + path.substring(dir0.length);
		path = os.path.abspath(os.path.normpath(path));
		return(path);
	}

	// Get an URI for a file
	this.getURI = function (file) {
		if (typeof file == "string") file = this.getfile(file);
		if (!file) return(null);
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService);
		var URL = ios.newFileURI(file);
		return(URL.spec);
	}

	// Read data from an URI
	this.readURI = function (uri) {
		var fileSvc = Components.classes["@activestate.com/koFileService;1"]
			.getService(Components.interfaces.koIFileService);
		var file = fileSvc.getFileFromURI(uri);
		if (file.open("r")) {
			var res = file.readfile();
			file.close();
			return(res);
		} else {
			return(undefined);
		}
	}

	// Read data from an URI
	this.pathFromURI = function (uri) {
		var fileSvc = Components.classes["@activestate.com/koFileService;1"]
			.getService(Components.interfaces.koIFileService);
		return(fileSvc.getFileFromURI(uri).path);
	}

	// List all files matching a given pattern in directory,
	// python interface - ~2x faster than with nsILocalFile
	this.list = function (dirname, pattern, noext) {
		var os = Components.classes['@activestate.com/koOs;1']
			.getService(Components.interfaces.koIOs);
		var ospath = os.path;

		if (ospath.exists(dirname) && ospath.isdir(dirname)) {
			var files = os.listdir(dirname, {});
			if (pattern) {
				var selfiles = [], file;
				for (var i in files) {
					file = files[i];
					if (file.search(pattern) != -1) {
						file = noext? file.substring(0, file.lastIndexOf("."))
							: file;
						selfiles.push(file);
					}
				}
				return(selfiles);
			} else {
				if (noext) {
					for (i in files)
						files[i] = ospath.withoutExtension(files[i]);
				}
				return(files);
			}
		} else {
			return(null);
		}
		return(null);
	}

	function _WhichAll (file) {
		var sysutils = Components.classes['@activestate.com/koSysUtils;1']
			.getService(Components.interfaces.koISysUtils);
		return(sysutils.WhichAll(file, {}));
	}

	// WhereIs is platform-dependent
	if (navigator.platform.indexOf("Win") == 0) {
		this.whereIs = function (appName, firstOne) {
			if (firstOne === undefined) firstOne = false;
			
			// Add default extension for executable if none
			if (appName.search(/\.[^\.]{3}$/) == -1) appName += ".exe";

			var reg = Components.classes["@mozilla.org/windows-registry-key;1"]
				.createInstance(Components.interfaces.nsIWindowsRegKey);
			var key, path;

			// Special treatment for R* apps:
			if (appName.match(/^R(?:gui|term|cmd)?\.exe$/i)) {
				try {
					key = "software\\R-core\\R";
					reg.open(reg.ROOT_KEY_LOCAL_MACHINE, key, reg.ACCESS_READ)
				} catch(e) {
					try {
						key = "software\\wow6432Node\\r-core\\r";
						reg.open(reg.ROOT_KEY_LOCAL_MACHINE, key, reg.ACCESS_READ);
					} catch(e) {
						return(null);
					}
				}
				if (!reg.hasValue("InstallPath") &&
					reg.hasValue("Current Version")) {
					reg = reg.openChild(reg.readStringValue("Current Version"),
						reg.ACCESS_READ);
				}

				var ret = [], ret2 = [];
				// Look for all installed paths, but default goes first
				if (reg.hasValue("InstallPath"))
					ret.push(reg.readStringValue("InstallPath"));

				for (var i = 0; i < reg.childCount; i ++) {
					var reg2 = reg.openChild(reg.getChildName(i), reg.ACCESS_READ);
					if (reg2.hasValue("InstallPath")) {
						path = reg2.readStringValue("InstallPath");
						if (ret.indexOf(path) == -1) ret.push(path);
					}
				}

				if (appName.search(/\.exe$/) == -1) appName += ".exe";
				var binDir = ["\\bin\\", "\\bin\\i386\\", "\\bin\\x64\\"];
				// From 2.12 R executables may reside also in bin/i386 directory
				// ... and 64-bit versions in bin/x64 directory

				for (var i in ret) {
					for (var j in binDir) {
						app = ret[i] + binDir[j] + appName;
						if (_this.exists(app)) {
							if (firstOne) {
								return(app);
							} else {
								ret2.push(app);
							}
						}
					}
				}
				return (ret2);
			}

			key = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\" +
				appName;
			try {
				reg.open(reg.ROOT_KEY_LOCAL_MACHINE, key, reg.ACCESS_READ);
				path = reg.readStringValue("");
				return(path.replace(/(^"|"$)/g, ""));
			} catch(e) {
				var key = "Applications\\" + appName + "\\shell\\Open\\Command";
				try {
					reg.open(reg.ROOT_KEY_CLASSES_ROOT, key, reg.ACCESS_READ);
					path = reg.readStringValue("");
					path = path.replace(/(^"+|"*\s*"%\d.*$)/g, "");
					return(path);
				} catch(e) {
					// Fallback: look for app in PATH
					return(_WhichAll(appName));
				}
			}
			return(null);
		}

	} else { // Not Windows
		this.whereIs = function (appName, firstOne) {
			if (firstOne === undefined) firstOne = false;
			var res = _WhichAll(appName);
			if (!res) return(null);
			if (firstOne) {
				return(res[0]);
			} else {
				return(res);
			}
		}
	}

	// Inspired by "getDir" function from nsExtensionManager...
	this.getDir = function (path, isFile, createFile) {
		var leaves = [], key = (isFile? path.parent : path);
		while (!key.exists() || !key.isDirectory()) {
			leaves.unshift(key.leafName);
			if (!key.parent) break;
			key = key.parent;
		}
		for (var i in leaves) {
			key.append(leaves[i]);
			key.create(key.DIRECTORY_TYPE, 0777);
		}
		if (isFile) {
			key.append(path.leafName);
			if (createFile && !key.exists())
				key.create(key.NORMAL_FILE_TYPE, 0777);
		}
		return(key);
	}

	// Unzip files
	this.zipUnpack = function (zipPath, targetDir) {
		var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
			.createInstance(Components.interfaces.nsIZipReader);
		zipReader.open(this.getfile(zipPath));
		var entries = zipReader.findEntries(null);
		var entryName, outFile, isFile;
		while (entries.hasMore()) {
			entryName = entries.getNext();
			outFile = this.getfile(targetDir, entryName);
			isFile = !(zipReader.getEntry(entryName).isDirectory);
			this.getDir(outFile, isFile, false);
			if (isFile) {
				try{ zipReader.extract(entryName, outFile); } catch(e) { }
			}
		}
		zipReader.close();
	}
	
}).apply(sv.tools.file);
