const twamp = require('./src/twamp');
const processor = require('./src/processor');

function handler(event, context, callback)
{
    twamp.handle(process.env, processor.transform, callback);
}

exports.handler = handler;
