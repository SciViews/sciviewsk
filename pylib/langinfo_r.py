from langinfo import LangInfo

class RLangInfo(LangInfo):
    """http://www.r-project.org"""
    name = "R"
    conforms_to_bases = ["Text"]
    exts = [".R", ".Rhistory", ".Rprofile"]
    filename_patterns = ["Rprofile"]
    default_encoding = "utf-8"
