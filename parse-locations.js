const fs = require('fs');
const s = fs.readFileSync('src/games/geoguessr/locations.ts', 'utf8');
const m = s.match(/image:\s*orig\("([^"]+)"\)/g) || [];
console.log('entries:', m.length);
// print tail
console.log(s.slice(-2500));
