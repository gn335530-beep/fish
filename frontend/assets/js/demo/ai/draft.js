/* 上架草稿：欄位缺漏與送後端的欄位轉換；整批售價必填。 */

import { normalizeCityName } from "../../shared/regions.js";

const SLOT_ORDER = ["fish_species", "quantity", "condition", "photo_url", "price"];
const NON_PRICE_SLOTS = SLOT_ORDER.filter(function (slot) { return slot !== "price"; });

function emptyDraft() {
  return {
    fish_species: "",
    species_code: null,
    quantity: null,
    condition: "",
    photo_url: "",
    price: null,
    price_per_taijin: null
  };
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

export function mergeDraft(draft, found) {
  const next = Object.assign(emptyDraft(), draft || {});
  const source = found || {};
  const hasPrice = hasValue(source.price);

  Object.keys(source).forEach(function (key) {
    const value = source[key];
    if (value === null || value === undefined || value === "") return;
    next[key] = value;
  });
  /* 魚種換了但沒有新代碼時先清空，等查詢後再補回；避免沿用上一個魚種。 */
  if (Object.prototype.hasOwnProperty.call(source, "species_code")) {
    next.species_code = source.species_code || null;
  } else if (Object.prototype.hasOwnProperty.call(source, "fish_species")) {
    next.species_code = null;
  }

  if (hasPrice) {
    next.price = Number(source.price);
  }
  return next;
}

export function missingNonPriceSlots(draft) {
  return NON_PRICE_SLOTS.filter(function (slot) {
    return draft[slot] === null || draft[slot] === undefined || draft[slot] === "";
  });
}

export function nonPriceReady(draft) {
  return missingNonPriceSlots(draft).length === 0;
}

export function nextMissingSlot(draft) {
  return SLOT_ORDER.find(function (slot) {
    return draft[slot] === null || draft[slot] === undefined || draft[slot] === "";
  }) || null;
}

export function draftReady(draft) {
  return nextMissingSlot(draft) === null;
}

/* 送給後端前轉成 API 欄位；每台斤售價只在有值時才送。 */
export function draftToProduct(draft, user) {
  const payload = {
    fish_species: draft.fish_species,
    species_code: draft.species_code || null,
    quantity: draft.quantity,
    condition: draft.condition,
    photo_url: draft.photo_url,
    region: normalizeCityName((user && user.city) || ""),
    location: normalizeCityName((user && user.address) || ""),
    price: draft.price
  };
  if (draft.price_per_taijin != null) payload.price_per_taijin = draft.price_per_taijin;
  return payload;
}
