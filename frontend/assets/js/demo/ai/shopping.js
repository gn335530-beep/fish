/* 導購：從商品 API 找魚，寫入 last_cards 供指涉使用。 */

import { listProducts } from "../../api/products.js";
import { findSpecies, findRegion, normalizeCityName, speciesList } from "./species.js";

const COOKING_WORDS = ["清蒸", "煮湯", "紅燒", "香煎", "煎", "烤", "川燙", "生魚片", "涼拌", "炒", "滷"];

function cookingMatches(text) {
  const hasTextureHint = /刺少|長輩|小孩|牙口/.test(text);
  const method = COOKING_WORDS.find(function (word) { return text.indexOf(word) !== -1; });
  if (!hasTextureHint && !method) return null;

  return speciesList().filter(function (spice) {
    if (hasTextureHint && spice.bones.indexOf("多") !== -1) return false;
    if (method && spice.cooking.indexOf(method) === -1) return false;
    return true;
  }).map(function (spice) { return spice.id; });
}

function productCard(product) {
  return {
    type: "product",
    product_id: product.id,
    title: product.title,
    photo_url: product.photo_url,
    price: product.price,
    price_per_taijin: product.price_per_taijin == null ? null : product.price_per_taijin,
    price_auto: product.price_auto === true,
    unit_price: product.unit_price,
    weight_kg: product.weight_kg,
    quantity: product.quantity,
    available: product.available,
    reserved_quantity: product.reserved_quantity,
    condition: product.condition,
    region: product.region,
    location: product.location,
    catch_time: product.catch_time,
    market_snapshot: product.market_snapshot || null,
    seller_id: product.seller_id
  };
}

function shoppingContext(cards) {
  return {
    mode: "shopping",
    draft: null,
    last_cards: cards,
    selected_product_id: null,
    editing: null
  };
}

/* 個人檔案的縣市就是預設範圍；沒有填才退回全省。 */
function profileRegion(user) {
  return normalizeCityName((user && user.city) || "").trim();
}

function matchesRegion(product, region) {
  return normalizeCityName(product.region).indexOf(region) !== -1;
}

function scopeOf(text, user) {
  const explicit = findRegion(text);
  if (explicit) return { region: explicit, explicit: true, profile: profileRegion(user) };
  const profile = profileRegion(user);
  return { region: profile, explicit: false, profile: profile };
}

function scoped(scope, text) {
  if (scope.explicit) return scope.region + text;
  if (scope.profile) return "依你的地區（" + scope.profile + "）" + text;
  return "你的個人檔案還沒填縣市，先以全省查詢，" + text;
}

export async function shoppingReply(text, user) {
  const spice = findSpecies(text);
  const scope = scopeOf(text, user);
  const cooking = cookingMatches(text);
  const rows = await listProducts({ limit: 100 });

  let matched = rows.filter(function (p) { return Number(p.available) > 0; });
  if (spice) matched = matched.filter(function (p) { return p.species_id === spice.id; });
  if (scope.region) {
    matched = matched.filter(function (p) { return matchesRegion(p, scope.region); });
  }
  if (cooking) matched = matched.filter(function (p) { return cooking.indexOf(p.species_id) !== -1; });
  matched = matched.slice(0, 5);

  if (!matched.length) {
    return {
      context: shoppingContext([]),
      replies: [{ text: scoped(scope, "目前沒有符合條件的商品。可以換個魚種或地區再試。") }]
    };
  }

  const replies = [{ text: scoped(scope, "找到 " + matched.length + " 個商品。") }];
  matched.forEach(function (p) { replies.push({ card: productCard(p) }); });

  return {
    context: shoppingContext(matched.map(function (p) { return p.id; })),
    replies: replies
  };
}
