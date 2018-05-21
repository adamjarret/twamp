const async = require('async');
const pickBy = require('lodash.pickby');
const Twitter = require('twitter');

function handle(cfg, processURI, callback)
{
    const uris = cfg.uris.split(cfg.uri_separator || ' ');

    run(cfg, uris, processURI, callback);
}

function run(cfg, uris, processURI, callback)
{
    const concurrency = cfg.concurrency ? parseInt(cfg.concurrency, 10) : 10;
    const frequency = cfg.frequency_minutes ? parseInt(cfg.frequency_minutes, 10) : 15;
    const processorParams = {
        indent: cfg.json_indent,
        dateOutputFormat: cfg.date_format,
        maxAge: frequency * 60
    };

    async.waterfall([
        function (cb) { fetch(cfg, cb); },
        function (tweets, cb) {
            var hasErrors = false;
            const q = async.queue(processURI.bind(null, tweets, processorParams), concurrency);
            q.drain = function () {
                cb(hasErrors ? new Error('One or more errors occurred') : null, 'DONE');
            };
            q.push(uris, function (error) {
                if (error) {
                    console.error(error);
                    hasErrors = true;
                }
            });
        }
    ], callback);
}

function fetch(cfg, callback)
{
    const defaultParams = {
        "user_id": undefined,
        "screen_name": undefined,
        "count": "1",
        "trim_user": false,
        "since_id": undefined,
        "max_id": undefined,
        "exclude_replies": false,
        "include_rts": true
    };

    const params = Object.assign({}, defaultParams, pickBy(cfg, function (val, key) {
        return defaultParams.hasOwnProperty(key);
    }));

    const client = new Twitter(cfg);
    client.get('statuses/user_timeline', params, function (error, tweets, response) {
        if (error) {
            callback(error);
        }
        else if (response.statusCode !== 200) {
            const e = new Error(response.message);
            e.code = response.statusCode;
            callback(e);
        }
        else {
            callback(null, tweets);
        }
    });
}

exports.handle = handle;
exports.run = run;
exports.fetch = fetch;

