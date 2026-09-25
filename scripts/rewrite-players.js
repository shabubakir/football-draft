// Rewrites football player photo URLs in src/lib/quiz.ts to local /images/players/* paths
const fs = require('fs');

const nameMap = {
  'fb_Lionel_Messi_20180626.jpg': 'messi',
  'fb_Kylian_Mbapp__Juin_2018__cropp_.jpg': 'mbappe',
  'fb_Luka_Modri__playing_for_Real_Madrid_CF_in_2019.jpg': 'modric',
  'fb_Karim_Benzema_in_2018.jpg': 'benzema',
  'fb_Mohamed_Salah_2021.jpg': 'salah',
  'fb_Harry_Kane_playing_for_England_in_2018.jpg': 'kane',
  'fb_Robert_Lewandowski_2021.jpg': 'lewandowski',
  'fb_Zlatan_Ibrahimovic.jpg': 'ibrahimovic',
  'fb_Neymar_Jr._2015.jpg': 'neymar',
  'fb_Erling_Haaland_20220817.jpg': 'haaland',
  'fb_Cristiano_Ronaldo_playing_for_Al_Nassr__crop_.jpg': 'ronaldo',
  'fb_Vin%C3%ADcius_Jr._at_R%C3%A9al_Madrid%2C_2022.jpg': 'vinicius',
  'fb_Antoine_Griezmann_in_2018.jpg': 'griezmann',
  'fb_Sergio_Aguero_playing_for_Brazil.jpg': 'aguero',
  'fb_Rapha%C3%A8l_Varane_20190907.jpg': 'varane',
  'fb_Harry_Kane_20190611.jpg': 'kane'
};

let code = fs.readFileSync('src/lib/quiz.ts', 'utf8');
let count = 0;
for (const [oldName, playerName] of Object.entries(nameMap)) {
  const needle = 'image: "/images/quiz/' + oldName + '"';
  const repl = 'image: "/images/players/' + playerName + '.jpg"';
  if (code.includes(needle)) {
    code = code.split(needle).join(repl);
    count++;
  }
}
fs.writeFileSync('src/lib/quiz.ts', code);
console.log('rewrote', count, 'player photo URLs');
