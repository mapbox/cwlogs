# cwlogs

[![Build Status](https://travis-ci.org/mapbox/cwlogs.svg?branch=master)](https://travis-ci.org/mapbox/cwlogs)

Node.js stream-based access to CloudWatch Logs.

## Node.js API

### cwlogs

The cwlogs module

**Examples**

```javascript
var cwlogs = require('cwlogs');
```

#### readable

Provide a readable stream of log events for a particular log group

**Parameters**

-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** default Node.js [ReadableStream options](https://nodejs.org/api/stream.html#stream_class_stream_readable_1)
    with extensions detailed below.
    -   `options.group` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the name of the LogGroup to read
    -   `options.logStreamNames` An optional array of log stream name
    -   `options.region` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the AWS region in which the LogGroup resides
    -   `options.pattern` **\[[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)]** a search string to use to filter log events
    -   `options.start` **\[[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)]** read log events after the provided time (in ms since since Jan 01 1970) (optional, default `15minutesago`)
    -   `options.start` **\[[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)]** read log events until the provided time (in ms since since Jan 01 1970) (optional, default `now`)
    -   `options.messages` **\[[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)]** if set to true, the stream will be in objectMode: false and will provide only log event messages (optional, default `false`)
    -   `options.retry` **\[[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)]** a function to handle retry events from AWS requests

**Examples**

```javascript
var readable = cwlogs.readable({
  group: '/aws/lambda/my-lambda-function-name',
  region: 'us-east-1',
  messages: true,
  start: 1464984431610,
  end: 1464985321508,
  pattern: 'error'
});
readable.pipe(process.stdout);
```

Returns **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** a Node.js [ReadableStream](https://nodejs.org/api/stream.html#stream_class_stream_readable_1)

## CLI tool

work-in-progress
