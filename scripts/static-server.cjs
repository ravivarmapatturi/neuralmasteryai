#!/usr/bin/env node
// A minimal static file server that reproduces GitHub Pages' actual
// behavior for dist/ -- specifically the two things `vite preview` gets
// wrong for our purposes:
//   1. vite preview silently rewrites any unmatched path to index.html
//      (an SPA-friendly dev convenience). GitHub Pages does NOT do this --
//      it serves dist/404.html (if present) with a real HTTP 404 status for
//      any path that isn't a literal file on disk.
//   2. (Historical) when this served from a GitHub Pages project-site
//      subpath (/NeuralMastery-vite/) rather than the custom domain's own
//      root, this also reproduced that base-path stripping. BASE is '' now
//      that the site serves from the domain root -- kept as a real
//      parameter (not deleted) since resolveRelPath is still exercised
//      with a non-empty base in its own unit tests.
// Used both for local `npm run serve:dist` verification and as Playwright's
// CI webServer, so smoke tests exercise the exact production-shaped
// behavior (base path + 404-fallback deep links), not the dev server's
// more forgiving one.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { resolveRelPath, isWithinRoot, redirectLocation } = require('./lib/staticServerPaths.cjs');

const DIST = path.resolve(__dirname, '..', 'dist');
const BASE = '';
const PORT = Number(process.env.PORT) || 4173;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.opus': 'audio/ogg; codecs=opus',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
};

function send(res, status, filePath) {
  const ext = path.extname(filePath);
  res.writeHead(status, { 'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  const rel = resolveRelPath(pathname, BASE);
  if (rel === null) {
    // Outside the configured base path -- GitHub Pages project sites don't
    // serve anything here either.
    const notFound = path.join(DIST, '404.html');
    if (fs.existsSync(notFound)) return send(res, 404, notFound);
    res.writeHead(404);
    return res.end('Not found');
  }

  const filePath = path.join(DIST, rel);
  // Guard against escaping dist/ via '..' segments.
  if (!isWithinRoot(filePath, DIST)) {
    res.writeHead(400);
    return res.end('Bad request');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return send(res, 200, filePath);
  }

  // Real GitHub Pages behavior, confirmed directly against production
  // (curl -I on a bare directory path returns a real 301): a bare path with
  // no trailing slash 301-redirects to the trailing-slash form when
  // `<path>/index.html` exists on disk, before falling through to 404. This
  // matters for testing the static-prerendered /docs/* pages locally --
  // without reproducing it here, a passing local check wouldn't actually
  // prove the deployed site behaves the same way.
  if (!pathname.endsWith('/')) {
    const asDir = path.join(DIST, rel, 'index.html');
    if (isWithinRoot(asDir, DIST) && fs.existsSync(asDir) && fs.statSync(asDir).isFile()) {
      res.writeHead(301, { Location: redirectLocation(pathname, url.search) });
      return res.end();
    }
  }

  // Real GitHub Pages behavior for any unmatched path: serve 404.html with
  // a 404 status (not 200, not a silent index.html rewrite).
  const notFound = path.join(DIST, '404.html');
  if (fs.existsSync(notFound)) return send(res, 404, notFound);
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`static-server: serving ${DIST} at http://localhost:${PORT}${BASE}/ (GitHub Pages-shaped: real 404s, no SPA fallback rewrite)`);
});
