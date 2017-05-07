# roking-jsonlint

## rules
Rules are enabled or disabled from the command line. Any rule can be enabled by setting the value to 'true' or 'on', or disabled by setting the value to 'false' or 'off', e.g., `--tabs=false` or `--comma=on`. The short option, e.g., `-c`, the long option, e.g., `--comma`, or the rule name, e.g., `--comma-dangle`, can be used to enable or disable a rule.

Rules may also be enabled or disabled from a configuraton file, named .jsonlintrc, using the same values as used on the command line. A sample config is available in this repo and is shown below.

#### .jsonlintrc
```json
{
  "rules": {
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

#### Rule: `comma-dangle` :: enabled
When true, allows a dangling comma. Default is false (dangling commas are not allowed).
* --comma
* -c

#### Rule: `eol-last` :: enabled
Enforces a blank line at the end of the file. Enabled by default.
* --eol
* -e

#### Rule: `indent` :: enabled
Validates indentation. The default uses 2 spaces; however, a different number of spaces can be used by passing the number of spaces with the flag, e.g. `--indent=4`. This rule works in conjunction with other rules as follows: if *tabs* are 'allowed' (`--tabs=true`) and *mixed-whitespace* (`--mixed=false`) is not allowed, tabs are treated as 'required'. If tabs are required, a single tab is used as indentation.
* --indent[=<value>]
* -i[=<value>]

#### Rule: `mixed-whitespace` :: enabled
When true allows both tabs and spaces in indent. Default is false.
* --mixed
* -m

#### Rule: `spacing` :: enabled
Enforces a single space after a colon, and no space before the colon. Enabled by default.
* --space
* -s

#### Rule: `tabs` :: enabled
When true allows tabs in the file. Default is false.
* --tabs
* -t

#### Rule: `whitespace` :: enabled
Warns about lines with trailing whitespace. Enabled by default.
* --whitespace
* -w
