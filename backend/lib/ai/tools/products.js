/* search_products：只回 ACTIVE／PARTIALLY_RESERVED 公開商品，最多 5 筆。 */

const { all } = require("../../store");
const { decorateProducts, isPublicProduct } = require("../../product-stock");
const { regionOf } = require("./region");

const MAX_PRODUCTS = 5;

function listedTime(product) {
  const time = Date.parse(product.listed_at || product.created_at || "");
  return Number.isFinite(time) ? time : 0;
}

function matches(text, keyword) {
  return String(text || "").indexOf(String(keyword || "")) !== -1;
}

function cardOf(product) {
  return {
    id: String(product.id),
    fish_species: product.fish_species,
    photo_url: product.photo_url,
    condition: product.condition,
    price: product.price,
    price_per_taijin: product.price_per_taijin,
    quantity: product.quantity,
    available: product.available,
    reserved_quantity: product.reserved_quantity,
    region: product.region,
    status: product.status
  };
}

function run(args, ctx) {
  const region = regionOf(args, ctx);
  const species = String(args.species || args.fish_species || "").trim();
  const condition = String(args.condition || "").trim();
  const maxPrice = Number(args.max_price);

  let rows = decorateProducts(all("products"))
    .filter(isPublicProduct)
    .sort(function (a, b) { return listedTime(b) - listedTime(a); });

  if (species) rows = rows.filter(function (p) { return matches(p.fish_species, species); });
  if (condition) rows = rows.filter(function (p) { return matches(p.condition, condition); });
  if (region) rows = rows.filter(function (p) { return matches(p.region, region); });
  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    rows = rows.filter(function (p) { return Number(p.price) <= maxPrice; });
  }

  return {
    region: region,
    products: rows.slice(0, MAX_PRODUCTS).map(cardOf)
  };
}

module.exports = { run: run, MAX_PRODUCTS: MAX_PRODUCTS };
