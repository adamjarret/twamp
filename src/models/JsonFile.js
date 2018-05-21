const AbstractTextFile = require('./AbstractTextFile').Model;

function JsonFile(pathOrS3Uri, maxAge, indent)
{
    AbstractTextFile.call(this, pathOrS3Uri, maxAge);

    const indentInt = parseInt(indent, 10);
    this.indent = isNaN(indentInt) ? 0 : indentInt;
}

Object.assign(JsonFile.prototype, AbstractTextFile.prototype, {
    render: function () {
        return JSON.stringify(this.tweets, null, this.indent);
    },
    headers: function () {
        const s3Headers = AbstractTextFile.prototype.headers.call(this);
        s3Headers.ContentType = 'application/json';
        return s3Headers;
    },
    transform: function (tweets, callback) {
        this.tweets = tweets;
        this.save(callback);
        return this;
    }
});

function transform(tweets, params, pathOrS3Uri, callback)
{
    return new JsonFile(pathOrS3Uri, params.maxAge, params.indent).transform(tweets, callback);
}

exports.Model = JsonFile;
exports.transform = transform;
