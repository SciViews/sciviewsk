# R-Package manager helper functions
# These possibly should be included in svMisc in future

assignTemp("pkgManList", function(eol = "\n\n\n") {
	svtmp.ipkg <- as.data.frame(installed.packages(fields = c("Description"))
				[, c("Package", "Version", "Description", "Depends")])

	svtmp.ipkg$Loaded <- svtmp.ipkg$Package %in% .packages()

	if (!exists(".required"))
		.required <- logical(0)

	svtmp.ipkg$Required <- svtmp.ipkg$Package %in% .required

	print(write.table(svtmp.ipkg [, c("Package", "Version", "Description",
				"Loaded", "Required", "Depends")], eol="\n\n",
				na = "", sep="\t", quote=FALSE, row.names = FALSE,
				col.names = FALSE))
	invisible(NULL)
})

assignTemp("pkgManUpdatePkgs", function (lib.loc = .libPaths(), repos = getOption("repos"),
	  contriburl = contrib.url(repos, type), method,
	  available = available.packages(contriburl = contriburl, method = method),
	  instlib = update[, "LibPath"], ...,
	  checkBuilt = FALSE, type = getOption("pkgType")) {
		oldPkgs <- old.packages(lib.loc = lib.loc, contriburl = contriburl,
		method = method, available = available, checkBuilt = checkBuilt);
		return(oldPkgs)
})
