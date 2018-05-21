const JsonFile = require('./models/JsonFile');
const HtmlFile = require('./models/HtmlFile');
const reHtml = /\.html/i;

function transform(tweets, params, pathOrS3Uri, callback)
{
    if(pathOrS3Uri.match(reHtml)) {
        return HtmlFile.transform.apply(null, arguments);
    }
    else {
        return JsonFile.transform.apply(null, arguments);
    }
}

exports.transform = transform;
