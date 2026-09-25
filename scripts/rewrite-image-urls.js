// Rewrites all image URLs in src/lib/quiz.ts and src/lib/geo.ts to local /images/quiz/* paths
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

function slug(url) {
  let base = decodeURIComponent(url.split('?')[0]);
  const parts = base.split('/');
  base = parts[parts.length - 1];
  if (base.startsWith('400px-')) base = base.slice(6);
  base = base.replace(/[^\w.\-]+/g, '_');
  return base;
}

// build url -> local path map
const map = new Map();
for (const [prefix, bank] of [['fb', football], ['geo', geo]]) {
  for (const q of bank) {
    if (!q.image) continue;
    const base = slug(q.image);
    if (base.includes('Flag_of')) {
      map.set(q.image, '/images/quiz/' + prefix + '_' + base.replace(/\.png$/, '.svg'));
    } else {
      map.set(q.image, '/images/quiz/' + prefix + '_' + base);
    }
  }
}

console.log('Total unique URLs:', map.size);

// rewrite both files
for (const file of ['src/lib/quiz.ts', 'src/lib/geo.ts']) {
  let code = fs.readFileSync(file, 'utf8');
  let count = 0;
  for (const [url, local] of map) {
    const needle = 'image: "' + url + '"';
    const repl = 'image: "' + local + '"';
    if (code.includes(needle)) {
      code = code.split(needle).join(repl);
      count++;
    }
  }
  fs.writeFileSync(file, code);
  console.log(file, 'rewrote', count);
}
