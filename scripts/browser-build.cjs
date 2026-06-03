const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'renderer');
const out = path.join(__dirname, '..', 'dist', 'browser');
const files = ['index.html', 'styles.css', 'data.js', 'logic.js', 'app.js'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const file of files) fs.copyFileSync(path.join(src, file), path.join(out, file));
