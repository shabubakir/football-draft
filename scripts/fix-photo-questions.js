// Fixes all "Кто на фото?" questions: ensures correct answer matches the photo
const fs = require('fs');
const ts = require('typescript');

let code = fs.readFileSync('src/lib/quiz.ts', 'utf8');

// Map of image filename -> expected player name (as it appears in options)
const photoMap = {
  'messi.jpg': ['Месси'],
  'ronaldo.jpg': ['Роналду', 'К. Роналду'],
  'mbappe.jpg': ['Мбаппе'],
  'benzema.jpg': ['Бензема'],
  'modric.jpg': ['Модрич'],
  'salah.jpg': ['Салах'],
  'kane.jpg': ['Кейн'],
  'lewandowski.jpg': ['Левандовский'],
  'ibrahimovic.jpg': ['Иbrahimović'],
  'neymar.jpg': ['Неймар'],
  'haaland.jpg': ['Холанд'],
  'vinicius.jpg': ['Винисиус'],
  'griezmann.jpg': ['Гризманн', 'Гriezmann'],
  'aguero.jpg': ['Агуэро'],
  'varane.jpg': ['Варан']
};

// Find all photo questions and fix them
let fixCount = 0;
const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.includes('Кто на фото?')) continue;
  
  // Extract image
  const imgMatch = line.match(/image: "([^"]+)"/);
  if (!imgMatch) continue;
  
  const imgFile = imgMatch[1].split('/').pop();
  const expectedNames = photoMap[imgFile];
  if (!expectedNames) continue;
  
  // Extract options
  const optMatch = line.match(/options: \[([^\]]+)\]/);
  if (!optMatch) continue;
  
  const options = optMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
  
  // Find the correct option index
  const correctIdx = options.findIndex(opt => 
    expectedNames.some(name => opt.includes(name))
  );
  
  if (correctIdx === -1) {
    console.log('WARNING: Could not find expected name in options:', imgFile, options);
    continue;
  }
  
  // Check if correct is already right
  const correctMatch = line.match(/correct: (\d)/);
  const currentCorrect = parseInt(correctMatch[1]);
  
  if (currentCorrect !== correctIdx) {
    // Fix the line
    lines[i] = line.replace(`correct: ${currentCorrect}`, `correct: ${correctIdx}`);
    fixCount++;
    console.log(`FIXED: ${imgFile} correct ${currentCorrect} -> ${correctIdx} (${options[correctIdx]})`);
  }
}

fs.writeFileSync('src/lib/quiz.ts', lines.join('\n'));
console.log(`\nTotal fixed: ${fixCount}`);
