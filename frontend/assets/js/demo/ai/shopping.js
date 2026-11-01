/* 導購：從商品 API 找魚，只用魚種名稱、地區與商品欄位篩選。 */

import { listProducts } from "../../api/products.js";
import { findRegion, normalizeCityName } from "../../shared/regions.js";
import { ensureCatalog, findCatalogName } from "./species-catalog.js";

function productCard(product) {
  return {
    type: "product",
    product_id: product.id,
    fish_species: product.fish_species,
    photo_url: product.photo_url,
    price: product.price,
    price_per_taijin: product.price_per_taijin == null ? null : product.price_per_taijin,
    quantity: product.quantity,
    available: product.available,
    reserved_quantity: product.reserved_quantity,
    condition: product.condition,
    region: product.region,
    location: product.location,
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

function matchesSpecies(product, name) {
  const species = String(product.fish_species || "").trim();
  return species !== "" && (species.indexOf(name) !== -1 || name.indexOf(species) !== -1);
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
  const scope = scopeOf(text, user);
  await ensureCatalog();
  const name = findCatalogName(text);
  const rows = await listProducts({ limit: 100 });

  let matched = rows.filter(function (p) { return Number(p.available) > 0; });
  if (name) matched = matched.filter(function (p) { return matchesSpecies(p, name); });
  if (scope.region) {
    matched = matched.filter(function (p) { return matchesRegion(p, scope.region); });
  }
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
