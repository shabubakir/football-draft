// Test: what does csgo.market / other free APIs return?
const urls = [
  "https://csgo.market/api/prices?app_id=730&language=english",
  "https://api.csgofloat.com/v1/inventory/steamid/0", // expect error shape
  "https://steamcommunity.com/market/priceoverview/?currency=1&appid=730&market_hash_name=AK-47%7CRedline%20(Field-Tested)",
  "https://api.steampowered.com/IEconItems_730/GetItems/v1/?language=english",
];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) });
      const t = await r.text();
      console.log("==", u.split("?")[0], "->", r.status, t.length, "bytes");
      console.log("   ", t.substring(0, 200).replace(/\n/g, " "));
    } catch (e) {
      console.log("==", u.split("?")[0], "-> ERROR", e.message);
    }
  }
})();
