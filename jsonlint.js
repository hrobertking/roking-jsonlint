/**
 * @author hrobertking@cathmhaol.com
 */

var path = require('path'),
	invoked = process.argv[1].split(path.sep).pop(),
	cli,
	files = [ ],
	lines = [ ],
	warnings = {
		data: [ ],

		add: function(line, rule) {
			this.data.push('line: ' + line + ' - ' + rule.message);
		},

		toString: function() {
      if (this.data.length) {
    		return this.data.sort(function(a, b) {
            var num = /line\: (\d+) \-/,
                x = num.exec(a)[1],
                y = num.exec(b)[1];

            return x - y;
          }).join('\n')
            .replace(/^\s*|\s*$/g, '')
            .replace(/^\n*|\n*$/g, '');
      }
		}
	},
	rules = {
		'comma-dangle': {
			description: 'When enabled, allows a dangling comma. Disabled by default',
			enabled: false,
			handler: function() {
				var ndx = lines.length - 1;

				/* we only need to go to index 1 because we evaluate the preceding line */
				while (ndx > 0) {
					/* if the only thing between a comma and a brace is white space, that's a dangler */
					if (/\s*\,\s*\}/.test(lines[ndx - 1] + lines[ndx])) {
						warnings.add((ndx - 1), this);
					}
					ndx -= 1;
				}
			},
			message: 'Dangling comma is not allowed.',
			opt_long: 'comma',
			opt_short: 'c'
		},
		'indent': {
			description: 'Validates indentation. Enabled by default, using 4 spaces.',
			enabled: true,
			handler: function() {
				var ndx,
					psize = 0,
          nsize = 0,
					ndnt;

				for (ndx = 0; ndx < lines.length; ndx += 1) {
          /* get the size of the indent of the previous line, the next line, and the current line */
          psize = ndx > 0 ? /^(\s*)\S*/.exec(lines[ndx - 1])[1].length : -1;
          nsize = ndx < lines.length - 1 ? /^(\s*)\S*/.exec(lines[ndx + 1])[1].length : -1;
					ndnt = /^(\s*)\S*/.exec(lines[ndx])[1].length;

					/* indentation is not a multiple of the indentation size */
					if (ndnt % this.value !== 0) {
            this.message = 'Indentation uses the wrong number of spaces';
						warnings.add(ndx, this);
					} else {
    				/* if the previous line was the start of an object literal, check the indent */
            if (ndx > 0 && /\{\s*$/.test(lines[ndx - 1])) {
              if (Math.abs(ndnt - psize) !== this.value) {
                this.message = 'Indent is incorrect';
                warnings.add(ndx, this);
              }
            }

    				/* if the next line closes an object literal, check the indent */
            if (ndx > 0 && /\}\s*\,?\s*$/.test(lines[ndx + 1])) {
              if (Math.abs(ndnt - nsize) !== this.value) {
                this.message = 'Outdent is incorrect';
                warnings.add(ndx, this);
              }
					  }
          }
				}
			},
			message: 'Indentation size is set at 4 spaces',
			opt_long: 'indent',
			opt_short: 'i',
			value: 4
		},
		'tabs': {
			description: 'When enabled allows tabs in the file. Disabled by default.',
			enabled: false,
			handler: function() {
				var ndx;

				for (ndx = 0; ndx < lines.length; ndx += 1) {
					if (/\t/.test(lines[ndx])) {
						warnings.add(ndx, this);
					}
				}
			},
			message: 'Tabs are not allowed',
			opt_long: 'tabs',
			opt_short: 't'
		},
		'eol-last': {
			description: 'Enforces a blank line at the end of the file. Enabled by default.',
			enabled: true,
			handler: function() {
				if (lines[lines.length - 1] !== '') {
					warnings.add(lines.length - 1, this);
				}
			},
			message: 'File is missing a blank line at the end.',
			opt_long: 'eol',
			opt_short: 'e'
		},
		'spacing': {
			description: 'Enforces a single space after a colon. Enabled by default.',
			enabled: true,
			handler: function() {
				var ndx;

				for (ndx = 0; ndx < lines.length; ndx += 1) {
					if (/\s\:/.test(lines[ndx]) || /\:\S/.test(lines[ndx])) {
						warnings.add(ndx, this);
					}
				}
			},
			message: 'There should be a single space after a colon.',
			opt_long: 'space',
			opt_short: 's'
		},
		'whitespace': {
			description: 'Warns about lines with trailing whitespace. Enabled by default',
			enabled: true,
			handler: function() {
				var ndx;

				for (ndx = 0; ndx < lines.length; ndx += 1) {
					if (/\s$/.test(lines[ndx])) {
						warnings.add(ndx, this);
					}
				}
			},
			message: 'Lines may not have a trailing whitespace.',
			opt_long: 'whitespace',
			opt_short: 'w'
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
	function matchRule() {
		var rule;

		/* loop through the rules looking for a match */
		for (rule in rules) {
			if (rules.hasOwnProperty(rule)) {
				/* if the command-line parameter is the rule 'name', enable or disable the rule */
				if (param === rules[rule].opt_long || param === rules[rule].opt_short) {
					rules[rule].enabled = JSON.parse(passed[0]);

				  /* if a value was passed along with the rule state, set it on th rule */
    			if (passed.length > 1) {
	    			rules[rule].value = passed[1];
		    	}
				}
			}
		}
	}

	/* read the configuration file if it's present */
	for (param in config) {
		if (config.hasOwnProperty(param)) {
			/* get the (comma-delimited) value passed in the parameter */
			passed = (typeof config[param] === 'string') ? config[param].split(',') : [ ];

			/* match the passed parameter to a rule */
			matchRule();
		}
	}

	/* loop through the command-line parameters */
	for (param in cli) {
		if (cli.hasOwnProperty(param)) {
			/* get the (comma-delimited) value passed in the parameter */
			passed = (typeof cli[param] === 'string') ? cli[param].split(',') : [ ];

			/* match the passed parameter to a rule */
			matchRule();
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
 */
function lint(filename, callback) {
  var fs = require('fs'),
      data;

  if (fs.existsSync(filename)) {
    fs.readFile(filename, function(err, data) {
        var rule,
            parsed;

        /* initialize the lines array that we'll be processing */
        lines = [ ];

        if (err) {
          console.log('');
          console.error(err);
          console.log('');
        } else if (data) {
          try {
            lines = data.toString().split('\n');
            for (rule in rules) {
              if (rules.hasOwnProperty(rule) && rules[rule].enabled) {
                rules[rule].handler.call(rules[rule]);
              }
            }
            parsed = JSON.parse(lines.join('\n'));
          } catch (ignore) {
            warnings.add(0, {message: ignore.message});
          } finally {
            /* execute the callback if it's provided */
            if (callback && callback.call) {
              callback.call();
            }
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
      lint(files[ndx], callback);
    }
    callback.call();
  } else {
    console.warn('File list is empty');
  }
}

/**
 * Pads a string with spaces to a minimum length
 * @return {string}
 * @param {string} value
 * @param {number} length
 */
function lpad(value, length) {
  while (value.length < length) {
    value += ' ';
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
      } else if (!(/^\-{2}(\S+)/).test(args[1]) && !(/^\-{1}(\S+)/).test(args[1])) {
        /**
         * there is data passed in, but it's not identfied
         * by anything other than proximity, so get the
         * current value for the arg and add this value to
         * it, then store the values in the property of the
         * object, but assume it's a flag if the value is
         * empty
         */
        value = (obj[arg_l[1]] || '').split(',');
        value.push(args[1]);
        obj[arg_l[1]] = value.join(',').replace(/^\,|\,$/g, '');
        obj[arg_l[1]] = obj[arg_l[1]].length ? obj[arg_l[1]] : true;
        obj.argv.push(args[0]);
        args.splice(0, 1);
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
      } else if (!(/^\-{2}(\S+)/).test(args[1]) && !(/^\-{1}(\S+)/).test(args[1])) {
        /**
         * there is data passed in, but it's not identfied
         * by anything other than proximity, so get the
         * current value for the arg and add this value to
         * it, then store the values in the property of the
         * object, but assume it's a flag if the value is
         * empty
         */
        value = (obj[arg_s[0]] || '').split(',');
        value.push(args[1]);
        obj[arg_s[0]] = value.join(',').replace(/^\,|\,$/g, '');
        obj[arg_s[0]] = obj[arg_s[0]].length ? obj[arg_s[0]] : true;
        obj.argv.push(args[0]);
        args.splice(0, 1);
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
 * Usage information
 * @returns {void}
 */
function usage() {
	var rule,
      def,
      len = 0,
      message = [ ];

  /* calculate the longest parameter definition */
  for (rule in rules) {
    if (rules.hasOwnProperty(rule)) {
      /* set rule definition */
      def = ('-' + rules[rule].opt_short + ', --' + rules[rule].opt_long) +
            (rules[rule].value !== undefined ? '=<value>' : '        ');

      /* set the length of the longest rule definition */
      len = Math.max(len, def.length);

      /* add the rule definition to the messages */
      message.push([def, rules[rule].description]);
    }
  }

  /* output the message */
	console.log('Syntax: ' + invoked.split(path.sep).pop() + ' <parameters> path/filename');
	console.log('');
	for (rule = 0; rule < message.length; rule += 1) {
		console.log(lpad(message[rule][0], len) + message[rule][1]);
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
	lintList(function() {
      var result = warnings.toString();

      if (result) {
        console.log(result);
      }
    });
}
