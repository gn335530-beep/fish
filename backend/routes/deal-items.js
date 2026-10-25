/* 訂單項目：買家加購、改尾數、刪除與清空；只有草稿訂單可以改。 */

const express = require("express");
const { requireUser } = require("../lib/auth");
const { productAvailability, systemMessage } = require("../lib/orders");
const deals = require("../lib/deals");
const dealItems = require("../lib/deal-items");
const { ok, created, fail } = require("../lib/http");

const router = express.Router();

function requireBuyerDraft(deal, req, res) {
  if (!deals.requireDraft(deal, res)) return false;
  if (!deals.isBuyer(deal, req.user.id)) {
    fail(res, 403, "FORBIDDEN", "只有買家可以修改訂單內容");
    return false;
  }
  return true;
}

router.post("/api/deals/items", requireUser, function (req, res) {
  const body = req.body || {};
  const deal = deals.requireDeal(req, res);
  if (!deal) return;
  if (!requireBuyerDraft(deal, req, res)) return;

  const stock = productAvailability(body.product_id);
  if (!stock) {
    fail(res, 404, "PRODUCT_NOT_FOUND", "找不到商品");
    return;
  }
  if (String(stock.product.seller_id) !== String(deal.seller_id)) {
    fail(res, 400, "WRONG_SELLER", "只能加購同一位釣客的商品");
    return;
  }

  const quantity = Math.floor(Number(body.quantity));
  if (!(quantity >= 1)) {
    fail(res, 400, "INVALID_QUANTITY", "尾數必須大於等於 1");
    return;
  }

  const inDraft = dealItems.quantityOf(deal, stock.product.id);
  if (inDraft + quantity > stock.available) {
    fail(res, 409, "INSUFFICIENT_QUANTITY",
      "「" + stock.decorated.title + "」可售 " + stock.available + " 尾，訂單已有 " + inDraft + " 尾", {
        product_id: stock.product.id,
        available: stock.available,
        in_draft: inDraft
      });
    return;
  }

  const updated = dealItems.addItem(deal, stock.decorated, quantity);
  systemMessage(deal.conversation_id,
    "已將「" + stock.decorated.title + "」" + quantity + " 尾加入訂單草稿。");

  created(res, { deal: deals.decorateDeal(updated) }, "已加入訂單");
});

router.patch("/api/deals/items/:itemId", requireUser, function (req, res) {
  const deal = deals.requireDeal(req, res);
  if (!deal) return;
  if (!requireBuyerDraft(deal, req, res)) return;

  const item = dealItems.itemOf(deal, req.params.itemId);
  if (!item) {
    fail(res, 404, "ITEM_NOT_FOUND", "找不到訂單項目");
    return;
  }

  const quantity = Math.floor(Number((req.body || {}).quantity));
  if (!(quantity >= 1)) {
    fail(res, 400, "INVALID_QUANTITY", "尾數必須大於等於 1");
    return;
  }

  const stock = productAvailability(item.product_id);
  if (!stock) {
    fail(res, 404, "PRODUCT_NOT_FOUND", "找不到商品");
    return;
  }
  if (quantity > stock.available) {
    fail(res, 409, "INSUFFICIENT_QUANTITY",
      "「" + item.title + "」可售 " + stock.available + " 尾，無法改成 " + quantity + " 尾", {
        item_id: item.item_id,
        product_id: item.product_id,
        available: stock.available
      });
    return;
  }

  const updated = dealItems.setItemQuantity(deal, item.item_id, quantity);
  ok(res, { deal: deals.decorateDeal(updated) }, "已更新尾數");
});

router.delete("/api/deals/items/:itemId", requireUser, function (req, res) {
  const deal = deals.requireDeal(req, res);
  if (!deal) return;
  if (!requireBuyerDraft(deal, req, res)) return;

  const updated = dealItems.removeItem(deal, req.params.itemId);
  if (!updated) {
    fail(res, 404, "ITEM_NOT_FOUND", "找不到訂單項目");
    return;
  }
  ok(res, { deal: deals.decorateDeal(updated) }, "已移除項目");
});

router.delete("/api/deals/items", requireUser, function (req, res) {
  const deal = deals.requireDeal(req, res);
  if (!deal) return;
  if (!requireBuyerDraft(deal, req, res)) return;

  const updated = dealItems.clearItems(deal);
  ok(res, { deal: deals.decorateDeal(updated) }, "已清空訂單");
});

module.exports = router;
