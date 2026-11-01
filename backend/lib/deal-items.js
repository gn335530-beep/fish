/* 訂單項目：商品快照、尾數與金額；金額一律由項目重算。 */

const { patch } = require("./store");
const { systemMessage } = require("./messages");
const { requireQuantity, insufficientQuantity } = require("./quantities");

function itemsOf(deal) {
  return Array.isArray(deal.items) ? deal.items : [];
}

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
    fish_species: product.fish_species || null,
    photo_url: product.photo_url,
    unit_price: unitPrice,
    price: product.price == null ? null : Number(product.price),
    price_per_taijin: product.price_per_taijin == null ? null : Number(product.price_per_taijin),
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
function applyAddition(items, product, quantity) {
  const existing = items.find(function (item) {
    return String(item.product_id) === String(product.id);
  });
  if (existing) existing.quantity = Number(existing.quantity || 0) + Number(quantity);
  else items.push(snapshot(product, quantity, nextItemId(items)));
}

function addItem(deal, product, quantity) {
  const items = itemsOf(deal).map(function (item) { return Object.assign({}, item); });
  applyAddition(items, product, quantity);
  return writeItems(deal, items);
}

/* 批次加購只寫入一次，回傳更新後的訂單。 */
function addBatch(deal, additions) {
  const items = itemsOf(deal).map(function (item) { return Object.assign({}, item); });
  (additions || []).forEach(function (addition) {
    applyAddition(items, addition.product, addition.quantity);
  });
  return writeItems(deal, items);
}

/* 重新發起時複製原項目快照，只更新數量並配置新的 item_id。 */
function addSnapshotBatch(deal, additions) {
  const items = itemsOf(deal).map(function (item) { return Object.assign({}, item); });
  (additions || []).forEach(function (addition) {
    const source = addition.item || {};
    const existing = items.find(function (item) {
      return String(item.product_id) === String(source.product_id);
    });
    if (existing) {
      existing.quantity = Number(existing.quantity || 0) + Number(addition.quantity);
      return;
    }
    items.push(Object.assign({}, source, {
      item_id: nextItemId(items),
      quantity: Number(addition.quantity)
    }));
  });
  return writeItems(deal, items);
}

/* 加購與首次建立共用：驗證尾數與草稿累計；回傳可加入的尾數或 null。 */
function requireAddableQuantity(deal, stock, value, res, shortMessage) {
  const quantity = requireQuantity(value, res);
  if (quantity === null) return null;

  const inDraft = quantityOf(deal, stock.product.id);
  if (inDraft + quantity > stock.available) {
    insufficientQuantity(res,
      shortMessage || "「" + stock.decorated.title + "」可售 " + stock.available +
        " 尾，訂單已有 " + inDraft + " 尾",
      { product_id: stock.product.id, available: stock.available, in_draft: inDraft });
    return null;
  }
  return quantity;
}

/* 驗證通過後寫入項目並留下同一則系統訊息。 */
function addWithMessage(deal, stock, quantity) {
  const updated = addItem(deal, stock.decorated, quantity);
  systemMessage(deal.conversation_id,
    "已將「" + stock.decorated.title + "」" + quantity + " 尾加入訂單草稿。");
  return updated;
}

/* 批次加購也只留下一則系統訊息。 */
function addBatchWithMessage(deal, additions) {
  const updated = addBatch(deal, additions);
  const text = (additions || []).map(function (addition) {
    return "「" + addition.product.title + "」" + addition.quantity + " 尾";
  }).join("、");
  systemMessage(deal.conversation_id, "已將" + text + "加入訂單草稿。");
  return updated;
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
  addBatch: addBatch,
  addSnapshotBatch: addSnapshotBatch,
  requireAddableQuantity: requireAddableQuantity,
  addWithMessage: addWithMessage,
  addBatchWithMessage: addBatchWithMessage,
  itemOf: itemOf,
  setItemQuantity: setItemQuantity,
  removeItem: removeItem,
  clearItems: clearItems
};
