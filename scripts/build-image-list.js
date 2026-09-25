// Builds scripts/image-list.json: {name, url, kind} for every image referenced in quiz/geo banks
const fs = require('fs');
const ts = require('typescript');

function loadBank(file, exportName) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('import')) {
    code = code.replace(/import[^\n;]*;/g, '');
    code = code.replace(/geo:\s*\w+/g, 'geo: []');
  }
  const tsc = ts.transpileModule(code, { compilerOptions: { module: 'commonjs', target: 'es2019' } });
  const m = { exports: {} };
  new Function('exports', 'module', tsc.outputText)(m.exports, m);
  return m.exports[exportName];
}

const football = loadBank('src/lib/quiz.ts', 'QUIZ_QUESTIONS');
const geo = loadBank('src/lib/geo.ts', 'GEO_QUESTIONS');

const list = [];
const seen = new Set();

function slug(url) {
  // /commons/thumb/x/xx/File_Name.jpg/400px-File_Name.jpg  -> File_Name.jpg
  // /commons/x/xx/File_Name.svg/400px-File_Name.svg.png   -> File_Name.svg.png
  let base = decodeURIComponent(url.split('?')[0]);
  const parts = base.split('/');
  base = parts[parts.length - 1]; // 400px-XXX.jpg
  if (base.startsWith('400px-')) base = base.slice(6);
  // sanitize
  base = base.replace(/[^\w.\-]+/g, '_');
  return base;
}

for (const [bankName, bank] of [['fb', football], ['geo', geo]]) {
  for (const q of bank) {
    if (!q.image) continue;
    let name = bankName + '_' + slug(q.image);
    // avoid collisions
    if (seen.has(name)) { name = bankName + '_' + Math.random().toString(36).slice(2, 6) + '_' + name; }
    seen.add(name);
    list.push({ name, url: q.image, kind: q.image.includes('Flag_of') ? 'flag' : 'photo' });
  }
}

fs.writeFileSync('scripts/image-list.json', JSON.stringify(list, null, 2));
console.log('Total images:', list.length);
console.log('Flags:', list.filter(x => x.kind === 'flag').length);
console.log('Photos:', list.filter(x => x.kind === 'photo').length);
