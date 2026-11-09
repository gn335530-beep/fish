/* 商品生命週期：下架、重新上架與硬刪；只有擁有者可以操作。 */

const express = require("express");
const { all, findById, patch, remove } = require("../lib/store");
const { requireUser } = require("../lib/auth");
const { decorateProduct, isLiveStatus } = require("../lib/product-stock");
const { sweepExpired } = require("../lib/timeouts");
const { applyProductLifecycle } = require("../lib/product-deals");
const { ok, fail } = require("../lib/http");

const router = express.Router();

function requireOwnedProduct(req, res) {
  const product = findById("products", req.params.id);
  if (!product) {
    fail(res, 404, "PRODUCT_NOT_FOUND", "找不到商品");
    return null;
  }
  if (String(product.seller_id) !== String(req.user.id)) {
    fail(res, 403, "FORBIDDEN", "只能操作自己的商品");
    return null;
  }
  return product;
}

function decorated(product) {
  return decorateProduct(product, all("deals"));
}

router.post("/api/products/:id/delist", requireUser, function (req, res) {
  sweepExpired();
  const product = requireOwnedProduct(req, res);
  if (!product) return;
  if (product.delisted_at) {
    fail(res, 409, "PRODUCT_ALREADY_DELISTED", "此商品已下架");
    return;
  }
  if (decorated(product).status === "SOLD_OUT") {
    fail(res, 409, "PRODUCT_SOLD_OUT", "已售出商品請直接刪除");
    return;
  }

  const now = new Date().toISOString();
  const updated = patch("products", product.id, { delisted_at: now });
  const effects = applyProductLifecycle(updated, "delisted", req.user.id, now);
  ok(res, {
    product: decorated(findById("products", product.id)),
    cancelled_deals: effects.cancelled_deals,
    removed_drafts: effects.removed_drafts
  }, "商品已下架");
});

router.post("/api/products/:id/relist", requireUser, function (req, res) {
  sweepExpired();
  const product = requireOwnedProduct(req, res);
  if (!product) return;
  if (!product.delisted_at) {
    fail(res, 409, "PRODUCT_NOT_DELISTED", "商品未下架");
    return;
  }
  if (Number(product.quantity || 0) - Number(product.sold_quantity || 0) <= 0) {
    fail(res, 409, "PRODUCT_HAS_NO_STOCK", "已無未售尾數，無法重新上架");
    return;
  }

  const updated = patch("products", product.id, {
    delisted_at: null,
    listed_at: new Date().toISOString()
  });
  ok(res, { product: decorated(updated) }, "商品已重新上架");
});

router.delete("/api/products/:id", requireUser, function (req, res) {
  sweepExpired();
  const product = requireOwnedProduct(req, res);
  if (!product) return;
  const status = decorated(product).status;
  if (isLiveStatus(status)) {
    fail(res, 409, "PRODUCT_MUST_BE_DELISTED", "請先下架商品");
    return;
  }

  const now = new Date().toISOString();
  const effects = applyProductLifecycle(product, "deleted", req.user.id, now);
  remove("products", product.id);
  ok(res, {
    product_id: product.id,
    cancelled_deals: effects.cancelled_deals,
    removed_drafts: effects.removed_drafts
  }, "商品已刪除");
});

module.exports = router;
