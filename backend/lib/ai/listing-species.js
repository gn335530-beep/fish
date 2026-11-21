/* 魚種精確解析：官方代碼字典、別名、候選與錯字修正驗證。 */

const sync = require("../market/catalog-sync");
const search = require("../market/catalog-search");
const catalogStore = require("../market/catalog-store");
const { llmError } = require("./error");

function guardRejected() { return llmError("LLM_GUARD_REJECTED"); }

function brief(row) {
  return {
    species_code: row.species_code,
    official_name: row.official_name,
    aliases: row.aliases || []
  };
}

/* 精確查詢，不做模糊比對。已有字典就直接用；空字典才嘗試同步一次。 */
async function lookup(name, timeoutMs) {
  const text = String(name || "").trim();
  if (!text) return { available: true, candidates: [] };
  if (catalogStore.count() === 0) {
    const ready = await sync.ensureCatalog({ timeoutMs: timeoutMs });
    if (!ready.available) return { available: false, candidates: [] };
  }
  return {
    available: true,
    candidates: search.lookup(text).candidates.map(brief)
  };
}

/* 只有剛好一個候選才自動帶入代碼；多候選或查無都留空。 */
function singleCode(result) {
  return result && result.candidates.length === 1 ? result.candidates[0].species_code : null;
}

/* 錯字修正：原字串查無、修正後唯一候選、原值等於草稿、原字串未被保留。 */
async function validateCorrection(correction, draft, protectedNames, timeoutMs) {
  const original = await lookup(correction.original, timeoutMs);
  if (!original.available) throw guardRejected();
  if (original.candidates.length !== 0) throw guardRejected();
  const corrected = await lookup(correction.corrected, timeoutMs);
  if (corrected.candidates.length !== 1) throw guardRejected();
  if (String(draft.fish_species || "") !== correction.original) throw guardRejected();
  if ((protectedNames || []).indexOf(correction.original) !== -1) throw guardRejected();
  return {
    fish_species: correction.corrected,
    species_code: corrected.candidates[0].species_code
  };
}

module.exports = {
  lookup: lookup,
  singleCode: singleCode,
  validateCorrection: validateCorrection
};
