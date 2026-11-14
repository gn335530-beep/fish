/* 數字依據：只取工具結果中的數值欄位，不含 URL、ID、照片或電話。 */

const MARKET_KEYS = [
  "species_code", "official_name", "scope", "region", "trade_date",
  "price_per_kg", "price_per_taijin", "is_aquaculture"
];
const PRODUCT_KEYS = [
  "fish_species", "condition", "price", "price_per_taijin",
  "quantity", "available", "reserved_quantity", "region"
];

function pick(source, keys) {
  const out = {};
  keys.forEach(function (key) {
    if (source && source[key] !== undefined && source[key] !== null) out[key] = source[key];
  });
  return out;
}

function marketText(market) {
  if (!market || market.found !== true) return "";
  return JSON.stringify(pick(market, MARKET_KEYS));
}

function productsText(products) {
  return JSON.stringify((products || []).map(function (product) {
    return pick(product, PRODUCT_KEYS);
  }));
}

function webText(results) {
  return (results || []).map(function (row) {
    return String(row.title || "") + " " + String(row.content || "");
  }).join("\n");
}

/* 依實際使用的工具組出官方數字依據；模型自填的 tool_results 不會進來。 */
function officialText(toolResults, toolNames) {
  const used = toolNames || [];
  const parts = [];
  if (used.indexOf("get_market_price") !== -1) parts.push(marketText(toolResults && toolResults.market));
  if (used.indexOf("search_products") !== -1) parts.push(productsText(toolResults && toolResults.products));
  return parts.filter(Boolean).join("\n");
}

module.exports = {
  marketText: marketText,
  productsText: productsText,
  webText: webText,
  officialText: officialText
};
