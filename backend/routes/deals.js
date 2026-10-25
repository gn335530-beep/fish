/* 交易房：由商品開啟（或沿用）買家與釣客唯一的房間與訂單草稿。 */

const express = require("express");
const { all, findById, patch } = require("../lib/store");
const { requireUser } = require("../lib/auth");
const { decorateProduct, systemMessage } = require("../lib/orders");
const { summary } = require("../lib/conversations");
const deals = require("../lib/deals");
const { ok, fail } = require("../lib/http");

const router = express.Router();

router.post("/api/deals/initiate-channel", requireUser, function (req, res) {
  const body = req.body || {};
  const product = findById("products", body.product_id);
  if (!product) {
    fail(res, 404, "PRODUCT_NOT_FOUND", "找不到商品");
    return;
  }
  if (String(product.seller_id) === String(req.user.id)) {
    fail(res, 400, "OWN_PRODUCT", "不能洽談自己上架的商品");
    return;
  }

  const quantity = Math.floor(Number(body.quantity));
  if (!(quantity >= 1)) {
    fail(res, 400, "INVALID_QUANTITY", "尾數必須大於等於 1");
    return;
  }

  const decorated = decorateProduct(product, all("deals"));
  let conversation = deals.findConversation(req.user.id, product.seller_id);
  let deal = conversation ? deals.draftOf(conversation.id) : null;
  const inDraft = deals.quantityOf(deal, product.id);

  /* 草稿不保留庫存，但同一筆草稿加起來不得超過目前可售。 */
  if (inDraft + quantity > decorated.available) {
    fail(res, 409, "INSUFFICIENT_QUANTITY", "可售尾數不足", {
      product_id: product.id,
      available: decorated.available,
      in_draft: inDraft
    });
    return;
  }

  const now = new Date().toISOString();
  const createdRoom = !conversation;

  if (!conversation) {
    conversation = deals.createConversation(req.user.id, product.seller_id, now);
  } else if (conversation.mode !== "HUMAN") {
    conversation = patch("conversations", conversation.id, { mode: "HUMAN" });
  }

  if (!deal) deal = deals.createDeal(conversation, req.user.id, now);
  deal = deals.addItem(deal, decorated, quantity);

  if (createdRoom) systemMessage(conversation.id, "已進入交易洽談。");
  systemMessage(conversation.id, "已將「" + decorated.title + "」" + quantity + " 尾加入訂單草稿。");

  conversation = patch("conversations", conversation.id, { last_message_at: new Date().toISOString() });

  ok(res, {
    conversation: summary(conversation, req.user),
    deal: deal,
    product: decorated
  }, "已開啟交易房");
});

module.exports = router;
