// Downloads country flags from flagpedia (works from this network) into public/images/quiz/
const fs = require('fs');
const path = require('path');
const https = require('https');

const outDir = 'public/images/quiz';
fs.mkdirSync(outDir, { recursive: true });
const items = JSON.parse(fs.readFileSync('scripts/image-list.json', 'utf8'));

function dl(url, dest) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 FootballQuiz' }, timeout: 15000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        return dl(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { res.resume(); return resolve([false, res.statusCode]); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (buf.length < 200) { return resolve([false, 'tiny:' + buf.length]); }
        fs.writeFileSync(dest, buf);
        resolve([true, buf.length]);
      });
    });
    req.on('error', (e) => resolve([false, e.message]));
    req.on('timeout', () => { req.destroy(); resolve([false, 'timeout']); });
  });
}

// flagpedia code = 2-letter ISO country code, lowercased
const MAP = {
  brazil: 'br', russia: 'ru', japan: 'jp', argentina: 'ar', canada: 'ca',
  italy: 'it', mexico: 'mx', india: 'in', 'south korea': 'kr', norway: 'no',
  egypt: 'eg', 'new zealand': 'nz', sweden: 'se', turkey: 'tr', france: 'fr',
  spain: 'es', germany: 'de', 'united kingdom': 'gb', 'united states': 'us',
  portugal: 'pt', greece: 'gr', croatia: 'hr', poland: 'pl', czechia: 'cz',
  austria: 'at', netherlands: 'nl', denmark: 'dk', finland: 'fi', iceland: 'is',
  ukraine: 'ua', kazakhstan: 'kz', uzbekistan: 'uz', azerbaijan: 'az',
  armenia: 'am', georgia: 'ge', 'saudi arabia': 'sa', iran: 'ir',
  morocco: 'ma', algeria: 'dz', tunisia: 'tn', senegal: 'sn', ghana: 'gh',
  nigeria: 'ng', kenya: 'ke', 'south africa': 'za', ethiopia: 'et',
  'dr congo': 'cd', chile: 'cl', peru: 'pe', colombia: 'co', venezuela: 've',
  paraguay: 'py', bolivia: 'bo', uruguay: 'uy', ecuador: 'ec'
};

// name like geo_z4c9_geo_Flag_of_Brazil.svg.png -> Brazil
function countryFromFlagName(name) {
  const m = name.match(/Flag_of_(.+?)\.svg\.png$/i);
  if (!m) return null;
  return m[1].toLowerCase().replace(/_/g, ' ');
}

(async () => {
  let ok = 0, fail = 0, skip = 0;
  for (const item of items) {
    if (item.kind !== 'flag') continue;
    const country = countryFromFlagName(item.name);
    const iso = country ? MAP[country] : null;
    if (!iso) { console.log('NO-ISO', item.name, country); fail++; continue; }
    const p = path.join(outDir, item.name);
    if (fs.existsSync(p) && fs.statSync(p).size > 1000) { skip++; continue; }
    const res = await dl(`https://flagpedia.net/data/flags/w580/${iso}.png`, p);
    if (res[0]) { console.log('OK', item.name, res[1]); ok++; }
    else { console.log('FAIL', item.name, res[1]); fail++; }
  }
  console.log('FLAGS ok=' + ok + ' fail=' + fail + ' skip=' + skip);
  process.exit(0);
})();
