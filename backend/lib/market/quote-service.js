/* 行情整合查詢：名稱先查官方代碼字典，再用代碼查價；過渡期保留舊 species_id。 */

const service = require("./service");
const mappings = require("./mappings");
const catalogSync = require("./catalog-sync");
const search = require("./catalog-search");

function mappingFromCandidate(candidate) {
  return {
    code: candidate.species_code,
    species_id: null,
    official_name: candidate.official_name,
    category: candidate.category,
    is_aquaculture: candidate.is_aquaculture === true
  };
}

function unavailable() {
  return { error: "CATALOG_UNAVAILABLE" };
}

async function catalogReady() {
  const result = await catalogSync.ensureCatalog();
  return result.available;
}

async function quoteByCode(code, options) {
  const legacy = mappings.mappingByCode(code);
  if (await catalogReady()) {
    const candidate = search.lookup(String(code)).candidates[0];
    if (candidate) {
      return service.getMarketPrice(Object.assign({}, options, {
        mapping: mappingFromCandidate(candidate)
      }));
    }
    if (legacy) return service.getMarketPrice(Object.assign({}, options, { mapping: legacy }));
    return { error: "SPECIES_NOT_FOUND" };
  }
  if (legacy) return service.getMarketPrice(Object.assign({}, options, { mapping: legacy }));
  return unavailable();
}

async function quoteByName(name, options) {
  if (!(await catalogReady())) return unavailable();
  const candidates = search.lookup(name).candidates;
  if (candidates.length === 0) return { error: "SPECIES_NOT_FOUND" };
  if (candidates.length > 1) return { error: "AMBIGUOUS_SPECIES", candidates: candidates };
  return service.getMarketPrice(Object.assign({}, options, {
    mapping: mappingFromCandidate(candidates[0])
  }));
}

module.exports = {
  quoteByCode: quoteByCode,
  quoteByName: quoteByName
};
