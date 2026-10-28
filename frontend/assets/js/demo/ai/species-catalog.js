/* 官方魚種字典（前端）：載入完整字典並在句子中找最長的官方名稱／別名。 */

import { lookupSpecies } from "../../api/market.js";

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
  rows.forEach(function (row) {
    [row.official_name].concat(row.aliases || []).forEach(function (name) {
      if (name && source.indexOf(name) !== -1 && name.length > best.length) best = name;
    });
  });
  return best;
}
