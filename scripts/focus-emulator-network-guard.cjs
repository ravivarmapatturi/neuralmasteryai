// Loaded before Vitest and inherited by its workers. Test SDK traffic may
// connect only to loopback; dependency installation/emulator downloads run
// outside this guard.
const net = require('node:net');
const dns = require('node:dns');
const local = host => ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
const check = host => {
  if (!local(host)) throw new Error(`Focus emulator blocked non-loopback connection: ${host}`);
};
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  if (typeof first === 'object' && first !== null) {
    if (!first.path) check(first.host || first.hostname || 'localhost');
  } else if (typeof first === 'number') check(typeof args[1] === 'string' ? args[1] : 'localhost');
  return connect.apply(this, args);
};
const lookup = dns.lookup;
dns.lookup = function (host, ...args) { check(host); return lookup.call(this, host, ...args); };
if (global.fetch) {
  const fetch = global.fetch;
  global.fetch = (input, options) => { check(new URL(typeof input === 'string' || input instanceof URL ? input : input.url).hostname); return fetch(input, options); };
}
