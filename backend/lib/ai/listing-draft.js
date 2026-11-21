/* listing 草稿輔助：合併變更、完成度與卡片顯示時機。 */

const NON_PRICE_FIELDS = ["fish_species", "quantity", "condition", "photo_url"];

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function effectiveDraft(draft, changes) {
  const out = Object.assign({}, draft || {});
  Object.keys(changes).forEach(function (key) { out[key] = changes[key]; });
  return out;
}

function nonPriceComplete(draft) {
  return NON_PRICE_FIELDS.every(function (slot) { return hasValue(draft[slot]); });
}

function allComplete(draft) {
  return nonPriceComplete(draft) && hasValue(draft.price);
}

/* 顯示時機由程式把關：卡片只能在全欄位／非價格欄位完成後顯示。 */
function validateNextAction(action, draft) {
  if (action === "show_market_card" && !(nonPriceComplete(draft) && !hasValue(draft.price))) {
    return "ask";
  }
  if (action === "show_draft_card" && !allComplete(draft)) return "ask";
  return action || "ask";
}

/* 缺哪些欄位：非價格先問，售價最後；照片只由使用者上傳。 */
function missingFields(draft) {
  const missing = NON_PRICE_FIELDS.filter(function (slot) { return !hasValue(draft[slot]); });
  if (!hasValue(draft.price)) missing.push("price");
  return missing;
}

module.exports = {
  effectiveDraft: effectiveDraft,
  nonPriceComplete: nonPriceComplete,
  allComplete: allComplete,
  validateNextAction: validateNextAction,
  missingFields: missingFields
};
