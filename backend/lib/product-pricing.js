/* 商品定價：整批售價必填、每台斤售價選填；不再自動換算整批。 */

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function readPricing(body) {
  if (!hasValue(body.price)) return { error: "MISSING_PRICE" };

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) return { error: "INVALID_PRICE" };

  let perTaijin = null;
  if (hasValue(body.price_per_taijin)) {
    perTaijin = Number(body.price_per_taijin);
    if (!Number.isFinite(perTaijin) || perTaijin <= 0) return { error: "INVALID_PRICE" };
  }

  return {
    price: price,
    price_per_taijin: perTaijin,
    price_auto: false
  };
}

module.exports = { readPricing: readPricing };
