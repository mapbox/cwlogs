var AWS = require('aws-sdk');
var stream = require('stream');

module.exports = readable;

function invalid() {
  throw new Error('options must include: region, group, and optionally, start, end, pattern, retry, messages');
}

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
