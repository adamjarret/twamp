const util = require('util');
const cheerio = require('cheerio');
const moment = require('moment');
const dateInputFormat = 'ddd MMM DD HH:mm:ss ZZ YYYY';
const AbstractTextFile = require('./AbstractTextFile').Model;

function HtmlFile(pathOrS3Uri, maxAge, screen_name, dateOutputFormat)
{
    AbstractTextFile.call(this, pathOrS3Uri, maxAge);

    this.screen_name = screen_name; // remember screen_name instead of getting it from the tweet (to support trim_user)
    this.dateOutputFormat = dateOutputFormat || 'h:mm A [UTC] - MMM D, YYYY';
}

Object.assign(HtmlFile.prototype, AbstractTextFile.prototype, {
    parse: function (html) {
        this.$ = cheerio.load(html, 'utf8');
    },
    render: function () {
        return this.$.html();
    },
    headers: function () {
        const s3Headers = AbstractTextFile.prototype.headers.call(this);
        s3Headers.ContentType = 'text/html; charset=utf-8';
        return s3Headers;
    },
    replace: function (idx, tweet) {
        const tweetId = tweet.id_str;
        const sel = '.tweet-' + idx;
        const el = this.$(sel);
        if (!el.length) {
            this.log(util.format('! %s not found', sel));
            return false;
        }
        const oldId = el.data('tweetid');
        if (oldId !== tweetId) {
            const created_at = moment(tweet.created_at, dateInputFormat).utc().format(this.dateOutputFormat);
            this.log(util.format('%s:\n - %s\n + %s', sel, oldId, tweetId));
            el.attr('data-tweetid', tweetId); // use attr not data so DOM is updated
            el.find('.tweet-href').attr('href', util.format('https://twitter.com/%s/status/%s', this.screen_name, tweetId));
            el.find('.tweet-text').text(tweet.text);
            el.find('.tweet-screen_name').text(this.screen_name);
            el.find('.tweet-created_at').text(created_at);
            return true;
        }
        return false;
    },
    transform: function (tweets, callback) {
        this.load(function (error, html) {
            if (error) {
                return callback(error);
            }

            this.parse(html);

            if (tweets.reduce(function (tf, tweet, idx) { return tf & !this.replace(idx, tweet); }.bind(this), true)) {
                this.log('* not changed');
                return callback(null);
            }

            this.save(callback);
        }.bind(this));
        return this;
    }
});

function transform(tweets, params, pathOrS3Uri, callback)
{
    return new HtmlFile(pathOrS3Uri, params.maxAge, params.screen_name, params.dateOutputFormat).transform(tweets, callback);
}

exports.Model = HtmlFile;
exports.transform = transform;
