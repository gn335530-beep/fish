/* 訂單項目：商品快照、尾數與金額；金額一律由項目重算。 */

const { patch } = require("./store");
const { itemsOf } = require("./orders");

function itemSubtotal(item) {
  return Math.round(Number(item.unit_price || 0) * Number(item.quantity || 0));
}

function itemsTotal(items) {
  return items.reduce(function (sum, item) { return sum + itemSubtotal(item); }, 0);
}

function nextItemId(items) {
  const max = items.reduce(function (m, item) {
    return Math.max(m, Number(String(item.item_id || "").replace(/\D/g, "")) || 0);
  }, 0);
  return "itm_" + String(max + 1).padStart(2, "0");
}

/* 項目是商品快照：之後商品改價或售出都不影響已加入的內容。 */
function snapshot(product, quantity, itemId) {
  const batchQuantity = Number(product.quantity) || 0;
  const unitPrice = batchQuantity > 0
    ? Number((Number(product.price || 0) / batchQuantity).toFixed(2))
    : Number(product.unit_price || 0);
  return {
    item_id: itemId,
    product_id: product.id,
    title: product.title,
    photo_url: product.photo_url,
    unit_price: unitPrice,
    weight_kg: product.weight_kg,
    quantity: Number(quantity)
  };
}

/* 某一商品在草稿裡已加入的尾數。 */
function quantityOf(deal, productId) {
  if (!deal) return 0;
  return itemsOf(deal).filter(function (item) {
    return String(item.product_id) === String(productId);
  }).reduce(function (sum, item) { return sum + Number(item.quantity || 0); }, 0);
}

function writeItems(deal, items) {
  return patch("deals", deal.id, {
    items: items,
    items_total: itemsTotal(items),
    updated_at: new Date().toISOString()
  });
}

/* 同一商品再加購時累加尾數，不新增第二個項目。 */
function addItem(deal, product, quantity) {
  const items = itemsOf(deal).map(function (item) { return Object.assign({}, item); });
  const existing = items.find(function (item) {
    return String(item.product_id) === String(product.id);
  });

  if (existing) existing.quantity = Number(existing.quantity || 0) + Number(quantity);
  else items.push(snapshot(product, quantity, nextItemId(items)));

  return writeItems(deal, items);
}

function itemOf(deal, itemId) {
  return itemsOf(deal).find(function (item) {
    return String(item.item_id) === String(itemId);
  }) || null;
}

function setItemQuantity(deal, itemId, quantity) {
  const items = itemsOf(deal).map(function (item) { return Object.assign({}, item); });
  const item = items.find(function (row) { return String(row.item_id) === String(itemId); });
  if (!item) return null;
  item.quantity = Number(quantity);
  return writeItems(deal, items);
}

function removeItem(deal, itemId) {
  const items = itemsOf(deal);
  if (!items.some(function (item) { return String(item.item_id) === String(itemId); })) return null;
  return writeItems(deal, items.filter(function (item) {
    return String(item.item_id) !== String(itemId);
  }));
}

function clearItems(deal) {
  return writeItems(deal, []);
}

module.exports = {
  itemsOf: itemsOf,
  itemsTotal: itemsTotal,
  quantityOf: quantityOf,
  addItem: addItem,
  itemOf: itemOf,
  setItemQuantity: setItemQuantity,
  removeItem: removeItem,
  clearItems: clearItems
};
