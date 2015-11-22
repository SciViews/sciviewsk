# SciViews-K/Komodo R syntax lexer test
# Version 1.0, Ph. Grosjean (phgrosjean@sciviews.org)

## Quick overview ##############################################################
# Most features of the R syntax lexer are expressed here:
#! Shebang line, or R Wiki output style (same as string style)
`cube` <- function (x, na.rm = FALSE) {
    if (!is.numeric(x))
        stop("'x' must be a numeric vector")
    if (isTRUE(na.rm)) x <- x[!is.na(x)]
    return(x^3L)
}
cube(iris$Petal.Length, na.rm = TRUE)
base::ls()
base:::search()
# 1) Keywords, names, operators, strings and comments are colored differently
#    (depending on the color scheme you choose in Preferences... -> Editor ->
#    Fonts and Colors -> Lang-Specific -> R). Please, note that the 'Default'
#    mode of Komodo 5.x uses the same color for 'identifiers' and 'variables'.
#    Either switch to another mode, or customize it by changing the color of one
#    of these two styles to see all features discussed in this document!
# 2) Currently keywords is a fixed list of objects in recommended + SciViews
#    R packages (more dynamic choice planned for the future).
# 3) All R numbers are recognized, including complex, hex, etc.
# 4) List/data frames variables (like 'var' in l$var), S4 object slots (like
#    'slot' in obj@slot), function arguments (like 'x' or 'na.rm' here above)
#    and namespaces (like 'base::' or 'base:::' here above) are colored
#    differently. Also, using '=' for assignment instead of '<-' causes the
#    variable to be colored as a function argument. This is not a bug, but a
#    feature: it is there to show you the danger of using '=' for assignation.
#    But if you consistently use it, then syntax highlighting will be consistent
#    too in coloring assigned variables that way...
# 5) There are small vertical indentation marks (see after 'if (!is.numeric').
# 6) Move the cursor on top of parentheses or brackets and you will see the
#    bracket-matching feature coloring the pair of corresponding brackets.
# 7) There is automatic calculation of folding marks on pairs of '()' and '{}'.
#    Click on the little square with a minus sign in the margin in fromt of
#    `cube` <- .... and you fold the function body. Click again to unfold it.
#    There is also a manual folding tag: #{{ .... #}}, like hereunder.
# "Manual" folding indicator (so-called, "comment folding") section here:
#{{
# You can fold this content between the #{{ and #}} marks!   
#}}
# 8) Wrong characters in R strings are highlighted differently. For instance,
#    you are not supposed to use '\0' inside R strings, and R will end the
#    string there and will complain with a warning. The syntax lexer detects
#    such wrong characters and colorize them differently, like here:
stringWithNull <- 'A string with a null\0 character'
#    The same style is also used to colorize the end of invalid numbers:
10.5e-3iWrongNumberEnd + 1


## More extensive tests ########################################################

# Keywords & builtins should be highlighted in a specific color ("keywords")
c(TRUE, FALSE, NA)
ls.str
as.data.frame
as.data.frame.data.frame
# but not
nokeyword
NA_nokey_
mean.newobj
as.data.frame.myobj

# List components and S4 object slots are colored differently ("variables")
iris$Species
obj@slot
# ... even if the component has the same name as a keyword
mean
# but, different context, different style:
dat$mean

is.data.frame
# but
obj@is.data.frame

# Spaces are allowed and carriage return and/or comments too
# (note: ugly and not advised, but syntactically correct!)
iris      $     Species
iris$
                Petal.Length
iris      $ # Comment in between
    Sepal.Length
obj       @     slot <- NULL
obj@
    slot <- 1
obj   @ # Do not format code this way, although it is correct for the parser!
    slot

# When '$' or '@' are followed by something else than an identifier, it goes
# back to default mode and does not try to figure out if the syntax is correct
mydf$`item`; mydf$"item"; mydf$'item'  # These are correct constructions
mydf$["item"]; mydf$(1); mydf$1 # Incorrect but the lexer just goes on!

# Formula items are treated as usual identifiers/keywords/numbers/operators
# One could have used a special color to highlight a whole formula, but then,
# one looses the information about good/wrong numbers, or good/wrong use of
# keywords (here, we see that 'I()' is a known function, but 'cos' also,...
# and it would have been better to use a different variable name than 'cos').
lm(y ~ I(x^2) + cos * z^2 | w - 1, data = mydf)

# Named arguments are colorized in the right color, even if they match keywords:
mean
# or
file
# but
myfun(mean = 5, file = "temp")

# There is a special mode for function definition that does a pretty good job
# on finding and coloring the name of the defined arguments, even when the code
# spans on multiple lines and has various comments added, like here:
myfun2 <- function (  # A function doing something
    # The complete description of ''myfun2()'' that does something really very,
    # very useful!
    x,               # A matrix of numerical values
    y,               # Another matrix of numbers
    na.rm = FALSE,   # Do we eliminate missing data
    text = "string", # A string to use somewhere
    ...)             # Further arguments passed to the plot function

# More particularly, notice how 'x' is colored differently according to the
# context:
x <- 1 # Assignation with '<-'
foo <- function (x) # Here is an argument definition
    return(x) # Here it is the local variable inside my function
foo(x)  # Here, it is the variable 'x' provided for argument 'x = ', same as:
foo(x = x)
foo(x = 3) # Here the argument 'x' receives the value 3

# One bug that can hardly be corrected (but it occurs with a strange layout
# of the code, when the '=' sign is placed on another line). In the function
# definition, it works fine:
aa <- function (arg1
                  = 1,
                arg2 # Ugly, but valid R syntax!!!
                  = 2) return("hello!")
# But outside of function definition, named arguments are not colored correctly
# any more if the '=' sign is on another line:
aa(arg1 = 10, arg2
   = 11) #'arg1' color is correct, but not 'arg2'!

# Warning! The same 'arguments' color is used when one assign values to a
# variable using '=' instead of '<-' (this could be considered as a feature to
# warn user about ambiguity, providing that the "usual" assignation operator in
# R is '<-')
mydf <- data.frame(x = 1:10)
# fine, but
mydf = data.frame(x = 1:10)


# Namespaces and package names are also colored that way:
base::getwd()
stats:::t.test.default()
# Note that 't.test.default' is *not* colored as a keyword since it is not in
# the list of visible (exported) items!
# Spaces are allowed (but ugly, don't use!). Carriage return not allowed!
base      ::     search()
stats     :::    t.test.default()


# Numbers are colored differently
# All these numbers are correct
1; 10; 0.1; .1; 1e-7; 3E6; 2e; 3e+
# Numbers can be represented in hexadecimal notation
0x000ADFE; 0xa5b; 0x00aA3
# Numbers ending with 'L' are considered integers (possibly converted to
# integers with a warning by R)
10L; 1.1L; 1.L; 1e2L; 1.1e+3L; 1e-3L; 0xaDE012FL
# Numbers ending with 'i' are complex
2i; 4.1i; 13 + 12i; 1e-2i; 0x003i
# These numbers are incorrect (note that the end is colored as error)
4iL; 3Li; 0x001iL; 0x001Li; 0x00G3; 1e-0.9; 14e+3iVar 


# String (three types, surrounded by "", '' or ``, are recognized)
"This is a correct string"
'Idem'
`My unusual variable name!`
# Escaped quotes are correctly recognized
"This is \"quoted\" and correctly highlighted"
'This is \'quoted\' and correctly highlighted'
# Strings can span on multiple lines
"This is a
multiline
string"
# The R syntax lexer recognizes correct escapes
" Test of escapes \"\'\n\r\t\f\\\v\a\b\1\12\238\x1
\xA\xF5\x2a3\u0\uAF20\u{0AF1}\U13AFD\U{14530EFA}"
# But it colorizes differently wrong ones
"Wrong escapes \d\9\xS\uP\u{}\u{h}\uG\U{}\UY\U{h}\0
gffg\00dff\000fg\u{0AF1ddd2BF}fddf\U{14530EFA2}"


# Operators, all operators are detected:
1:5; 1 + 1; 1 != 2; 3 %% 2; 3 %/% 2; dat %o% 1:3
# including custom ones...
1 %myop% 2


# Automatic indentation with vertical indentation marks and code folding
for (i in 1:10) {
    mean(
        if (i == 2) {
            i
        } else {
            i + 1
        }
    )
}
# There is also a "comment folding" item: start by '#{{' and end by '#}}'
# Start folding here
#{{
# This comment is included in a custom folding
# Of course, commands can be embedded too
1+1
# and folding nicely nest with usual command folding on () or {}
for (i in 1:10) {
    cat("Hello world!\n")
}
#}}
# Not included in the comment folding part
ls()
cube <- function (x, na.rm = TRUE) {
    x^3
}


## To do...
# A more dynamic recognition of keywords, taking into account packages loaded
# with library() or require()... problem with namespace => recognize them too!

# Since we are analyzing NAMESPACE: propose also a different coloration for
# exported items (reuse SSL_REGEX?)

# Is it possible to give more meaningful names to the various styles that
# appear in the preferences box? And why are there other tags (cdata, tag, ...)?

# Colorize Rd files, DESCRIPTION, NAMESPACE and Sweave    

# Colorize wiki elements differently
