#!/usr/bin/env node

var cwlogs = require('..');
var minimist = require('minimist', {
  number: ['end', 'e', 'start', 's'],
  boolean: ['help', 'h']
});

var args = minimist(process.argv.slice(2));

function invalid(msg, command) {
  if (msg) console.error('Error: %s', msg);
  console.error('');

  if (command === 'read') {
    console.error('USAGE: cwlogs read [OPTIONS] log-group [pattern]');
    console.error('');
    console.error('log-group            the region and name of the log group, eg us-east-1:my-group-name');
    console.error('(optional) pattern   a search pattern to limit returned logs');
    console.error('');
    console.error('Options:');
    console.error(' --start, -s         start time in ms');
    console.error(' --end, -e           end time in ms');
  } else {
    console.error('USAGE: cwlogs command');
    console.error('');
    console.error('Commands:');
    console.error(' read                read logs from a group');
  }

  process.exit(msg ? 1 : 0);
}

var commands = ['read'];
var command = args._[0];

if (args.help || args.h) return invalid(null, command);

if (commands.indexOf(command) === -1) return invalid('Invalid command ' + command, command);

if (command === 'read') {
  if (!args._[1]) return invalid('Missing log group region and name', command);

  var options = {
    region: args._[1].split(':')[0],
    group: args._[1].split(':')[1],
    pattern: args._[2],
    start: args.start || args.s,
    end: args.end || args.e,
    messages: true
  };

  cwlogs.readable(options).pipe(process.stdout);
}
