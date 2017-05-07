# roking-jsonlint

## rules
Rules are enabled or disabled from the command line. Any rule can be disabled by setting the value to `false`, e.g., `--tabs=false`.

Rules may also be enabled or disabled from a configuraton file, named .jsonlintrc, using the same values as used on the command line. A sample config is available in this repo and is shown below.

#### .jsonlintrc
```json
{
  "rules": 
    "comma-dangle": "on",
    "eol-last": "off",
    "indent": "2",
    "mixed-whitespace": "on",
    "spacing": "on",
    "tabs": "off",
    "whitespace": "on"
  }
}
```

#### comma-dangle :: enabled
When true, allows a dangling comma. Default is false (dangling commas are not allowed).
* --comma
* -c

#### indent :: enabled
Validates indentation. The default uses 2 spaces; however, a different number of spaces can be used by passing the number of spaces with the flag, e.g. `--indent=4`. This rule works in conjunction with other rules as follows: if *tabs* are 'allowed' (`--tabs=true`) and *mixed-whitespace* (`--mixed=false`) is not allowed, tabs are treated as 'required'. If tabs are required, a single tab is used as indentation.
* --indent[=<value>]
* -i[=<value>]

#### mixed-whitespace :: enabled
When true allows both tabs and spaces in indent. Default is false.
* --mixed
* -m

#### tabs :: enabled
When true allows tabs in the file. Default is false.
* --tabs
* -t

#### eol-last :: enabled
Enforces a blank line at the end of the file. Enabled by default.
* --eol
* -e

#### spacing :: enabled
Enforces a single space after a colon, and no space before the colon. Enabled by default.
* --space
* -s

#### whitespace :: enabled
Warns about lines with trailing whitespace. Enabled by default.
* --whitespace
* -w
