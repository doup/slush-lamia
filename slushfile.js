'use strict';

var gulp     = require('gulp');
var install  = require('gulp-install');
var conflict = require('gulp-conflict');
var template = require('gulp-template');
var rename   = require('gulp-rename');
var _        = require('underscore.string');
var inquirer = require('inquirer');
var path     = require('path');

function format(string) {
    var username = string.toLowerCase();
    return username.replace(/\s/g, '');
}

var defaults = (function () {
    var workingDirName = path.basename(process.cwd());
    var homeDir, osUserName, configFile, user;

    if (process.platform === 'win32') {
        homeDir    = process.env.USERPROFILE;
        osUserName = process.env.USERNAME || path.basename(homeDir).toLowerCase();
    }
    else {
        homeDir    = process.env.HOME || process.env.HOMEPATH;
        osUserName = homeDir && homeDir.split('/').pop() || 'root';
    }

    configFile = path.join(homeDir, '.gitconfig');
    user = {};

    if (require('fs').existsSync(configFile)) {
        user = require('iniparser').parseSync(configFile).user;
    }

    return {
        appName:     workingDirName,
        userName:    osUserName || format(user.name || ''),
        authorName:  user.name || '',
        authorEmail: user.email || '',
        locales:     'en, es',
    };
})();

gulp.task('default', function (done) {
    var prompts = [{
        name:    'appName',
        message: 'Name of the project:',
        default: defaults.appName,
    }, {
        name:     'appURL',
        message:  'URL where it\'s going to be deployed:',
        validate: function (a) {
            if (require('url-regex')({ exact: true }).test(a)) {
                return true;
            } else {
                return 'Please provide a valid URL.';
            }
        }
    }, {
        name:    'locales',
        message: 'Locales for i18n:',
        default: defaults.locales,
        validate: function (a) {
            if (/^([a-zA-Z]{2})(\s*,\s*[a-zA-Z]{2})*$/.test(a)) {
                return true;
            } else {
                return 'Please provide a comma separated list of two letter locales.';
            }
        },
        filter: (a) => a.toLowerCase().replace(/ /g, '').split(','),
    }, {
        name:    'locale',
        message: 'Default locale:',
        validate: function (input, answers) {
            if (answers.locales.indexOf(input) != -1) {
                return true;
            } else {
                return 'Please provide one of this locales: '+ answers.locales.join(', ') +'.';
            }
        },
        default: (a) => a.locales[0],
    }, {
        name:    'jQuery',
        message: 'Add jQuery:',
        type:    'confirm',
    }, {
        name:    'cssFramework',
        message: 'CSS Framework:',
        type:    'list',
        default: 'foundation6',
        choices: [
            { name: 'None', value: 'none' },
            { name: 'Foundation 6', value: 'foundation6' },
            { name: 'Bootstrap 3', value: 'bootstrap3' },
        ]
    }, {
        name:    'iconSet',
        message: 'Icon set:',
        type:    'list',
        default: 'fontawesome',
        choices: [
            { name: 'None', value: 'none' },
            { name: 'Font-Awesome', value: 'fontawesome' },
        ]
    }, {
        name:    'contentTypes',
        message: 'Init content types:',
        type:    'checkbox',
        choices: [
            { name: 'Post', value: 'post' },
            { name: 'Page', value: 'page' },
        ]
    }, {
        name:    'deployTarget',
        message: 'Deploy target:',
        type:    'list',
        default: 's3',
        choices: [
            { name: 'Amazon S3', value: 's3' },
            { name: 'GitHub Pages', value: 'github' },
        ]
    }, {
        name:    'pictureSize',
        message: 'Add picture size:',
        type:    'checkbox',
        choices: [
            { name: 'Thumbnail (100x100 crop)', value: 'thumbnail', short: 'Thumbnail' },
            { name: 'Medium (fit in 700x700)', value: 'medium', short: 'Medium' },
            { name: 'Large (fit in 1024x1024)', value: 'large', short: 'Large' },
        ]
    }, {
        name:    'confirm',
        message: 'Continue?',
        type:    'confirm'
    }];

    // Ask
    inquirer.prompt(prompts, function (answers) {
        answers.appDomain = require('url').parse(answers.appURL).host;

        if (!answers.confirm) {
            return;
        }

        answers.appNameSlug = _.slugify(answers.appName);

        gulp.src(__dirname + '/templates/**')
            .pipe(template(answers))
            .pipe(rename(function (file) {
                if (file.basename[0] === '_') {
                    file.basename = '.' + file.basename.slice(1);
                }
            }))
            .pipe(conflict('./'))
            .pipe(gulp.dest('./'))
            .pipe(install())
            .on('end', function () {
                done();
            });
    });
});
