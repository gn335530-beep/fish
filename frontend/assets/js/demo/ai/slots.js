/* 槽位抽取：魚種、重量、尾數、處理方式、照片、價格。 */

import { findSpecies } from "./species.js";

export const SLOT_ORDER = ["fish_species", "weight_kg", "quantity", "condition", "photo_url", "price"];

const CONDITIONS = [
  { value: "活體", words: ["活體", "活魚", "活跳", "蓄養", "還活著"] },
  { value: "放血冰鎮", words: ["放血", "冰鎮", "碎冰", "冰水"] },
  { value: "三去處理", words: ["三去", "去鱗", "去鰓", "去內臟", "宰殺", "處理好"] },
  { value: "冷凍", words: ["冷凍", "凍"] }
];

export function emptyDraft() {
  return {
    fish_species: "",
    weight_kg: null,
    quantity: null,
    condition: "",
    photo_url: "",
    price: null
  };
}

export function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function strip(text, match) {
  return text.replace(match, " ");
}

function matchCondition(text) {
  for (const condition of CONDITIONS) {
    const hit = condition.words.some(function (word) { return text.indexOf(word) !== -1; });
    if (hit) return condition.value;
  }
  return "";
}

/* assumeSlot：當使用者只回一個數字時，要放進哪個槽位。 */
export function extractSlots(text, assumeSlot) {
  const source = String(text || "");
  const found = {};
  let rest = source;

  const weightMatch = /(\d+(?:\.\d+)?)\s*(公斤|kg|KG|Kg|台斤|斤)/.exec(rest);
  if (weightMatch) {
    let kg = Number(weightMatch[1]);
    const unit = weightMatch[2];
    if (unit === "台斤" || unit === "斤") kg = kg * 0.6;
    found.weight_kg = round1(kg);
    rest = strip(rest, weightMatch[0]);
  }

  const quantityMatch = /(\d+)\s*(尾|條|隻|份)/.exec(rest);
  if (quantityMatch) {
    found.quantity = Number(quantityMatch[1]);
    rest = strip(rest, quantityMatch[0]);
  }

  const spice = findSpecies(source);
  if (spice) found.fish_species = spice.name;

  const condition = matchCondition(source);
  if (condition) found.condition = condition;

  const priceMatch = /(\d{2,6})\s*(元|塊|nt|NT)?/.exec(rest);
  if (priceMatch) found.price = Number(priceMatch[1]);

  if (assumeSlot && found[assumeSlot] === undefined) {
    const bare = /^\s*(\d+(?:\.\d+)?)\s*(元|塊)?\s*$/.exec(rest);
    if (bare) {
      const value = Number(bare[1]);
      if (assumeSlot === "weight_kg") found.weight_kg = round1(value);
      if (assumeSlot === "quantity") found.quantity = Math.floor(value);
      if (assumeSlot === "price") found.price = Math.round(value);
    }
  }

  return found;
}

export function mergeDraft(draft, found) {
  const next = Object.assign(emptyDraft(), draft || {});
  Object.keys(found || {}).forEach(function (key) {
    const value = found[key];
    if (value === null || value === undefined || value === "") return;
    next[key] = value;
  });
  return next;
}

export function nextMissingSlot(draft) {
  return SLOT_ORDER.find(function (slot) {
    return draft[slot] === null || draft[slot] === undefined || draft[slot] === "";
  }) || null;
}

export function draftReady(draft) {
  return nextMissingSlot(draft) === null;
}

/* 送給後端前轉成 API 欄位。 */
export function draftToProduct(draft, user) {
  return {
    fish_species: draft.fish_species,
    weight_kg: draft.weight_kg,
    quantity: draft.quantity,
    condition: draft.condition,
    photo_url: draft.photo_url,
    price: draft.price,
    region: (user && user.city) || "",
    location: (user && user.address) || ""
  };
}
