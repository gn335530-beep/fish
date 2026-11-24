/* LLM slots：只挑平台流程需要的欄位，不重複驗證後端已檢查的型別。 */

const DRAFT_SLOTS = [
  "fish_species", "species_code", "quantity", "condition", "price", "price_per_taijin", "region"
];

export function llmSlots(llm) {
  return (llm && llm.slots && typeof llm.slots === "object") ? llm.slots : {};
}

export function draftSlots(llm) {
  const raw = llmSlots(llm);
  const found = {};
  DRAFT_SLOTS.forEach(function (key) {
    if (raw[key] !== undefined) found[key] = raw[key];
  });
  return found;
}

export function slotHints(llm) {
  const slots = llmSlots(llm);
  return {
    fish_species: slots.fish_species,
    species_code: slots.species_code,
    region: slots.region
  };
}

/* 正規化 hints 內的魚種槽位：名稱 trim；代碼只接受非空正整數。 */
function speciesCode(value) {
  const text = value === undefined || value === null ? "" : String(value).trim();
  return /^\d+$/.test(text) && Number(text) > 0 ? text : "";
}

export function hintedSpecies(hints) {
  const raw = hints || {};
  return {
    name: raw.fish_species ? String(raw.fish_species).trim() : "",
    code: speciesCode(raw.species_code)
  };
}
