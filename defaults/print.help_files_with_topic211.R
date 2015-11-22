# print method of object returned by help() is very unflexible for R.app and
# does not allow in any way to use anything else than the R.app internal
# browser for help!!!
# That makes me very unhappy! Hey guys, I would like to use SciViews help
# browser here! So, no other solution than to be even harsher, and to force
# rewriting of the print function in base environment!!!
# (problem emailed to Simon Urbanek on 03/11/2009... I hope he will propose
# a work-around for this in R 2.12!!!)
unlockBinding("print.help_files_with_topic", env = baseenv())
assign("print.help_files_with_topic",
function (x, ...)
{
    browser <- getOption("browser")
    topic <- attr(x, "topic")
    type <- attr(x, "type")
	# This is the problematic code!
    #if (.Platform$GUI == "AQUA" && type == "html") {
    #    browser <- function(x, ...) {
    #        .Internal(aqua.custom.print("help-files", x))
    #        return(invisible(x))
    #    }
    #}
    paths <- as.character(x)
    if (!length(paths)) {
        writeLines(c(gettextf("No documentation for '%s' in specified packages and libraries:", 
            topic), gettextf("you could try '??%s'", topic)))
        return(invisible(x))
    }
    if (type == "html") 
        if (tools:::httpdPort == 0L) 
            tools::startDynamicHelp()
    if (attr(x, "tried_all_packages")) {
        paths <- unique(dirname(dirname(paths)))
        msg <- gettextf("Help for topic '%s' is not in any loaded package but can be found in the following packages:", 
            topic)
        if (type == "html" && tools:::httpdPort > 0L) {
            path <- file.path(tempdir(), ".R/doc/html")
            dir.create(path, recursive = TRUE, showWarnings = FALSE)
            out <- paste("<!DOCTYPE html PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\">\n", 
                "<html><head><title>R: help</title>\n", "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=\"UTF-8\">\n", 
                "<link rel=\"stylesheet\" type=\"text/css\" href=\"/doc/html/R.css\">\n", 
                "</head><body>\n\n<hr>\n", sep = "")
            out <- c(out, "<p>", msg, "</p><br>")
            out <- c(out, "<table width=\"100%\" summary=\"R Package list\">\n", 
                "<tr align=\"left\" valign=\"top\">\n", "<td width=\"25%\">Package</td><td>Library</td></tr>\n")
            pkgs <- basename(paths)
            links <- paste("<a href=\"http://127.0.0.1:", tools:::httpdPort, 
                "/library/", pkgs, "/help/", topic, "\">", pkgs, 
                "</a>", sep = "")
            out <- c(out, paste("<tr align=\"left\" valign=\"top\">\n", 
                "<td>", links, "</td><td>", dirname(paths), "</td></tr>\n", 
                sep = ""))
            out <- c(out, "</table>\n</p>\n<hr>\n</body></html>")
            writeLines(out, file.path(path, "all.available.html"))
            browseURL(paste("http://127.0.0.1:", tools:::httpdPort, 
                "/doc/html/all.available.html", sep = ""), browser)
        }
        else {
            writeLines(c(strwrap(msg), "", paste(" ", formatDL(c(gettext("Package"), 
                basename(paths)), c(gettext("Library"), dirname(paths)), 
                indent = 22))))
        }
    }
    else {
        if (length(paths) > 1L) {
            if (type == "html" && tools:::httpdPort > 0L) {
                browseURL(paste("http://127.0.0.1:", tools:::httpdPort, 
                  "/library/NULL/help/", topic, sep = ""), browser)
                return(invisible(x))
            }
            file <- paths[1L]
            p <- paths
            msg <- gettextf("Help on topic '%s' was found in the following packages:", 
                topic)
            paths <- dirname(dirname(paths))
            txt <- formatDL(c("Package", basename(paths)), c("Library", 
                dirname(paths)), indent = 22L)
            writeLines(c(strwrap(msg), "", paste(" ", txt), ""))
            if (interactive()) {
                fp <- file.path(paths, "Meta", "Rd.rds")
                tp <- basename(p)
                titles <- tp
                if (type == "html" || type == "latex") 
                  tp <- tools::file_path_sans_ext(tp)
                for (i in seq_along(fp)) {
                  tmp <- try(.readRDS(fp[i]))
                  titles[i] <- if (inherits(tmp, "try-error")) 
                    "unknown title"
                  else tmp[tools::file_path_sans_ext(tmp$File) == 
                    tp[i], "Title"]
                }
                txt <- paste(titles, " {", basename(paths), "}", 
                  sep = "")
                res <- menu(txt, title = gettext("Choose one"), 
                  graphics = getOption("menu.graphics"))
                if (res > 0) 
                  file <- p[res]
            }
            else {
                writeLines(gettext("\nUsing the first match ..."))
            }
        }
        else file <- paths
        if (type == "html") {
            if (tools:::httpdPort > 0L) {
                path <- dirname(file)
                dirpath <- dirname(path)
                pkgname <- basename(dirpath)
                browseURL(paste("http://127.0.0.1:", tools:::httpdPort, 
                  "/library/", pkgname, "/html/", basename(file), 
                  ".html", sep = ""), browser)
            }
            else {
                warning("HTML help is unavailable", call. = FALSE)
                att <- attributes(x)
                xx <- sub("/html/([^/]*)\\.html$", "/help/\\1", 
                  x)
                attributes(xx) <- att
                attr(xx, "type") <- "text"
                print(xx)
            }
        }
        else if (type == "text") {
            pkgname <- basename(dirname(dirname(file)))
            temp <- tools::Rd2txt(.getHelpFile(file), out = tempfile("Rtxt"), 
                package = pkgname)
            file.show(temp, title = gettextf("R Help on '%s'", 
                topic), delete.file = TRUE)
        }
        else if (type %in% c("ps", "postscript", "pdf")) {
            tf2 <- tempfile("Rlatex")
            tools::Rd2latex(.getHelpFile(file), tf2)
            .show_help_on_topic_offline(tf2, topic, type)
            unlink(tf2)
        }
    }
    invisible(x)
}, envir = baseenv())
lockBinding("print.help_files_with_topic", env = baseenv())
