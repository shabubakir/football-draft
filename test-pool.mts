// Анализ: сколько уникальных скинов/ножей в базе, и сколько из них
// можно закрыть статической базой (cs2-prices.json)
import { CASES } from "./src/lib/cs2";
import staticPrices from "./src/lib/data/cs2-prices.json";

const WEARS = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];

const all = new Map<string, string>(); // name -> img
for (const cs of CASES) {
  for (const it of cs.items) all.set(it.n, it.img);
  for (const r of cs.rares) all.set(r.n, r.img);
}
console.log(`всего уникальных предметов: ${all.size}`);

const knives = [...all.keys()].filter((n) => n.startsWith("★") || n.startsWith("✦"));
const skins = [...all.keys()].filter((n) => !n.startsWith("★") && !n.startsWith("✦"));
console.log(`ножей: ${knives.length}, скинов: ${skins.length}`);

const st = (staticPrices as Array<{ name: string; price: number }>)
  .filter((p) => typeof p.price === "number" && p.price > 0)
  .map((p) => p.name.toLowerCase());
console.log(`статических цен: ${st.length}`);

// Ножи со статической ценой
const knivesWithStatic = knives.filter((n) => st.includes(n.toLowerCase()));
console.log(`ножей со статической ценой: ${knivesWithStatic.length}`);

// Сколько market-hash запросов нужно, чтобы покрыть 100 скинов?
// Если берём случайные 100 скинов и у каждого 5 wears = 500 запросов.
// Но можно хитрее: цена скина ≈ средняя по wears.
// Для Higher/Lower достаточно, чтобы цена была близка к реальной.
// Стратегия: для каждого скина запросить 1-2 wears (FT + MW) и усреднить.
// Тогда 100 скинов = 200 запросов ≈ 10 батчей ≈ 10-15 сек.

// Сколько скинов реально есть в популярных кейсах (для фильтрации по cases)?
const popular = new Set([
  "Kilowatt Case", "Clutch Case", "Revolution Case", "Dreams & Nightmares Case",
  "Recoil Case", "Fracture Case", "Clutcher's Case", "Sticker Bomb Case",
  "Kilowatt Case (2025)", "Operation Riptide Case",
]);
const inPopular = skins.filter((n) => {
  for (const cs of CASES) {
    if (!popular.has(cs.name)) continue;
    if (cs.items.some((i) => i.n === n) || cs.rares.some((r) => r.n === n)) return true;
  }
  return false;
});
console.log(`скинов в популярных кейсах: ${inPopular.length}`);

process.exit(0);
