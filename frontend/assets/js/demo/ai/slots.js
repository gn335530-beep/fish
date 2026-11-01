/* 槽位抽取：先套明確單位與價格標記，再用裸數字補尾數。 */

import { findSpeciesMention } from "./species-catalog.js";
import { cleanCondition, extractCondition } from "./conditions.js";
import "../../shared/format.js";

const BARE_LIMIT = 999;
const UNIT_WORDS = /(公斤|kg|KG|Kg|台斤|斤|尾|條|隻|份|元|塊)/g;

/* 處理方式必須有文字；只有數字與單位不算。 */
function hasText(value) {
  return /[A-Za-z\u4e00-\u9fff]/.test(String(value || "").replace(UNIT_WORDS, ""));
}

function strip(text, match) {
  return text.replace(match, " ");
}

/* 收集剩下的整數；小數不當尾數，價格標記也已移除。 */
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

/* 重量已不再收集，但仍先移除，避免把「3公斤」的 3 當成尾數。 */
function dropWeightMentions(text) {
  return text.replace(/\d+(?:\.\d+)?\s*(?:公斤|kg|KG|Kg|台斤|斤)/g, " ");
}

/* assumeSlot：當使用者只回一個數字時，要放進哪個槽位。 */
export function extractSlots(text, assumeSlot) {
  const source = String(text || "");
  const found = {};
  let rest = source;

  if (assumeSlot === "condition") {
    const condition = cleanCondition(source);
    return hasText(condition) ? { condition: condition } : {};
  }

  const quantityMatch = /(\d+)\s*(尾|條|隻|份)/.exec(rest);
  if (quantityMatch) {
    found.quantity = Number(quantityMatch[1]);
    rest = strip(rest, quantityMatch[0]);
  }

  if (!assumeSlot || assumeSlot === "fish_species") {
    const name = findSpeciesMention(source);
    if (name) {
      found.fish_species = name;
      found.species_code = null;
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

  const condition = extractCondition(dropWeightMentions(rest), found.fish_species);
  if (condition && hasText(condition)) found.condition = condition;

  /* 價格步驟只認價格，避免把裸數字誤補成尾數。 */
  if (assumeSlot === "price") {
    if (found.price === undefined && found.price_per_taijin === undefined) {
      const barePrice = /(\d+(?:\.\d+)?)/.exec(rest);
      if (barePrice) found.price = Number(barePrice[1]);
    }
    return found;
  }

  /* 尾數只在明確問尾數、或句子裡剛好只有一個裸整數時補上。 */
  if (found.quantity === undefined && (!assumeSlot || assumeSlot === "quantity")) {
    const bare = bareIntegers(dropWeightMentions(rest))
      .filter(function (value) { return value > 0 && value <= BARE_LIMIT; });
    if (bare.length === 1) found.quantity = bare[0];
  }
  return found;
}
