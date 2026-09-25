// Copies existing flags from public/images/flags/*.png into public/images/quiz/geo_Flag_of_X.svg.png
const fs = require('fs');
const path = require('path');

const items = JSON.parse(fs.readFileSync('scripts/image-list.json', 'utf8'));
const srcDir = 'public/images/flags';
const outDir = 'public/images/quiz';
fs.mkdirSync(outDir, { recursive: true });

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

function countryFromFlagName(name) {
  const m = name.match(/Flag_of_(.+?)\.svg\.png$/i);
  if (!m) return null;
  return m[1].toLowerCase().replace(/_/g, ' ');
}

let ok = 0, missing = 0;
for (const item of items) {
  if (item.kind !== 'flag') continue;
  const p = path.join(outDir, item.name);
  if (fs.existsSync(p) && fs.statSync(p).size > 1000) continue;
  const country = countryFromFlagName(item.name);
  const iso = country ? MAP[country] : null;
  const src = path.join(srcDir, (iso || '') + '.png');
  if (iso && fs.existsSync(src) && fs.statSync(src).size > 100) {
    fs.copyFileSync(src, p);
    ok++;
  } else {
    console.log('MISSING', item.name, iso);
    missing++;
  }
}
console.log('COPIED ok=' + ok + ' missing=' + missing);
