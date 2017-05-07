/**
 * A JSON linter
 *
 * @author  hrobertking@cathmhaol.com
 */

var path = require('path'),
    invoked = process.argv[1].split(path.sep).pop(),
    cli,
    files = [ ],
    lines = [ ],
    evaluation = {
        /**
         * Warning data
         * @type {object}
         */
        data: { },

        /**
         * Adds warning data
         * @return {void}
         * @param {number} line
         * @param {object} rule
         */
        add: function(line, rule) {
            var len = Math.floor(lines.length).toString().length;

            /* line is the zero-based index */
            line += 1;

            /* normalize the length of the line indicator */
            line = line.toString();
            while (line.length < len) {
                line = ' ' + line;
            }

            /* add the message object */
            this.data[this.linting].messages.push({message: 'line: ' + line + ' - ' + rule.message, type:rule.type});
        },

        /**
         * Initializes the data key
         * @return {void}
         * @param {string} filename
         */
        reset: function(filename) {
            this.linting = filename;
            if (!this.data.hasOwnProperty(this.linting)) {
                this.data[this.linting] = { messages: [ ] };
            } else {
                this.data[this.linting].messages = [ ];
            }
        },

        /**
         * Outputs the object to the console, optionally sorting the messages type message type
         * @return {void}
         * @param {string} filename
         * @param {boolean} showType
         * @param {boolean} byType
         */
        show: function(filename, showType, byType) {
            if (filename) {
                console.log(
                    '\nLinting: ' +
                    filename +
                    '\n' + fill('-', ('linting: ' + filename).length, '-') +
                    '\n' +
                    this.toString(filename, showType, byType) +
                    (files.length > 1 ? '\n' + fill('=', 80, '=') : '')
                );
            } else {
                for (filename in this.data) {
                    if (this.data.hasOwnProperty(filename)) {
                        this.show(filename);
                    }
                }
            }
        },

        /**
         * Sorts the data into line number order (or by rule type) and returns the array as string
         * @return {string}
         * @param {string} filename
         * @param {boolean} showType
         * @param {boolean} byType
         */
        toString: function(filename, showType, byType) {
            var msg = 'No results';

            if (this.data.hasOwnProperty(filename)) { 
                if (this.data[filename].messages &&
                    this.data[filename].messages.length) {
                    msg = this.data[filename].messages;

                    if (msg.length) {
                        msg = msg.sort(function(a, b) {
                                var num = /line\:\s+(\d+)\s\-/,
                                    x = byType ? a.type : num.exec(a.message)[1],
                                    y = byType ? b.type : num.exec(b.message)[1];

                                return x - y;
                              }).map(function(item) {
                                return (showType ? RULE_TYPE.map(item.type) + ' - ': '') + item.message;
                              }).join('\n')
                                .replace(/^\s*|\s*$/g, '')
                                .replace(/^\n*|\n*$/g, '');
                    }
                } else {
                    msg = 'No errors';
                }
            }

            return msg;
        }
    },
    RULE_TYPE = {
        ERROR: 0,
        WARNING: 1,
        map: function(val) {
            var prop,
                name;

            for (prop in this) {
                if (this.hasOwnProperty(prop) && (typeof this[prop] !== 'function')) {
                    if (this[prop] === val) {
                        name = prop;
                        break;
                    }
                }
            }

            return name;
        }
    },
    rules = {
        'comma-dangle': {
            description: 'When true, allows a dangling comma. Default is false.',
            enabled: true,
            handler: function() {
                var ndx = lines.length - 1,
                    regex = /\s*\,\s*\}/,
                    dangling;

                /* we only need to go to index 1 because we evaluate the preceding line */
                while (ndx > 0) {
                    /* if the only thing between a comma and a brace is white space, that's a dangler */
                    dangling = regex.test(lines[ndx - 1] + lines[ndx]);

                    if (!this.value && dangling) {
                        evaluation.add((ndx - 1), this);
                    }
                    ndx -= 1;
                }
            },
            message: 'Dangling comma is not allowed.',
            opt_long: 'comma',
            opt_short: 'c',
            type: RULE_TYPE.WARNING,
            value: false
        },
        'indent': {
            description: 'Validates indentation. Enabled by default, using 2 spaces.',
            enabled: true,
            handler: function() {
                var ndx,
                    pline,
                    nline,
                    cline,
                    regex = /^(\s*)\S*/,
                    tabbed = false,
                    ws;

                /* if tabs are 'allowed' and indentation cannot be a mix of tabs and spaces, tabs are required */
                if (rules['tabs'].value && !rules['mixed-whitespace'].value) {
                    regex = /^(\t*)\S*/;
                    tabbed = true;
                    this.value = 1;
                    this.message = 'Single tabs should be used to indent.';
                }

                for (ndx = 0; ndx < lines.length; ndx += 1) {
                    /* get white space (indentation) of previous, current, and next line */
                    pline = ndx > 0 ? regex.exec(lines[ndx - 1]) : [ ];
                    cline = regex.exec(lines[ndx]);
                    nline = ndx < lines.length - 1 ? regex.exec(lines[ndx + 1]) : [ ];

                    /* indentation is not a multiple of the indentation size */
                    if (cline[1].length % this.value !== 0 && !tabbed) {
                        this.message = 'Indentation uses the wrong number of spaces, it should be ' + this.value;
                        evaluation.add(ndx, this);
                    } else {
                        /* if the previous line was the start of an object literal, check the indent */
                        if (ndx > 0 && /\{\s*$/.test(lines[ndx - 1])) {
                            if (Math.abs(cline[1].length - pline[1].length) !== Math.abs(this.value)) {
                                if (!tabbed) {
                                    this.message = 'Indent (' + Math.abs(cline[1].length - pline[1].length) + ') is incorrect, it should be ' + this.value;
                                }
                                evaluation.add(ndx, this);
                            }
                        }

                        /* if the next line closes an object literal, check the indent */
                        if (ndx > 0 && /\}\s*\,?\s*$/.test(lines[ndx + 1])) {
                            if (Math.abs(cline[1].length - nline[1].length) !== Math.abs(this.value)) {
                                if (!tabbed) {
                                    this.message = 'Outdent (' + Math.abs(cline[1].length - nline[1].length) + ') is incorrect, it should be ' + this.value;
                                }
                                evaluation.add(ndx, this);
                            }
                        }
                    }
                }
            },
            message: 'Indentation size is set at 4 spaces',
            opt_long: 'indent',
            opt_short: 'i',
            type: RULE_TYPE.WARNING,
            value: 2
        },
        'mixed-whitespace': {
            description: 'When true allows both tabs and spaces in indent. Default is false.',
            enabled: true,
            handler: function() {
                var ndx,
                    regex = /^(\s*)\S/,
                    ws,
                    mixed;

                for (ndx = 0; ndx < lines.length; ndx += 1) {
                    ws = regex.exec(lines[ndx]);
                    ws = ws ? ws[1] : '';
                    mixed = /\t/.test(ws) && / /.test(ws);

                    if (!this.value && mixed) {
                        evaluation.add(ndx, this);
                    }
                }
            },
            message: 'White space is a mix of tab and space.',
            opt_long: 'mixed',
            opt_short: 'm',
            type: RULE_TYPE.WARNING,
            value: false
        },
        'tabs': {
            description: 'When true allows tabs in the file. Default is false.',
            enabled: true,
            handler: function() {
                var ndx,
                    regex = /\t/,
                    tabbed;

                for (ndx = 0; ndx < lines.length; ndx += 1) {
                    tabbed = regex.test(lines[ndx]);

                    if (!this.value && tabbed) {
                        evaluation.add(ndx, this);
                    }
                }
            },
            message: 'Tabs are not allowed',
            opt_long: 'tabs',
            opt_short: 't',
            type: RULE_TYPE.WARNING,
            value: false
        },
        'eol-last': {
            description: 'Enforces a blank line at the end of the file. Enabled by default.',
            enabled: true,
            handler: function() {
                if (lines[lines.length - 1] !== '') {
                    evaluation.add(lines.length - 1, this);
                }
            },
            message: 'File is missing a blank line at the end.',
            opt_long: 'eol',
            opt_short: 'e',
            type: RULE_TYPE.WARNING
        },
        'spacing': {
            description: 'Enforces a single space after a colon. Enabled by default.',
            enabled: true,
            handler: function() {
                var ndx,
                    re_after = /\:\S/,
                    re_before = /\s\:/,
                    colon;

                for (ndx = 0; ndx < lines.length; ndx += 1) {
                    colon = re_after.test(lines[ndx]) || re_before.test(lines[ndx]);

                    if (colon) {
                        evaluation.add(ndx, this);
                    }
                }
            },
            message: 'There should be a single space after a colon.',
            opt_long: 'space',
            opt_short: 's',
            type: RULE_TYPE.WARNING
        },
        'whitespace': {
            description: 'Warns about lines with trailing whitespace. Enabled by default',
            enabled: true,
            handler: function() {
                var ndx;

                for (ndx = 0; ndx < lines.length; ndx += 1) {
                    if (/\s$/.test(lines[ndx])) {
                        evaluation.add(ndx, this);
                    }
                }
            },
            message: 'Lines may not have a trailing whitespace.',
            opt_long: 'whitespace',
            opt_short: 'w',
            type: RULE_TYPE.WARNING
        }
    };

/**
 * Configures which rules will be executed. Command-line arguments are processed last because they take precedence.
 * @returns {void}
 */
function configure() {
    var config = { },
        param,
        passed;

    /* loop through the rules looking for a match */
    function isRule(name) {
        var rule,
            is = false;

        /* loop through the rules looking for a match */
        for (rule in rules) {
            if (rules.hasOwnProperty(rule) && (name === rules[rule].opt_long || name === rules[rule].opt_short)) {
                is = true;
                break;
            }
        }

        return is;
    }

    /**
     * normalizes the parameter value to a state and value
     * @return {object}
     * @param {string} input
     */
    function normalize(input) {
        var passed = (typeof input === 'string') ? input.split(',') : [ ],
            config = {
                state: null,
                value: null
            };

        if (passed.length > 0) {
            /* trim the input */
            passed.forEach(function(ignore, index, self) {
                    self[index] = self[index].replace(/^\s*|\s*$/g, '');
                });

            /* if the value passed in the input is boolean */
            if (passed[0] === 'true' || passed[0] === 'false') {
                config.state = JSON.parse(passed[0]);

                if (passed.length > 1) {
                    config.value = JSON.parse(passed[1]);
                }
            } else if (passed[0] === 'off') {
                config.state = false;

                if (passed.length > 1) {
                    config.value = JSON.parse(passed[1]);
                }
            } else if (passed[0] === 'on') {
                config.state = true;

                if (passed.length > 1) {
                    config.value = JSON.parse(passed[1]);
                }
            } else if (passed[0] === '') {
                config.state = false;
            } else {
                /* the value was passed in the state portion of the parameter */
                config.state = true;
                config.value = JSON.parse(passed[0]);
            }
        } else if (typeof input === 'boolean') {
            /* this is a flag param */
            config.state = true;
            config.value = input;
        }

        return config;
    }

    /* loop through the rules looking for a match */
    function setRule(name, config) {
        var rule;

        /* loop through the rules looking for a match */
        for (rule in rules) {
            if (rules.hasOwnProperty(rule)) {
                /* if the command-line parameter is the rule 'name', enable or disable the rule */
                if (name === rules[rule].opt_long || name === rules[rule].opt_short) {
                    /* set the rule state */
                    if (config.state !== null && config.state !== undefined) {
                        rules[rule].enabled = config.state;
                    }

                    /* if a value was passed along with the rule state, set it on th rule */
                    if (config.value !== null && config.value !== undefined) {
                        rules[rule].value = config.value;
                    }
                }
            }
        }
    }

    /* loop through the command-line parameters */
    for (param in cli) {
        if (cli.hasOwnProperty(param) && isRule(param)) {
            /* get the (comma-delimited) value passed in the parameter */
            passed = normalize(cli[param]);

            /* match the passed parameter to a rule */
            setRule(param, passed);
        }
    }
}

/**
 * Loads the list of files to evaluate
 * @return {void}
 */
function getFileList() {
    var fs = require('fs'),
        ndx,
        expanded = [ ];

    function dir(directory, filelist) {
        var list = fs.readdirSync(directory);

        /* make sure null values are an array */
        filelist = filelist || [ ];

        /* loop through directory entries */
        list.forEach(function(file) {
            var abs = path.join(directory, file);

            if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
                filelist = dir(path.join(directory, file), filelist);
            } else {
                filelist.push(path.join(directory, file));
            }
        });

        return filelist;
    }

    /* get the files from the command line */
    files = [ ].concat((cli.f || '').split(/\s+|\,\s*/),
            (cli.files || '').split(/\s+|\,\s*/),
            (cli._unnamed || '').split(/\s+|\,\s*/)
            );

    /* remove empty names */
    ndx = files.length - 1;
    while (ndx > -1) {
        if (!files[ndx].replace(/^\s*|\s*$/g, '')) {
            files.splice(ndx, 1);
        } else if (fs.existsSync(files[ndx]) && fs.statSync(files[ndx]).isDirectory()) {
            /* expand any directories */
            dir(files.splice(ndx, 1)[0], expanded);
        }
        ndx -= 1;
    }

    /* add any expanded directories to the file list */
    files = files.concat(expanded);
}

/**
 * Process a single file
 * @return {void}
 * @param {string} filename
 * @param {function} callback
 * @param {boolean} isfirst
 */
function lint(filename, callback, isfirst) {
    var fs = require('fs'),
        data;

    if (fs.existsSync(filename)) {
        fs.readFile(filename, function(err, data) {
            var rule;

            /* reset the evaluation object */
            evaluation.reset(filename);

            /* initialize the lines array that we'll be processing */
            lines = [ ];

            if (err) {
                console.log('');
                console.error(err);
                console.log('');
            } else if (data) {
                /* split the file into lines */
                lines = data.toString().split('\n');

                /* parse the JSON to make sure it is valid */
                jsonparse();

                /* run all the individual rules */
                for (rule in rules) {
                    if (rules.hasOwnProperty(rule) && rules[rule].enabled) {
                        rules[rule].handler.call(rules[rule]);
                    }
                }

                /* execute the callback if it's provided */
                if (callback && callback.call) {
                    callback.call();
                }

                /* report the results unless 'quiet' has been specified */
                if (!cli.q && !cli.quiet) {
                    evaluation.show(filename);
                }
            }
        });
    } else {
        console.error('File "' + filename + '" does not exist.');
    }
}

/**
 * Process the file(s) to be linted
 * @return {void}
 * @param {function} callback
 */
function lintList(callback) {
    var ndx;

    /* lint all the files in the list */
    if (files.length) {
        for (ndx = 0; ndx < files.length; ndx += 1) {
            lint(files[ndx], callback, ndx === 0);
        }
    } else {
        console.warn('File list is empty');
    }
}

/**
 * Pads a string with spaces to a minimum length
 * @return {string}
 * @param {string} value
 * @param {number} length
 * @param {string} str
 */
function fill(value, length, str) {
    while (value.length < length) {
        value += str;
    }

    return value;
}

/**
 * Parses the array of arguments passed and returns an object
 * @returns {object}
 * @param {string[]} args
 */
function opts(args) {
    var isfirst = true,
        arg_l,
        arg_s,
        value,
        obj = { argv:[ ] };

    /* Loop through all the options args */
    while (args.length) {
        /* delete the word 'node' if it's the first arg */
        if (/\bnode$/.test(args[0]) && isfirst) {
            args.splice(0, 1);
        }

        /* if the first arg is a js filename, it's the caller */
        if (args[0].indexOf('.js') > -1 && isfirst) {
            obj._command = args[0];
            args.splice(0, 1);
        }

        /* set long and short options */
        arg_l = /^\-{2}(\S+)/.exec(args[0]);
        arg_s = /^\-{1}(\S+)/.exec(args[0]);

        if (arg_l) {
            if (arg_l[1].indexOf(':') > -1) {
                /* we have data in the argument, e.g., --foo:bar */
                value = (arg_l[1] || '').split(':');
                obj[value[0]] = [obj[value[0]], value[1]].join(',').replace(/^\,|\,$/g, '');
                obj.argv.push(args[0]);
                args.splice(0, 1);
            } else if (arg_l[1].indexOf('=') > -1) {
                /* we have data in the argument, e.g., --foo=bar */
                value = (arg_l[1] || '').split('=');
                obj[value[0]] = [obj[value[0]], value[1]].join(',').replace(/^\,|\,$/g, '');
                obj.argv.push(args[0]);
                args.splice(0, 1);
            } else {
                /* there isn't data passed in, so set the flag to true */
                obj[arg_l[1]] = true;
                obj.argv.push(args[0]);
                args.splice(0, 1);
            }
        } else if (arg_s) {
            /* split the 'small' arg name into letters */
            arg_l = arg_s[1]; /* keep the whole argument */
            arg_s = arg_s[1].split('');

            if (arg_l.indexOf(':') > -1) {
                /* we have data in the argument, e.g., -f:bar */
                arg_s = arg_l.split(':')[0].split('');
                for (value = 0; value < arg_s.length; value += 1) {
                    if (value === arg_s.length - 1) {
                        obj[arg_s[value]] = [obj[arg_s[value]], arg_l.split(':')[1]].join(',').replace(/^\,|\,$/g, '');
                    } else {
                        obj[arg_s[value]] = true;
                    }
                }
                obj.argv.push(args[0]);
                args.splice(0, 1);
            } else if (arg_l.indexOf('=') > -1) {
                /* we have data in the argument, e.g., --foo=bar */
                arg_s = arg_l.split('=')[0].split('');
                for (value = 0; value < arg_s.length; value += 1) {
                    if (value === arg_s.length - 1) {
                        obj[arg_s[value]] = [obj[arg_s[value]], arg_l.split('=')[1]].join(',').replace(/^\,|\,$/g, '');
                    } else {
                        obj[arg_s[value]] = true;
                    }
                }
                obj.argv.push(args[0]);
                args.splice(0, 1);
            } else if (arg_s.length > 1) {
                /**
                 * if the arg is more than one letter, then loop
                 * through the letters and set each to the presented
                 * value or true
                 */
                for (value = 0; value < arg_s.length; value += 1) {
                    obj[arg_s[value]] = true;
                }
                obj.argv.push(args[0]);
                args.splice(0, 1);
            } else {
                /* there isn't data passed in, so set the flag to true */
                obj[arg_s[0]] = true;
                obj.argv.push(args[0]);
                args.splice(0, 1);
            }
        } else {
            /**
             * get the current value for the unnamed arguments
             * and add this value to it, then store the values
             * in the property of the object
             */
            value = (obj._unnamed || '').split(',');
            value.push(args[0]);
            value = value.join(',').replace(/^\,|\,$/g, '');
            if (value) {
                obj._unnamed = value;
            }
            obj.argv.push(args[0]);
            args.splice(0, 1);
        }
        isfirst = false;
    }

    return obj;
}

/**
 * Parses the file, simulating JSON.parse but with better error messages
 * @returns {object}
 */
function jsonparse() {
    var rule = {
            description: 'JSON parse',
            type: RULE_TYPE.ERROR
        },
        ndx = 0,
        remaining = lines.length,
        pos,
        braces = 0,
        dblbrace = /\{{2,}|\}{2,}/,
        lbrace = /\{\s*$/,
        braceonly = /^\s*[\{\}]+[\{\}\s]*$/,
        closecomma = /\,\s*$/,
        closebrace = /^\s*\}/,
        empty = /^\s*$/,
        property = /^\s*['"]?[^'"\s]+[^'"]*['"]?\s*\:/,
        novalue = /^\s*['"]?[^'"\s]+[^'"]*['"]?\s*\:[\s\{]*\,/;

    while (ndx < lines.length) {
        /* adjust the remaining lines */
        remaining -= 1;

        /* count open and close braces */
        pos = 0;
        while (pos > -1) {
            pos = lines[ndx].indexOf('{', pos + 1);
            braces += (pos > -1) ? 1 : 0;
        }
        pos = 0;
        while (pos > -1) {
            pos = lines[ndx].indexOf('}', pos + 1);
            braces -= (pos > -1) ? 1 : 0;
        }

        /* evaluate the line */
        if (empty.test(lines[ndx])) {
            /* line is empty or contains only a brace - ignore it because braces are evaluated in other ways */
        } else if (!lbrace.test(lines[ndx]) && !closebrace.test(lines[ndx]) && lines[ndx].indexOf(':') < 0 && !empty.test(lines[ndx])) {
            /* a non-empty line does not contain a colon */
            rule.message = 'Invalid syntax: statement does not contain a key/value pair.';
            evaluation.add(ndx, rule);
        } else if (!lbrace.test(lines[ndx]) && !closebrace.test(lines[ndx]) && !property.test(lines[ndx])) {
            /* missing property identifier */
            rule.message = 'Invalid syntax: missing property identifier.';
            evaluation.add(ndx, rule);
        } else if (novalue.test(lines[ndx])) {
            rule.message = 'Invalid syntax: missing value.';
            evaluation.add(ndx, rule);
        } else if (lbrace.test(lines[ndx]) && !braceonly.test(lines[ndx])) {
            /* line ends in brace */
            try {
                JSON.parse('{' + lines[ndx] + ' } }');
            } catch (err) {
                rule.message = err.message;
                evaluation.add(ndx, rule);
            }
        } else if (remaining && !closecomma.test(lines[ndx]) && !closebrace.test(lines[ndx + 1]) && !braceonly.test(lines[ndx])) {
            /* a line with content ends without a comma and there is not a brace on the following line */
            rule.message = 'Invalid syntax: missing comma.';
            evaluation.add(ndx, rule);
        } else if (!lbrace.test(lines[ndx]) && braceonly.test(lines[ndx]) && remaining && property.test(lines[ndx + 1])) {
            /* a line that is a right brace and has content on the following line does not have a comma */
            rule.message = 'Invalid syntax: missing comma.';
            evaluation.add(ndx, rule);
        } else if (dblbrace.test(lines[ndx]) && remaining && braces < 1) {
            rule.message = 'Invalid syntax: double braces.';
            evaluation.add(ndx, rule);
        }

        ndx += 1;
    }

    /* add general errors */
    if (braces > 0) {
        rule.message = 'Invalid syntax: ' + braces.toString() + ' unclosed brace' + (braces > 1 ? 's' : '');
        evaluation.add(lines.length, rule);
    } else if (braces < 0) {
        rule.message = 'Invalid syntax: ' + Math.abs(braces).toString() + ' extra closing brace' + (braces < -1 ? 's' : '');
        evaluation.add(lines.length, rule);
    }
}

/**
 * Usage information
 * @returns {void}
 */
function usage() {
    var item,
        def,
        len = 0,
        params = [ ];

    /* add non-rule parameters */
    params.push(['-h, --help', 'Show usage information']);
    params.push(['-q, --quiet', 'Suppress lint results']);

    /* calculate the longest parameter definition */
    for (item in rules) {
        if (rules.hasOwnProperty(item)) {
            /* set rule definition */
            def = ('-' + rules[item].opt_short + ', --' + rules[item].opt_long) +
                    (rules[item].value !== undefined ? '=<value>' : '        ');

            /* add the rule definition to the messages */
            params.push([def, rules[item].description]);
        }
    }

    /* calculate length considering additional (non-rule) command-line args */
    for (item = 0; item < params.length; item += 1) {
        len = Math.max(len, params[item][0].length);
    }

    /* sort the params */
    params.sort(function(a, b) {
            return a[0] > b[0];
        });

    /* output the message */
    console.log('Syntax: ' + invoked.split(path.sep).pop() + ' <parameters> path/filename');
    console.log('');
    for (item = 0; item < params.length; item += 1) {
        console.log(fill(params[item][0], len, ' ') + params[item][1]);
    }
    console.log('');
}

cli = opts(process.argv);

if (cli.h || cli.help) {
    usage();
} else {
    /* set the rule configuration */
    configure();

    /* get the files from the command line */
    getFileList();

    /* process the file list */
    lintList();
}
