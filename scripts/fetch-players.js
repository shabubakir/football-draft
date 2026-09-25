// Downloads player photos from Wikipedia thumbnails (via Code Mode proxy) into public/images/quiz/
const fs = require('fs');
const path = require('path');

const outDir = 'public/images/quiz';
fs.mkdirSync(outDir, { recursive: true });
const urls = JSON.parse(fs.readFileSync('scripts/player-photo-urls.json', 'utf8'));

async function main() {
  let ok = 0, fail = 0, skip = 0;
  for (const [name, url] of Object.entries(urls)) {
    const p = path.join(outDir, name);
    if (fs.existsSync(p) && fs.statSync(p).size > 5000) { skip++; continue; }
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        console.log('FAIL', name, res.status);
        fail++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5000) {
        console.log('SKIP small', name, buf.length);
        fail++;
        continue;
      }
      fs.writeFileSync(p, buf);
      console.log('OK', name, buf.length);
      ok++;
    } catch (e) {
      console.log('ERR', name, e.message);
      fail++;
    }
  }
  console.log('DONE ok=' + ok + ' fail=' + fail + ' skip=' + skip);
  process.exit(0);
}

main();
