#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const request = require('request');
const argv = require('minimist')(process.argv.slice(2));
const twamp = require('../src/twamp');
const processor = require('../src/processor');

// Map space separated string value to array
if(argv.bucket_names) {
    argv.bucket_names = argv.bucket_names.split(' ');
}

var twampConfig = {};
try {
    const json = fs.readFileSync(argv.cfg || path.join(process.cwd(), 'twamp.config.json'), 'utf8');
    if (json.length) {
        twampConfig = JSON.parse(json);
    }
} catch (e) {
    if (e.code !== 'ENOENT' || argv.cfg) {
        throw e;
    }
}

const cfg = Object.assign({}, twampConfig, argv);
delete cfg._;
delete cfg.cfg;

// Show usage if no arguments provided
if (!argv._.length) {
    usage();
}

// Handle actions
switch(argv._[0]) {
    case 'handle':
        twamp.handle(cfg, processor.transform, done);
        break;
    case 'run':
        twamp.run(cfg, argv._.slice(1), processor.transform, done);
        break;
    case 'fetch':
        twamp.fetch(cfg, done);
        break;
    case 'bear':
        bear(done);
        break;
    case 'path':
        console.log(path.join(__dirname, '..', 'service'));
        break;
    default:
        usage();
        break;
}

function usage()
{
    console.log('Usage: twamp handle|run|fetch|bear|path [options]');
    console.log('  handle -- process uris defined in twamp.config.json');
    console.log('  run -- process provided uris');
    console.log('  fetch -- fetch latest tweets for configured/provided screen_name');
    console.log('  bear -- request bearer token using application credentials');
    console.log('  path -- output path to terraform module');
    process.exit(0);
}

function done(error, result)
{
    if (error) {
        console.error('ERROR [%s] %s', error.code || '0', error.message || JSON.stringify(error));
        process.exit(1);
    }
    console.log(JSON.stringify(result, null, cfg.json_indent ? parseInt(cfg.json_indent, 10) : 2));
    process.exit(0);
}

function bear(callback)
{
    const consumer = encodeURIComponent(cfg.consumer_key) + ':' + encodeURIComponent(cfg.consumer_secret);
    const consumerB64 = Buffer.from(consumer).toString('base64');
    const requestOptions = {
        url: 'https://api.twitter.com/oauth2/token',
        headers: {Authorization: 'Basic ' + consumerB64},
        form: {grant_type: 'client_credentials'}
    };
    //console.log('Requesting application-only bearer token: %s', JSON.stringify(requestOptions));
    request.post(requestOptions, function (error, response, body) {
        if (error) {
            return callback(error);
        }
        if (response.statusCode !== 200) {
            const e = new Error(body);
            e.response = response;
            e.code = response.statusCode;
            return callback(e);
        }
        cfg.bearer_token = JSON.parse(body).access_token;
        callback(null, cfg);
    });
}