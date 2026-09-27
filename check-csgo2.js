// Test free CS2 price APIs that work from Vercel (no proxy)
const tests = [
  { name: "Steam priceoverview", url: "https://steamcommunity.com/market/priceoverview/?currency=1&appid=730&market_hash_name=AWP%7CDragon%20Lore%20(Covert)" },
  { name: "SkinCash v1", url: "https://api.skincash.gg/v1/prices/AWP%7CDragon%20Lore%20(Covert)" },
  { name: "SkinCash v1 wear", url: "https://api.skincash.gg/v1/prices/AKP-47%7CRedline%20(Field-Tested)" },
  { name: "csgo.market", url: "https://csgo.market/api/prices?app_id=730&language=english" },
  { name: "csgofloat", url: "https://api.csgofloat.com/prices" },
];
(async () => {
  for (const t of tests) {
    try {
      const r = await fetch(t.url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(20000) });
      const b = await r.text();
      console.log("==", t.name, "->", r.status, b.length, "b");
      console.log("   ", b.substring(0, 250).replace(/\n/g, " "));
    } catch (e) {
      console.log("==", t.name, "-> ERR", e.message);
    }
  }
})();
