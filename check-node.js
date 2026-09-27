// Node 18+ global fetch — test what's actually reachable
const tests = [
  { name: "Steam priceoverview", url: "https://steamcommunity.com/market/priceoverview/?currency=1&appid=730&market_hash_name=AK-47%7CRedline%20(Field-Tested)" },
  { name: "Steam listing", url: "https://steamcommunity.com/market/listing/730/AK-47%7CRedline%20(Field-Tested)" },
  { name: "Steam pricelist", url: "https://steamcommunity.com/market/pricelist/?currency=2&country=RU&appid=730" },
  { name: "SkinCash", url: "https://api.skincash.gg/v1/prices/AK-47%7CRedline%20(Field-Tested)" },
];
(async () => {
  for (const t of tests) {
    try {
      const r = await fetch(t.url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36", "Referer": "https://steamcommunity.com/market/" }, signal: AbortSignal.timeout(15000) });
      const b = await r.text();
      console.log("==", t.name, "->", r.status, b.length, "b");
      console.log("   ", b.substring(0, 250).replace(/\s+/g, " "));
    } catch (e) {
      console.log("==", t.name, "-> ERR", e.message.substring(0, 100));
    }
  }
})();
