/* 槽位抽取：魚種、重量、尾數、處理方式與價格。 */

import { findSpecies } from "./species.js";
import { cleanCondition, extractCondition, guessUnknownSpecies } from "./conditions.js";

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function strip(text, match) {
  return text.replace(match, " ");
}

/* assumeSlot：當使用者只回一個數字時，要放進哪個槽位。 */
export function extractSlots(text, assumeSlot) {
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

  const condition = extractCondition(source);
  if (condition) found.condition = condition;

  /* 沒有單位的重量優先接受小數，避免把整數價格或尾數當成重量。 */
  if (found.weight_kg === undefined && (!assumeSlot || assumeSlot === "weight_kg")) {
    const bareWeight = /(\d+\.\d+)(?!\s*(?:元|塊|nt|NT))/.exec(rest);
    if (bareWeight) {
      found.weight_kg = round1(Number(bareWeight[1]));
      rest = strip(rest, bareWeight[0]);
    }
  }

  /* 已有尾數時，剩下 20 公斤以內的小整數可視為公斤；較大的整數留給價格。 */
  if (found.weight_kg === undefined && found.quantity !== undefined &&
      (!assumeSlot || assumeSlot === "weight_kg")) {
    const bareKg = /(?:^|\D)(\d{1,3})(?!\d)/.exec(rest);
    if (bareKg && Number(bareKg[1]) > 0 && Number(bareKg[1]) <= 20) {
      found.weight_kg = round1(Number(bareKg[1]));
      rest = strip(rest, bareKg[0]);
    }
  }

  const perTaijinMatch = /(?:每\s*(?:台斤|斤)|一\s*(?:台斤|斤))\s*(\d+(?:\.\d+)?)/.exec(rest)
    || /(\d+(?:\.\d+)?)\s*(?:元)?\s*[／/]\s*(?:台斤|斤)/.exec(rest)
    || /(\d+(?:\.\d+)?)\s*元?\s*(?:每|一)?\s*(?:台斤|斤)/.exec(rest);
  if (perTaijinMatch) {
    found.price_per_taijin = Number(perTaijinMatch[1]);
    rest = strip(rest, perTaijinMatch[0]);
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
