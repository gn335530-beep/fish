/* 槽位抽取：魚種、重量、尾數、處理方式、照片、價格。 */

import { findSpecies, normalizeCityName } from "./species.js";

const SLOT_ORDER = ["fish_species", "weight_kg", "quantity", "condition", "photo_url", "price"];

const CONDITIONS = [
  { value: "活體", words: ["活體", "活魚", "活跳", "蓄養", "還活著"] },
  { value: "放血冰鎮", words: ["放血", "冰鎮", "碎冰", "冰水"] },
  { value: "三去處理", words: ["三去", "去鱗", "去鰓", "去內臟", "宰殺", "處理好"] },
  { value: "冷凍", words: ["冷凍", "凍"] }
];

function emptyDraft() {
  return {
    fish_species: "",
    weight_kg: null,
    quantity: null,
    condition: "",
    photo_url: "",
    price: null
  };
}

function round1(value) {
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

/* 字典沒有的魚種：從句子中移除意圖、數量、單位與處理方式後，留下名稱。 */
function guessUnknownSpecies(text) {
  const noise = /我要買魚|我要買|想買|要買|買魚|我要賣魚|我要賣|想賣|要賣|賣魚|上架|出售|賣掉|剛釣到|剛釣|釣到|捕獲|今天|幫我|請問|不知道|不確定|忘了|我的|想要|想|大概|大約|左右|差不多|怎麼|什麼魚|什麼|如何|多少|價錢|價格|公斤|kg|KG|Kg|台斤|斤|尾|條|隻|份|元|塊|活體|活魚|活跳|蓄養|還活著|放血冰鎮|放血|冰鎮|碎冰|冰水|三去處理|三去|去鱗|去鰓|去內臟|宰殺|處理好|冷凍|凍|照片|上傳|一張|一隻|一條|一尾|兩隻|兩條|兩尾|新鮮|現流|我|你|他|的|約|賣/g;
  const candidate = String(text || "")
    .replace(noise, " ")
    .replace(/\d+(?:\.\d+)?/g, " ")
    .replace(/[一二兩三四五六七八九十]+/g, " ")
    .replace(/^(的|是|為|叫|叫做)+/, "")
    .replace(/[啦喔啊耶吧呢]/g, "")
    .replace(/[，,。.!！?？、:：;；\s]/g, "");

  if (candidate.length < 2 || candidate.length > 10) return "";
  if (!/[\u4e00-\u9fff]/.test(candidate)) return "";
  if (["魚", "海鮮", "海產", "東西", "什麼", "什麼魚", "怎麼", "如何", "多少", "價格", "價錢", "這個", "那個", "未知", "魚種", "不知道"].indexOf(candidate) !== -1) return "";
  return candidate;
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
  if (spice) {
    found.fish_species = spice.name;
  } else if (!assumeSlot || assumeSlot === "fish_species") {
    const guess = guessUnknownSpecies(source);
    if (guess) found.fish_species = guess;
  }

  const condition = matchCondition(source);
  if (condition) found.condition = condition;

  /* 沒有單位的重量優先接受小數，避免把整數價格或尾數當成重量。 */
  if (found.weight_kg === undefined && (!assumeSlot || assumeSlot === "weight_kg")) {
    const bareWeight = /(\d+\.\d+)(?!\s*(?:元|塊|nt|NT))/.exec(rest);
    if (bareWeight) {
      found.weight_kg = round1(Number(bareWeight[1]));
      rest = strip(rest, bareWeight[0]);
    }
  }

  /* 已有尾數時，剩下的小整數可視為公斤；四位數以上留給價格。 */
  if (found.weight_kg === undefined && found.quantity !== undefined &&
      (!assumeSlot || assumeSlot === "weight_kg")) {
    const bareKg = /(?:^|\D)(\d{1,3})(?!\d)/.exec(rest);
    if (bareKg && Number(bareKg[1]) > 0 && Number(bareKg[1]) <= 200) {
      found.weight_kg = round1(Number(bareKg[1]));
      rest = strip(rest, bareKg[0]);
    }
  }

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
    region: normalizeCityName((user && user.city) || ""),
    location: normalizeCityName((user && user.address) || "")
  };
}
