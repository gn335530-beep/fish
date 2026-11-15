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
