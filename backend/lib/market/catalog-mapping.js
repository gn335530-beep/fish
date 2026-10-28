/* 官方代碼 → 行情查詢所需的 mapping；名稱與代碼都先經過字典。 */

const catalogSync = require("./catalog-sync");
const search = require("./catalog-search");

function mappingFromCandidate(candidate) {
  return {
    code: candidate.species_code,
    official_name: candidate.official_name,
    category: candidate.category,
    is_aquaculture: candidate.is_aquaculture === true
  };
}

async function catalogReady() {
  const result = await catalogSync.ensureCatalog();
  return result.available;
}

async function resolveCode(code) {
  if (!(await catalogReady())) return { error: "CATALOG_UNAVAILABLE" };
  const candidate = search.lookup(String(code)).candidates[0];
  if (!candidate) return { error: "SPECIES_NOT_FOUND" };
  return { mapping: mappingFromCandidate(candidate) };
}

async function resolveName(name) {
  if (!(await catalogReady())) return { error: "CATALOG_UNAVAILABLE" };
  const candidates = search.lookup(name).candidates;
  if (candidates.length === 0) return { error: "SPECIES_NOT_FOUND" };
  if (candidates.length > 1) return { error: "AMBIGUOUS_SPECIES", candidates: candidates };
  return { mapping: mappingFromCandidate(candidates[0]) };
}

module.exports = {
  mappingFromCandidate: mappingFromCandidate,
  resolveCode: resolveCode,
  resolveName: resolveName
};
