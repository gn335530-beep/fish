/* 槽位抽取：先套明確單位與價格標記，再用消去法處理裸數字。 */

import { findSpecies } from "./species.js";
import { cleanCondition, extractCondition, guessUnknownSpecies } from "./conditions.js";

const NUMBER_SLOTS = ["weight_kg", "quantity"];
const BARE_LIMIT = 999;

function roundWeight(value) {
  return Math.round(Number(value) * 100) / 100;
}

function strip(text, match) {
  return text.replace(match, " ");
}

/* 收集剩下的整數；小數已在前面當成重量，價格標記也已移除。 */
function bareIntegers(text) {
  const values = [];
  const pattern = /(^|[^\d.])(\d+)(?![\d.])/g;
  let match = pattern.exec(text);
  while (match) {
    values.push(Number(match[2]));
    match = pattern.exec(text);
  }
  return values;
}

function valueFor(slot, value) {
  return slot === "quantity" ? Math.floor(value) : roundWeight(value);
}

/* 重量與尾數用消去法補；判不出來的數字留給呼叫端回問。 */
function applyBareNumbers(found, rest, assumeSlot) {
  const missing = NUMBER_SLOTS.filter(function (slot) { return found[slot] === undefined; });
  if (!missing.length) return [];
  const bare = bareIntegers(rest);

  if ((assumeSlot === "weight_kg" || assumeSlot === "quantity") &&
      missing.indexOf(assumeSlot) !== -1 && bare.length) {
    found[assumeSlot] = valueFor(assumeSlot, bare.shift());
  }

  const stillMissing = NUMBER_SLOTS.filter(function (slot) { return found[slot] === undefined; });
  if (stillMissing.length === 1) {
    const index = bare.findIndex(function (value) { return value > 0 && value <= BARE_LIMIT; });
    if (index !== -1) {
      const slot = stillMissing[0];
      found[slot] = valueFor(slot, bare.splice(index, 1)[0]);
    }
    return [];
  }

  return bare.filter(function (value) { return value > 0 && value <= BARE_LIMIT; });
}

/* assumeSlot：當使用者只回一個數字時，要放進哪個槽位。 */
export function extractSlots(text, assumeSlot, details) {
  const source = String(text || "");
  const found = {};
  let rest = source;

  if (assumeSlot === "condition") {
    const condition = cleanCondition(source);
    return condition ? { condition: condition } : {};
  }

  const weightMatch = /(\d+(?:\.\d+)?)\s*(公斤|kg|KG|Kg|台斤|斤)/.exec(rest);
  if (weightMatch) {
    let kg = Number(weightMatch[1]);
    const unit = weightMatch[2];
    if (unit === "台斤" || unit === "斤") kg = kg * 0.6;
    found.weight_kg = roundWeight(kg);
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
    found.species_id = spice.id;
  } else if (!assumeSlot || assumeSlot === "fish_species") {
    const guess = guessUnknownSpecies(source);
    if (guess) {
      found.fish_species = guess;
      found.species_id = null;
    }
  }

  const perTaijinMatch = /(?:每\s*(?:台斤|斤)|一\s*(?:台斤|斤))\s*(\d+(?:\.\d+)?)/.exec(rest)
    || /(\d+(?:\.\d+)?)\s*(?:元)?\s*[／/]\s*(?:台斤|斤)/.exec(rest)
    || /(\d+(?:\.\d+)?)\s*元?\s*(?:每|一)?\s*(?:台斤|斤)/.exec(rest);
  if (perTaijinMatch) {
    found.price_per_taijin = Number(perTaijinMatch[1]);
    rest = strip(rest, perTaijinMatch[0]);
  }

  const lumpMatch = /(?:整批|總價|價格|售價)\s*(?:是|為)?\s*(\d+(?:\.\d+)?)\s*(?:元|塊)?/.exec(rest);
  if (lumpMatch) {
    found.price = Number(lumpMatch[1]);
    rest = strip(rest, lumpMatch[0]);
  }

  const amountMatch = /(\d+(?:\.\d+)?)\s*(?:元|塊)/.exec(rest);
  if (amountMatch) {
    found.price = Number(amountMatch[1]);
    rest = strip(rest, amountMatch[0]);
  }

  const condition = extractCondition(rest, found.fish_species);
  if (condition) found.condition = condition;

  /* 價格步驟只認價格，避免把裸數字誤補成重量或尾數。 */
  if (assumeSlot === "price") {
    if (found.price === undefined && found.price_per_taijin === undefined) {
      const barePrice = /(\d+(?:\.\d+)?)/.exec(rest);
      if (barePrice) found.price = Number(barePrice[1]);
    }
    return found;
  }

  /* 沒有單位的重量優先接受小數，避免把整數價格或尾數當成重量。 */
  if (found.weight_kg === undefined && (!assumeSlot || assumeSlot === "weight_kg")) {
    const bareWeight = /(\d+\.\d+)(?!\s*(?:元|塊|nt|NT))/.exec(rest);
    if (bareWeight) {
      found.weight_kg = roundWeight(Number(bareWeight[1]));
      rest = strip(rest, bareWeight[0]);
    }
  }

  const ambiguous = applyBareNumbers(found, rest, assumeSlot);
  if (details && ambiguous.length) details.ambiguous = ambiguous;
  return found;
}
