// Fetches images for visual quiz questions using Code Mode proxy (bypasses wiki block)
const fs = require('fs');
const path = require('path');

const outDir = 'public/images/quiz';
fs.mkdirSync(outDir, { recursive: true });

const items = JSON.parse(fs.readFileSync('scripts/image-list.json', 'utf8'));

const done = new Set(fs.readdirSync(outDir));

async function main() {
  let ok = 0, fail = 0, skip = 0;
  for (const item of items) {
    if (done.has(item.name)) { skip++; continue; }
    try {
      const res = await fetch(item.url, { method: 'GET' });
      if (!res.ok) {
        console.log('FAIL', item.name, res.status);
        fail++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) {
        console.log('SKIP small', item.name, buf.length);
        fail++;
        continue;
      }
      fs.writeFileSync(path.join(outDir, item.name), buf);
      console.log('OK', item.name, buf.length);
      ok++;
    } catch (e) {
      console.log('ERR', item.name, e.message);
      fail++;
    }
  }
  console.log('DONE ok=' + ok + ' fail=' + fail + ' skip=' + skip);
  process.exit(0);
}

main();
