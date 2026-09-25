// Generates real SVG flags (rendered to PNG via sharp? no - we'll write .svg files and reference them)
// Actually browsers render SVG fine, so we write .svg files for flags instead of .png
const fs = require('fs');
const path = require('path');

const outDir = 'public/images/quiz';
fs.mkdirSync(outDir, { recursive: true });
const items = JSON.parse(fs.readFileSync('scripts/image-list.json', 'utf8'));

function flagSvg(stops) {
  // stops: array of {h: heightFrac, fill: '#hex'} - horizontal bands
  let rects = '';
  let y = 0;
  for (const s of stops) {
    const h = (s.h * 60).toFixed(1);
    rects += `<rect x="0" y="${y.toFixed(1)}" width="90" height="${h}" fill="${s.fill}"/>`;
    y += s.h * 60;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#fff"/>${rects}</svg>`;
}

function circleFlag(bg, circleColor) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="${bg}"/><circle cx="45" cy="30" r="15" fill="${circleColor}"/></svg>`;
}

const FLAGS = {
  brazil: null, // complex - handle below
  russia: flagSvg([{ h: 1/3, fill: '#fff' }, { h: 1/3, fill: '#0039a6' }, { h: 1/3, fill: '#d52b1e' }]),
  japan: circleFlag('#fff', '#bc002d'),
  argentina: flagSvg([{ h: 1/3, fill: '#74acdf' }, { h: 1/3, fill: '#fff' }, { h: 1/3, fill: '#74acdf' }]),
  canada: null, // complex
  italy: flagSvg([{ h: 1, fill: '#009246' }, ]), // vertical - fix below
  mexico: null,
  india: flagSvg([{ h: 1/3, fill: '#ff9933' }, { h: 1/3, fill: '#fff' }, { h: 1/3, fill: '#138808' }]),
  'south korea': null,
  norway: null,
  egypt: flagSvg([{ h: 1/3, fill: '#ce1126' }, { h: 1/3, fill: '#fff' }, { h: 1/3, fill: '#000' }]),
  'new zealand': null,
  sweden: null,
  turkey: null,
  france: null,
  spain: flagSvg([{ h: 1/4, fill: '#aa151b' }, { h: 1/2, fill: '#f1bf00' }, { h: 1/4, fill: '#aa151b' }]),
  germany: flagSvg([{ h: 1/3, fill: '#000' }, { h: 1/3, fill: '#dd0000' }, { h: 1/3, fill: '#ffce00' }]),
  'united kingdom': null,
  'united states': null,
  portugal: null,
  greece: null,
  croatia: null,
  poland: flagSvg([{ h: 1/2, fill: '#fff' }, { h: 1/2, fill: '#dc143c' }]),
  czechia: null,
  austria: flagSvg([{ h: 1/3, fill: '#ed2939' }, { h: 1/3, fill: '#fff' }, { h: 1/3, fill: '#ed2939' }]),
  netherlands: flagSvg([{ h: 1/3, fill: '#ae1c28' }, { h: 1/3, fill: '#fff' }, { h: 1/3, fill: '#21468b' }]),
  denmark: null,
  finland: null,
  iceland: null,
  ukraine: flagSvg([{ h: 1/2, fill: '#0057b7' }, { h: 1/2, fill: '#ffd700' }]),
  kazakhstan: null,
  uzbekistan: null,
  azerbaijan: null,
  armenia: flagSvg([{ h: 1/3, fill: '#f2b417' }, { h: 1/3, fill: '#d90012' }, { h: 1/3, fill: '#0033a0' }]),
  georgia: null,
  'saudi arabia': null,
  iran: flagSvg([{ h: 1/3, fill: '#239f40' }, { h: 1/3, fill: '#fff' }, { h: 1/3, fill: '#da0000' }]),
  morocco: null,
  algeria: flagSvg([{ h: 1, fill: '#006233' }, ]),
  tunisia: null,
  senegal: null,
  ghana: flagSvg([{ h: 1/3, fill: '#ce1126' }, { h: 1/3, fill: '#fcd116' }, { h: 1/3, fill: '#006b3f' }]),
  nigeria: null,
  kenya: null,
  'south africa': null,
  ethiopia: flagSvg([{ h: 1/3, fill: '#078930' }, { h: 1/3, fill: '#fcdd09' }, { h: 1/3, fill: '#da121a' }]),
  'dr congo': null,
  chile: null,
  peru: flagSvg([{ h: 1, fill: '#d91023' }, ]),
  colombia: flagSvg([{ h: 1/2, fill: '#fcd116' }, { h: 1/4, fill: '#003893' }, { h: 1/4, fill: '#ce1126' }]),
  venezuela: flagSvg([{ h: 1/3, fill: '#ffcc00' }, { h: 1/3, fill: '#00247d' }, { h: 1/3, fill: '#cf142b' }]),
  paraguay: flagSvg([{ h: 1/3, fill: '#d52b1e' }, { h: 1/3, fill: '#fff' }, { h: 1/3, fill: '#0038a8' }]),
  bolivia: flagSvg([{ h: 1/3, fill: '#d52b1e' }, { h: 1/3, fill: '#f9e300' }, { h: 1/3, fill: '#007934' }]),
  uruguay: null,
  ecuador: flagSvg([{ h: 1/2, fill: '#fcd116' }, { h: 1/4, fill: '#0033a0' }, { h: 1/4, fill: '#d41e29' }])
};

// Special flags with crosses
function crossFlag(bg, crossColor, v) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="${bg}"/>${v ? '' : ''}<rect x="32" y="0" width="26" height="60" fill="${crossColor}"/><rect x="0" y="17" width="90" height="26" fill="${crossColor}"/></svg>`;
}
// Nordic cross (shifted left)
function nordicCross(bg, crossColor) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="${bg}"/><rect x="25" y="0" width="18" height="60" fill="${crossColor}"/><rect x="0" y="21" width="90" height="18" fill="${crossColor}"/></svg>`;
}
// Vertical tricolor
function vtri(c1, c2, c3) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="30" height="60" fill="${c1}"/><rect x="30" width="30" height="60" fill="${c2}"/><rect x="60" width="30" height="60" fill="${c3}"/></svg>`;
}

FLAGS.brazil = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#009c3b"/><polygon points="45,6 84,30 45,54 6,30" fill="#ffdf00"/><circle cx="45" cy="30" r="14" fill="#002776"/></svg>`;
FLAGS.canada = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="22.5" height="60" fill="#d52b1e"/><rect x="22.5" width="45" height="60" fill="#fff"/><rect x="67.5" width="22.5" height="60" fill="#d52b1e"/><polygon points="45,18 48,28 58,28 50,34 53,44 45,38 37,44 40,34 32,28 42,28" fill="#d52b1e"/></svg>`;
FLAGS.italy = vtri('#009246', '#fff', '#ce2b37');
FLAGS.mexico = vtri('#006847', '#fff', '#ce1126');
FLAGS['south korea'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#fff"/><circle cx="45" cy="30" r="16" fill="#cd2e3a"/><path d="M29,30 a16,16 0 0,0 32,0 a8,8 0 0,1 -16,0 a8,8 0 0,0 -16,0" fill="#0047a0"/></svg>`;
FLAGS.norway = nordicCross('#ba0c2f', '#fff'); // simplified (no blue)
FLAGS.norway = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#ba0c2f"/><rect x="20" width="28" height="60" fill="#fff"/><rect x="24" width="20" height="60" fill="#00205b"/><rect x="0" y="16" width="90" height="28" fill="#fff"/><rect x="0" y="20" width="90" height="20" fill="#00205b"/></svg>`;
FLAGS['new zealand'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#012169"/><polygon points="45,18 48,28 58,28 50,34 53,44 45,38 37,44 40,34 32,28 42,28" fill="#fff"/></svg>`;
FLAGS.sweden = nordicCross('#006aa7', '#fecc00');
FLAGS.turkey = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#e30a17"/><circle cx="38" cy="30" r="14" fill="#fff"/><circle cx="43" cy="30" r="11" fill="#e30a17"/></svg>`;
FLAGS.france = vtri('#002395', '#fff', '#ed2939');
FLAGS['united kingdom'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#012169"/><path d="M0,0 L90,60 M90,0 L0,60" stroke="#fff" stroke-width="12"/><path d="M0,0 L90,60 M90,0 L0,60" stroke="#c8102e" stroke-width="6"/><rect x="35" width="20" height="60" fill="#fff"/><rect y="20" width="90" height="20" fill="#fff"/><rect x="38" width="14" height="60" fill="#c8102e"/><rect y="23" width="90" height="14" fill="#c8102e"/></svg>`;
FLAGS['united states'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180">${Array.from({length:13},(_,i)=>`<rect y="${i*(60/13)}" width="90" height="${60/13}" fill="${i%2?'#fff':'#b22234'}"/>`).join('')}<rect width="36" height="32" fill="#3c3b6e"/></svg>`;
FLAGS.portugal = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="36" height="60" fill="#006600"/><rect x="36" width="54" height="60" fill="#ff0000"/><circle cx="36" cy="30" r="10" fill="#ffcc00"/></svg>`;
FLAGS.greece = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#0d5eaf"/>${Array.from({length:9},(_,i)=>`<rect y="${i*(60/9)}" width="90" height="${60/9}" fill="${i%2?'#fff':'#0d5eaf'}"/>`).join('')}<rect width="20" height="40" fill="#0d5eaf"/><rect x="6" width="8" height="40" fill="#fff"/><rect y="16" width="20" height="8" fill="#fff"/></svg>`;
FLAGS.croatia = flagSvg([{ h: 1/3, fill: '#ff0000' }, { h: 1/3, fill: '#fff' }, { h: 1/3, fill: '#171796' }]);
FLAGS.czechia = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="30" fill="#fff"/><rect y="30" width="90" height="30" fill="#d7141a"/><polygon points="0,0 45,30 0,60" fill="#11457e"/></svg>`;
FLAGS.denmark = nordicCross('#c8102e', '#fff');
FLAGS.finland = nordicCross('#fff', '#003580');
FLAGS.iceland = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#02529c"/><rect x="18" width="30" height="60" fill="#fff"/><rect x="22" width="22" height="60" fill="#d52024"/><rect x="14" y="18" width="90" height="24" fill="#fff"/><rect x="0" y="22" width="90" height="16" fill="#d52024"/></svg>`;
FLAGS.kazakhstan = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#00afca"/><circle cx="45" cy="30" r="12" fill="#fec50c"/></svg>`;
FLAGS.uzbekistan = flagSvg([{ h: 1/5, fill: '#0099b5' }, { h: 1/5, fill: '#fff' }, { h: 1/5, fill: '#ce1126' }, { h: 1/5, fill: '#fff' }, { h: 1/5, fill: '#1eb53a' }]);
FLAGS.azerbaijan = flagSvg([{ h: 1/3, fill: '#00b5e2' }, { h: 1/3, fill: '#ef3340' }, { h: 1/3, fill: '#54b930' }]);
FLAGS.georgia = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#fff"/><rect x="40" width="10" height="60" fill="#ff0000"/><rect y="25" width="90" height="10" fill="#ff0000"/></svg>`;
FLAGS['saudi arabia'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#006c35"/><rect x="15" y="22" width="60" height="6" fill="#fff"/></svg>`;
FLAGS.morocco = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#c1272d"/><polygon points="45,15 52,30 45,45 38,30" fill="#006233" stroke="#006233" stroke-width="2"/></svg>`;
FLAGS.algeria = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="45" height="60" fill="#fff"/><rect x="45" width="45" height="60" fill="#006233"/><circle cx="45" cy="30" r="12" fill="#d21034"/><circle cx="50" cy="30" r="10" fill="#fff"/></svg>`;
FLAGS.tunisia = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#e70013"/><circle cx="45" cy="30" r="18" fill="#fff"/><circle cx="45" cy="30" r="12" fill="#e70013"/><circle cx="45" cy="30" r="8" fill="#fff"/></svg>`;
FLAGS.senegal = vtri('#00855f', '#fdef42', '#e31b23');
FLAGS.nigeria = vtri('#008751', '#fff', '#008751');
FLAGS.kenya = flagSvg([{ h: 1/4, fill: '#000' }, { h: 1/8, fill: '#fff' }, { h: 1/4, fill: '#bb0000' }, { h: 1/8, fill: '#fff' }, { h: 1/4, fill: '#006600' }]);
FLAGS['south africa'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#007a4d"/><polygon points="0,0 35,30 0,60" fill="#de3831"/><polygon points="0,12 28,30 0,48" fill="#fff"/><polygon points="0,20 22,30 0,40" fill="#000"/><polygon points="0,26 16,30 0,34" fill="#ffb612"/></svg>`;
FLAGS['dr congo'] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#007fff"/><path d="M0,0 L90,60 M0,60 L90,0" stroke="#f7d618" stroke-width="6"/><path d="M0,0 L90,60 M0,60 L90,0" stroke="#ce1021" stroke-width="3"/></svg>`;
FLAGS.chile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="30" fill="#fff"/><rect y="30" width="90" height="30" fill="#d52b1e"/><rect width="30" height="30" fill="#0033a0"/><polygon points="15,6 18,14 26,14 20,19 22,27 15,22 8,27 10,19 4,14 12,14" fill="#fff"/></svg>`;
FLAGS.peru = vtri('#d91023', '#fff', '#d91023');
FLAGS.uruguay = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60" width="270" height="180"><rect width="90" height="60" fill="#fff"/>${Array.from({length:5},(_,i)=>`<rect y="${i*12}" width="90" height="6" fill="${i%2?'#0038a8':'#fff'}"/>`).join('')}<rect width="36" height="36" fill="#fff"/><circle cx="18" cy="18" r="10" fill="#fcd116"/></svg>`;

function countryFromFlagName(name) {
  const m = name.match(/Flag_of_(.+?)\.svg\.png$/i);
  if (!m) return null;
  return m[1].toLowerCase().replace(/_/g, ' ');
}

let ok = 0, missing = 0;
for (const item of items) {
  if (item.kind !== 'flag') continue;
  const p = path.join(outDir, item.name.replace(/\.png$/, '.svg'));
  const country = countryFromFlagName(item.name);
  const svg = country ? FLAGS[country] : null;
  if (svg) {
    fs.writeFileSync(p, svg);
    // also keep a .png-named file (content is svg but browser sniffs it? no - delete old placeholder)
    const png = path.join(outDir, item.name);
    if (fs.existsSync(png)) fs.unlinkSync(png);
    ok++;
  } else {
    console.log('MISSING-FLAG', item.name, country);
    missing++;
  }
}
console.log('FLAGS written=' + ok + ' missing=' + missing);
