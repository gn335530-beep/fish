/* 商品定價：整批與每台斤的驗證、自動計算；路由只負責 HTTP。 */

const { taijinFromKg } = require("./units");

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

/* 只填每台斤時由後端算整批；兩者都填時保留原值，不檢查一致性。 */
function readPricing(body, weightKg) {
  const hasPrice = hasValue(body.price);
  const hasPerTaijin = hasValue(body.price_per_taijin);
  if (!hasPrice && !hasPerTaijin) return { error: "MISSING_PRICE" };

  const priceValue = hasPrice ? Number(body.price) : null;
  const perTaijinValue = hasPerTaijin ? Number(body.price_per_taijin) : null;
  if ((hasPrice && (!Number.isFinite(priceValue) || priceValue <= 0)) ||
      (hasPerTaijin && (!Number.isFinite(perTaijinValue) || perTaijinValue <= 0))) {
    return { error: "INVALID_PRICE" };
  }

  const auto = !hasPrice && hasPerTaijin;
  const price = hasPrice
    ? priceValue
    : Math.round(perTaijinValue * taijinFromKg(weightKg));
  if (!(price > 0)) return { error: "INVALID_PRICE" };
  return {
    price: price,
    price_per_taijin: hasPerTaijin ? perTaijinValue : null,
    price_auto: auto
  };
}

module.exports = { readPricing: readPricing };
