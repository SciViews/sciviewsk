# S3 object: [[%ask1:Class]]
# Author:    [[%ask:Author]]

# Creator of the S3 object (usually, a function with the same name)
"[[%ask1]]" <- # S3 class
function () {
	# Code to create the object here...
	obj <- "[[%ask1]] object"
	class(obj) <- [[%ask1]]
	return(obj)
}

# Usual methods
"print.[[%ask1]]" <- # S3 method: print
function (x, ...) {
	# Code to print the object here...
	cat ("[[%ask1]] object printed\n")
	return(invisible(x))
}

"summary.[[%ask1]]" <- # S3 method: summary
function (object, ...)
	structure(object, class = c("summary.[[%ask1]]", class(object)))

"print.summary.[[%ask1]]" <- # S3 method: print.(summary)
function (x, ...) {
	# Code to print the summary of the object here...
	cat ("[[%ask1]] object summarized\n")
	return(invisible(x))
}

"plot.[[%ask1]]" <- # S3 method: plot
function (x, ...) {
	# Code to plot the object here...
	cat ("[[%ask1]] object plotted\n")
	invisible()
}

# Define a new generic...
"[[%ask2:NewMethod]]" <- # S3 generic
function (x, ...)
	NextMethod("[[%ask2]]")

# ... and use it
"[[%ask2]].[[%ask1]]" <- # S3 method: [[%ask2]]
function (x, ...) {
	# Code here...
}