/* 導購：從商品 API 找魚，寫入 last_cards 供指涉使用。 */

import * as api from "../api.js";
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
    unit_price: product.unit_price,
    weight_kg: product.weight_kg,
    quantity: product.quantity,
    available: product.available,
    condition: product.condition,
    region: product.region,
    location: product.location,
    catch_time: product.catch_time,
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

export async function shoppingReply(text, user) {
  const spice = findSpecies(text);
  let region = findRegion(text);
  if (!region && /附近|我這邊|附近有什麼/.test(text) && user && user.city) {
    region = normalizeCityName(user.city);
  }
  const cooking = cookingMatches(text);
  const rows = await api.listProducts({ limit: 100 });

  let matched = rows.filter(function (p) { return Number(p.available) > 0; });
  if (spice) matched = matched.filter(function (p) { return p.species_id === spice.id; });
  if (region) {
    const key = normalizeCityName(region);
    matched = matched.filter(function (p) { return normalizeCityName(p.region).indexOf(key) !== -1; });
  }
  if (cooking) matched = matched.filter(function (p) { return cooking.indexOf(p.species_id) !== -1; });
  matched = matched.slice(0, 5);

  if (!matched.length) {
    return {
      context: shoppingContext([]),
      replies: [{ text: "目前沒有符合條件的商品。可以換個魚種或地區再試。" }]
    };
  }

  const replies = [{ text: "找到 " + matched.length + " 個商品。" }];
  matched.forEach(function (p) { replies.push({ card: productCard(p) }); });

  return {
    context: shoppingContext(matched.map(function (p) { return p.id; })),
    replies: replies
  };
}
