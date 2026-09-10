const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', 'dist', 'browser');
const port = Number(process.env.PORT) || 4173;
const host = process.env.HOST || '127.0.0.1';
const type = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function resolveRequestPath(rootDir, rawUrl = '/') {
  let url;
  try {
    url = decodeURIComponent(String(rawUrl || '/').split('?')[0]);
  } catch {
    return { status: 400 };
  }

  const relativeUrl = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
  const file = path.resolve(rootDir, relativeUrl);
  const relative = path.relative(rootDir, file);
  const escapesRoot =
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative);

  if (escapesRoot) return { status: 403 };
  return { status: 200, file };
}

function buildBrowser() {
  execFileSync(process.execPath, [path.join(__dirname, 'browser-build.cjs')], {
    stdio: 'inherit',
  });
}

function createServer(rootDir = root) {
  return http.createServer((req, res) => {
    const resolved = resolveRequestPath(rootDir, req.url);
    if (resolved.status !== 200) {
      res.writeHead(resolved.status);
      res.end(String(resolved.status));
      return;
    }

    fs.readFile(resolved.file, (err, body) => {
      if (err) {
        res.writeHead(404);
        res.end('404');
        return;
      }
      res.writeHead(200, {
        'Content-Type': type[path.extname(resolved.file)] || 'text/plain; charset=utf-8',
      });
      res.end(body);
    });
  });
}

function startServer() {
  buildBrowser();
  const server = createServer(root);
  server.listen(port, host, () => console.log(`http://${host}:${port}`));
  return server;
}

if (require.main === module) startServer();

module.exports = {
  createServer,
  resolveRequestPath,
  startServer,
};
