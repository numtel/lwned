const http = require('http');
const url = require('url');

// Minimal replacement for Express.js

module.exports = class HTMLServer extends http.Server {
  // @param routes        Object<Object<Function>>
  //    Primary Keys map to route path regex
  //    Second Keys map to HTTP method names (e.g. GET, POST...)
  //    Function returns Promise or throws ReqError
  // @param enforceHttps  Boolean
  //    Redirect to HTTPS is request uses HTTP (i.e. prod env)
  constructor(routes, enforceHttps = false) {
    super(async function(req, res) {
      if(enforceHttps && req.headers['x-forwarded-proto'] !== 'https') {
        res.writeHead(302, {'location': 'https://' + req.headers.host + req.url});
        res.end();
        return;
      }

      const parsedUrl = url.parse(req.url, true);
      const routePaths = Object.keys(routes);
      for(let i = 0; i<routePaths.length; i++) {
        const urlMatch = parsedUrl.pathname.match(new RegExp('^' + routePaths[i] + '$'));
        if(urlMatch === null || !(req.method in routes[routePaths[i]])) continue;

        let result;
        try {
          result = await routes[routePaths[i]][req.method].call(this, req, urlMatch, parsedUrl);
        } catch(error) {
          if(error instanceof ReqError) {
            res.writeHead(error.httpCode, {'Content-Type': 'text/plain'});
            res.end(error.message);
          } else {
            this.emit('error', error);
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end('Internal Server Error');
          }
          return;
        }
        if(typeof result === 'string') {
          res.writeHead(200, {'Content-Type': 'text/html'});
          res.end(result);
        } else {
          res.writeHead(200, {'Content-Type': result.mime});
          res.end(result.data);
        }
        return;
      }
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('Not Found');
    });
  }
}

class ReqError extends Error {
  constructor(code, msg) {
    super(msg);
    this.httpCode = code;
  }
}
module.exports.ReqError = ReqError;
