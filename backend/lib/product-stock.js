/* 商品可售數量與狀態：由商品數量、已售數量與進行中訂單的保留量衍生。 */

const { all, findById } = require("./store");
const { itemsOf } = require("./deal-items");
const { isActive } = require("./deal-statuses");

/* 某商品目前被進行中訂單保留的尾數。 */
function reservedFor(productId, deals) {
  return deals.filter(isActive).reduce(function (sum, deal) {
    return sum + itemsOf(deal)
      .filter(function (item) { return String(item.product_id) === String(productId); })
      .reduce(function (s, item) { return s + Number(item.quantity || 0); }, 0);
  }, 0);
}

/* 有保留就先算洽談中；全部售完且沒有保留才是 SOLD_OUT；已下架優先於一切。 */
function statusOf(available, reserved, delisted) {
  if (delisted) return "DELISTED";
  if (reserved > 0) return "PARTIALLY_RESERVED";
  if (available <= 0) return "SOLD_OUT";
  return "ACTIVE";
}

/* 公開列表只露出仍可購買的狀態。 */
const PUBLIC_STATUSES = ["ACTIVE", "PARTIALLY_RESERVED"];

function isPublicProduct(product) {
  return isLiveStatus(product.status);
}

function isLiveStatus(status) {
  return PUBLIC_STATUSES.indexOf(status) !== -1;
}

/* 商品對外的完整樣貌：庫存與價格衍生欄位都在這裡算；舊魚種欄位不外露。 */
function decorateProduct(product, deals) {
  const clean = Object.assign({}, product);
  delete clean.species_id;
  delete clean.species_latin;
  const delisted = Boolean(product.delisted_at);
  const quantity = Number(product.quantity || 0);
  const sold = Number(product.sold_quantity || 0);
  const reserved = reservedFor(product.id, deals);
  const available = delisted ? 0 : Math.max(0, quantity - sold - reserved);
  const unitPrice = quantity > 0 ? Math.round(Number(product.price || 0) / quantity) : 0;
  const avgWeight = quantity > 0 ? Number((Number(product.weight_kg || 0) / quantity).toFixed(2)) : 0;
  return Object.assign({}, clean, {
    listed_at: product.listed_at || product.created_at || null,
    delisted_at: product.delisted_at || null,
    price_per_taijin: product.price_per_taijin == null ? null : product.price_per_taijin,
    price_auto: product.price_auto === true,
    reserved_quantity: reserved,
    available: available,
    unit_price: unitPrice,
    avg_weight_kg: avgWeight,
    status: statusOf(available, reserved, delisted)
  });
}

function decorateProducts(products) {
  const deals = all("deals");
  return products.map(function (product) { return decorateProduct(product, deals); });
}

/* 單一商品目前的可售尾數；商品不存在時回 null。 */
function productAvailability(productId) {
  const product = findById("products", productId);
  if (!product) return null;
  const decorated = decorateProduct(product, all("deals"));
  return { product: product, decorated: decorated, available: decorated.available };
}

module.exports = {
  isLiveStatus: isLiveStatus,
  isPublicProduct: isPublicProduct,
  decorateProduct: decorateProduct,
  decorateProducts: decorateProducts,
  productAvailability: productAvailability
};
