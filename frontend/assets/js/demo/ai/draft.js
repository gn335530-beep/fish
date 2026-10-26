/* 上架草稿：欄位缺漏、價格自動計算與送後端的欄位轉換。 */

import { normalizeCityName } from "./species.js";

const SLOT_ORDER = ["fish_species", "weight_kg", "quantity", "condition", "photo_url", "price"];
const NON_PRICE_SLOTS = SLOT_ORDER.filter(function (slot) { return slot !== "price"; });

function emptyDraft() {
  return {
    fish_species: "",
    species_id: null,
    weight_kg: null,
    quantity: null,
    condition: "",
    photo_url: "",
    price: null,
    price_per_taijin: null,
    price_auto: false
  };
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

export function mergeDraft(draft, found) {
  const next = Object.assign(emptyDraft(), draft || {});
  const source = found || {};
  const hasPrice = hasValue(source.price);
  const hasPerTaijin = hasValue(source.price_per_taijin);

  Object.keys(source).forEach(function (key) {
    const value = source[key];
    if (value === null || value === undefined || value === "") return;
    next[key] = value;
  });
  /* 未知魚種要把物種清成 null，才不會沿用上一個魚種的行情。 */
  if (Object.prototype.hasOwnProperty.call(source, "species_id")) {
    next.species_id = source.species_id || null;
  }

  if (hasPrice) {
    next.price = Number(source.price);
    next.price_auto = false;
    if (!hasPerTaijin) next.price_per_taijin = null;
  } else if (hasPerTaijin) {
    /* 已有明確整批價時視為兩者都填，保留折扣；只有先前是自動計算才重算。 */
    const keepExplicitPrice = next.price != null && next.price !== "" && next.price_auto !== true;
    if (!keepExplicitPrice) next.price_auto = true;
  }

  if (next.price_auto && next.price_per_taijin != null && Number(next.weight_kg) > 0) {
    next.price = Math.round(Number(next.price_per_taijin) * Number(next.weight_kg) / 0.6);
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

/* 送給後端前轉成 API 欄位；只填每台斤時讓後端算整批。 */
export function draftToProduct(draft, user) {
  const payload = {
    fish_species: draft.fish_species,
    species_id: draft.species_id || null,
    weight_kg: draft.weight_kg,
    quantity: draft.quantity,
    condition: draft.condition,
    photo_url: draft.photo_url,
    region: normalizeCityName((user && user.city) || ""),
    location: normalizeCityName((user && user.address) || "")
  };
  if (draft.price_auto) {
    payload.price_per_taijin = draft.price_per_taijin;
  } else {
    payload.price = draft.price;
    if (draft.price_per_taijin != null) payload.price_per_taijin = draft.price_per_taijin;
  }
  return payload;
}
