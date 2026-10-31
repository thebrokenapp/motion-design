// Loaded before Remotion Studio (tools/studio.mjs). Studio always listens on every network interface and has no option
// to change that, but it has no login and can edit the project's files. So a listen on all interfaces becomes a listen
// on this machine only.
const net = require("node:net");

const LOCAL = "127.0.0.1";
const wildcard = (host) => host === undefined || host === null || host === "" || host === "::" || host === "0.0.0.0";
const listen = net.Server.prototype.listen;
net.Server.prototype.listen = function (first, ...rest) {
  if (first && typeof first === "object" && first.path === undefined && first.fd === undefined && !first._handle && wildcard(first.host)) {
    return listen.call(this, { ...first, host: LOCAL }, ...rest);
  }
  if (typeof first === "number" || (typeof first === "string" && /^\d+$/.test(first))) {
    const host = typeof rest[0] === "string" ? rest.shift() : undefined;
    return listen.call(this, first, wildcard(host) ? LOCAL : host, ...rest);
  }
  return listen.call(this, first, ...rest);
};
