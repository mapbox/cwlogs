var AWS = require('aws-sdk-mock');
var test = require('tape');
var cwlogs = require('..');
var events = require('events');
var stream = require('stream');

function writable(objectMode, delay) {
  var writer = new stream.Writable({ objectMode: objectMode });
  writer.chunks = [];
  writer._write = function(chunk, enc, callback) {
    writer.chunks.push(chunk);
    setTimeout(callback, delay);
  };
  return writer;
}

test('[readable] parameter validation & defaults', function(assert) {
  assert.throws(function() {
    cwlogs.readable();
  }, /region/, 'region is required');
  assert.throws(function() {
    cwlogs.readable({ region: 1 });
  }, /region/, 'region is required to be a string');

  assert.throws(function() {
    cwlogs.readable({ region: '-' });
  }, /group/, 'group is required');
  assert.throws(function() {
    cwlogs.readable({ region: '-', group: 1 });
  }, /group/, 'group is required to be a string');

  assert.throws(function() {
    cwlogs.readable({ region: '-', group: '-', start: '-' });
  }, /start/, 'start is required to be a number');

  assert.throws(function() {
    cwlogs.readable({ region: '-', group: '-', start: 1, end: '-' });
  }, /end/, 'end is required to be a number');

  assert.throws(function() {
    cwlogs.readable({ region: '-', group: '-', start: 1, end: 2, pattern: 1 });
  }, /pattern/, 'pattern is required to be a string');

  assert.throws(function() {
    cwlogs.readable({ region: '-', group: '-', start: 1, end: 2, pattern: '-', retry: 1 });
  }, /retry/, 'retry is required to be a function');

  assert.throws(function() {
    cwlogs.readable({ region: '-', group: '-', start: 1, end: 2, pattern: '-', retry: function() {}, messages: 1 });
  }, /messages/, 'messages is required to be a boolean');

  assert.doesNotThrow(function() {
    cwlogs.readable({ region: '-', group: '-', start: 1, end: 2, pattern: '-', retry: function() {}, messages: true });
  }, 'acceptable paramters');

  var options = { region: '-', group: '-' };
  cwlogs.readable(options);
  assert.ok(options.objectMode, 'sets objectMode');
  assert.ok(options.start, 'sets start');
  assert.ok(options.end, 'sets end');
  assert.ok(options.retry, 'sets retry');

  assert.end();
});

test('[readable] aws-sdk error', function(assert) {
  AWS.mock('CloudWatchLogs', 'filterLogEvents', function() {
    var req = new events.EventEmitter();
    req.send = function() {
      setTimeout(function() {
        req.emit('error', new Error('mock error'));
      }, 200);
    };
    return req;
  });

  cwlogs.readable({ region: '-', group: '-' })
    .on('error', function(err) {
      assert.equal(err.message, 'mock error', 'emits error events');
      AWS.restore('CloudWatchLogs');
      assert.end();
    }).resume();
});

test('[readable] works for several pages', function(assert) {
  var count = 0;

  AWS.mock('CloudWatchLogs', 'filterLogEvents', function() {
    return (function makeRequest() {
      var req = new events.EventEmitter();
      req.send = function() {
        setTimeout(function() {
          count++;
          var res = { data: { events: [] } };
          for (var i = 0; i < 5000; i++) res.data.events.push({ 'message': i });
          res.hasNextPage = function() { return count < 2; };
          if (res.hasNextPage()) res.nextPage = function() { return makeRequest(); };
          req.emit('success', res);
        }, 10);
      };
      return req;
    })();
  });

  var writer = writable(30);

  cwlogs.readable({ group: '-', region: '-' })
      .on('error', function(err) { assert.end(err); })
    .pipe(writer)
      .on('finish', function() {
        assert.pass('finished without error');
        assert.equal(writer.chunks.length, 10000, 'got all events');
        AWS.restore('CloudWatchLogs');
        assert.end();
      });
});

test('[readable] messages strips object wrappers', function(assert) {
  AWS.mock('CloudWatchLogs', 'filterLogEvents', function() {
    var req = new events.EventEmitter();
    req.send = function() {
      setTimeout(function() {
        var res = { data: { events: [] } };
        for (var i = 0; i < 1000; i++) res.data.events.push({ 'message': i.toString() });
        res.hasNextPage = function() { return false; };
        req.emit('success', res);
      }, 10);
    };
    return req;
  });

  var writer = writable(10);

  cwlogs.readable({ group: '-', region: '-', messages: true })
      .on('error', function(err) { assert.end(err); })
    .pipe(writer)
      .on('finish', function() {
        assert.pass('finished without error');
        assert.equal(writer.chunks.length, 1000, 'got all events');
        assert.ok(writer.chunks.every(function(chunk, i) {
          return chunk.toString() === i.toString();
        }), 'only returned .message for each event');
        AWS.restore('CloudWatchLogs');
        assert.end();
      });
});

test('[readable] default retry handler is ok', function(assert) {
  var retries = 0;
  AWS.mock('CloudWatchLogs', 'filterLogEvents', function() {
    var req = new events.EventEmitter();
    req.send = function() {
      setTimeout(function() {
        retries++;
        if (retries === 1) req.emit('retry');
        var res = { data: { events: [] } };
        for (var i = 0; i < 1000; i++) res.data.events.push({ 'message': i.toString() });
        res.hasNextPage = function() { return false; };
        req.emit('success', res);
      }, 10);
    };
    return req;
  });

  cwlogs.readable({ group: '-', region: '-' })
    .on('error', function(err) { assert.end(err); })
    .on('end', function() {
      assert.pass('completed successfully');
      AWS.restore('CloudWatchLogs');
      assert.end();
    }).resume();
});
