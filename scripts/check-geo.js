const fs = require('fs');
let code = fs.readFileSync('src/lib/geo.ts', 'utf8');
const matches = code.match(/image:\s*"([^"]*)"/g) || [];
const flags = matches.filter(m => m.includes('flag'));
const cities = matches.filter(m => !m.includes('flag'));
console.log('flag refs:', flags.length, ' city refs:', cities.length);
console.log('sample flag:', flags[0]);
console.log('sample city:', cities[0]);
