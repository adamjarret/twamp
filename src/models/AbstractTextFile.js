const fs = require('fs');
const util = require('util');
const aws = require('aws-sdk');
const s3 = new aws.S3();
const re = /s3:\/\/([^/]+)\/?(.*)\/?/i;

function AbstractTextFile(pathOrS3Uri, maxAge)
{
    this.maxAge = parseInt(maxAge, 10);

    const s3UriParts = splitS3Uri(pathOrS3Uri);
    if (s3UriParts) {
        this.load = function (callback) {
            s3.getObject(s3UriParts, function (error, data) {
                callback(error, error ? null : data.Body.toString('utf8'));
            });
        };
        this.save = function (callback) {
            s3.putObject(Object.assign({
                Body: Buffer.from(this.render(), 'utf8')
            }, this.headers(), s3UriParts), callback);
        };
    }
    else {
        this.load = function (callback) {
            fs.readFile(pathOrS3Uri, 'utf8', callback);
        };
        this.save = function (callback) {
            fs.writeFile(pathOrS3Uri, this.render(), 'utf8', callback);
        };
    }

    this.log = function () {
        // Prepend uri to log message (messages may be logged asynchronously)
        console.log.apply(null, [pathOrS3Uri].concat(Array.prototype.slice.call(arguments)));
    };
}

Object.assign(AbstractTextFile.prototype, {
    render: function () {
        // Subclasses should override this
        return '';
    },
    headers: function () {
        // Subclasses should override this
        const s3Headers = {
            ContentType: 'text/plain; charset=utf-8'
        };
        if (!isNaN(this.maxAge)) {
            s3Headers.CacheControl = util.format('max-age=%d', this.maxAge)
        }
        return s3Headers;
    }
});

function isS3Uri(s3Uri)
{
    return !s3Uri ? false : s3Uri.match(re);
}

function splitS3Uri(s3Uri)
{
    const matches = isS3Uri(s3Uri);
    return !matches ? null : {
        Bucket: matches[1],
        Key: matches[2]
    };
}

exports.Model = AbstractTextFile;
exports.isS3Uri = isS3Uri;
exports.splitS3Uri = splitS3Uri;
