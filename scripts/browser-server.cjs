const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');

execFileSync(process.execPath, [path.join(__dirname, 'browser-build.cjs')], { stdio: 'inherit' });

const root = path.join(__dirname, '..', 'dist', 'browser');
const port = Number(process.env.PORT) || 4173;
const type = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = path.resolve(root, url === '/' ? 'index.html' : url.slice(1));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end('403');
      return;
    }
    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404);
        res.end('404');
        return;
      }
      res.writeHead(200, { 'Content-Type': type[path.extname(file)] || 'text/plain; charset=utf-8' });
      res.end(body);
    });
  })
  .listen(port, () => console.log(`http://localhost:${port}`));
