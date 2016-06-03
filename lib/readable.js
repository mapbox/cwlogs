var AWS = require('aws-sdk');
var stream = require('stream');

module.exports = readable;

function invalid() {
  throw new Error('options must include: region, group, and optionally, start, end, pattern, retry, messages');
}

/**
 * Provide a readable stream of log events for a particular log group
 *
 * @memberof cwlogs
 * @param {object} options - default Node.js [ReadableStream options](https://nodejs.org/api/stream.html#stream_class_stream_readable_1)
 * with extensions detailed below.
 * @param {string} options.group - the name of the LogGroup to read
 * @param {string} options.region - the AWS region in which the LogGroup resides
 * @param {string} [options.pattern] - a search string to use to filter log events
 * @param {number} [options.start=15 minutes ago] - read log events after the provided time (in ms since since Jan 01 1970)
 * @param {number} [options.start=now] - read log events until the provided time (in ms since since Jan 01 1970)
 * @param {boolean} [options.messages=false] - if set to true, the stream will be in objectMode: false and will provide only log event messages
 * @param {function} [options.retry] - a function to handle retry events from AWS requests
 * @returns {object} a Node.js [ReadableStream](https://nodejs.org/api/stream.html#stream_class_stream_readable_1)
 * @example
 * var readable = cwlogs.readable({
 *   group: '/aws/lambda/my-lambda-function-name',
 *   region: 'us-east-1',
 *   messages: true,
 *   start: 1464984431610,
 *   end: 1464985321508,
 *   pattern: 'error'
 * });
 * readable.pipe(process.stdout);
 */
function readable(options) {
  options = options || {};

  if (!options.region || typeof options.region !== 'string') return invalid();
  if (!options.group || typeof options.group !== 'string') return invalid();
  if (options.start && typeof options.start !== 'number') return invalid();
  if (options.end && typeof options.end !== 'number') return invalid();
  if (options.pattern && typeof options.pattern !== 'string') return invalid();
  if (options.retry && typeof options.retry !== 'function') return invalid();
  if (options.messages && typeof options.messages !== 'boolean') return invalid();

  options.objectMode = !options.messages;
  options.start = options.start || Date.now() - 15 * 60 * 1000;
  options.end = options.end || Date.now();
  options.retry = options.retry || function() {};

  var logs = new AWS.CloudWatchLogs({ region: options.region });
  var params = {
    logGroupName: options.group,
    endTime: options.end,
    filterPattern: options.pattern,
    interleaved: true,
    startTime: options.start
  };

  var logStream = new stream.Readable(options);
  var nextRequest = logs.filterLogEvents(params);
  var pending = false;
  var events = [];

  function makeRequest(request) {
    pending = true;

    request
      .once('error', function(err) { logStream.emit('error', err); })
      .on('retry', options.retry)
      .once('success', function(response) {
        pending = false;
        nextRequest = response.hasNextPage() ? response.nextPage() : false;

        for (var i = 0; i < response.data.events.length; i++) {
          var item = options.messages ?
            response.data.events[i].message : response.data.events[i];
          events.push(item);
        }

        logStream._read();
      }).send();
  }

  logStream._read = function() {
    var status = true;
    while (status && events.length) status = logStream.push(events.shift());
    if (events.length) return;
    if (!nextRequest) return logStream.push(null);
    if (status && !pending) makeRequest(nextRequest);
  };

  return logStream;
}
