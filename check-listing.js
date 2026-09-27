const fs = require("fs");
const t = fs.readFileSync("C:/Users/sh.abubakir/AppData/Local/Temp/listing.html", "utf8");
console.log("Dragon Lore mentions:", (t.match(/Dragon Lore/g) || []).length);
const lowFee = t.match(/"low_market_fee":\s*([^,]+)/);
console.log("low_market_fee:", lowFee && lowFee[1]);
const highFee = t.match(/"high_market_fee":\s*([^,]+)/);
console.log("high_market_fee:", highFee && highFee[1]);
const m2 = t.match(/marketPrice[^\n]{0,120}/);
console.log("marketPrice line:", m2 ? m2[0] : "none");
// look for g_rgMarketPrices pattern
const m3 = t.match(/g_rgMarketPrices[^;]{0,200}/);
console.log("g_rgMarketPrices:", m3 ? m3[0] : "none");
