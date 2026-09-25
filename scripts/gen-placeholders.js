// Generates a valid PNG placeholder for every name in scripts/image-list.json
// so the quiz never shows a broken image. Run after download attempts.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = 'public/images/quiz';
fs.mkdirSync(outDir, { recursive: true });
const items = JSON.parse(fs.readFileSync('scripts/image-list.json', 'utf8'));

// Minimal 1x1 transparent PNG
const png1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

let written = 0, skipped = 0;
for (const item of items) {
  const p = path.join(outDir, item.name);
  if (fs.existsSync(p) && fs.statSync(p).size > 1000) { skipped++; continue; }
  fs.writeFileSync(p, png1x1);
  written++;
}
console.log('placeholders written:', written, 'skipped (already real):', skipped);
