/* 官方魚種字典（前端）：載入完整字典並在句子中找最長的官方名稱／別名。 */

import { lookupSpecies } from "../../api/market.js";
import { guessUnknownSpecies } from "./conditions.js";

/* 常見說法沒有列在官方名稱裡時，仍能在句子中辨識出魚種；實際代碼由後端別名表解析。 */
const COMMON_NAMES = ["土魠魚", "嘉鱲", "赤鯮", "海鱸", "竹筴魚", "石斑", "吳郭魚", "鮭魚"];

let rows = [];
let loading = null;

export function loadCatalog() {
  if (!loading) {
    loading = lookupSpecies("").then(function (data) {
      rows = (data && data.candidates) || [];
      return rows;
    }).catch(function (error) {
      loading = null;
      throw error;
    });
  }
  return loading;
}

export async function ensureCatalog() {
  try {
    await loadCatalog();
    return true;
  } catch (error) {
    return false;
  }
}

/* 取句子中最長的官方名稱或別名，避免「石斑」誤蓋「龍膽石斑」。 */
export function findCatalogName(text) {
  const source = String(text || "");
  let best = "";
  COMMON_NAMES.forEach(function (name) {
    if (source.indexOf(name) !== -1 && name.length > best.length) best = name;
  });
  rows.forEach(function (row) {
    [row.official_name].concat(row.aliases || []).forEach(function (name) {
      if (name && source.indexOf(name) !== -1 && name.length > best.length) best = name;
    });
  });
  return best;
}

/* 優先保留使用者句子裡的完整魚名，避免只抓到「石斑」而漏掉「龍膽石斑」。 */
export function findSpeciesMention(text) {
  const guessed = guessUnknownSpecies(text);
  const known = findCatalogName(text);
  if (known && guessed && guessed.indexOf(known) === 0) return known;
  return guessed || known;
}
