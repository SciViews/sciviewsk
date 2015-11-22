The .txt files contain manual compilation of icon lists to create.
The corresponding .html files are created using the makeIconGallery()
function from svIDE >= 0.9-49 R package. Here is a little R script to
build them all at once:

icndir <- "<icons directory>"
require(svIDE)
setwd(icndir)
lst <- list.files(pattern = "\\.txt$")
lst <- lst[lst != "readme.txt"]
for (f in lst) print(makeIconGallery(f))