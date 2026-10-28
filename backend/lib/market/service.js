/* 行情查詢服務：呼叫端要求時每次都抓上游，再以本機資料組回應。 */

const fetchService = require("./fetch");
const query = require("./query");
const mappings = require("./mappings");
const { todayIso } = require("./dates");

async function getMarketPrice(options) {
  const mapping = options.mapping || mappings.mappingBySpecies(options.speciesId);
  if (!mapping) return { found: false, reason: "NO_MAPPING", species_id: options.speciesId || null };

  const fetchOptions = options.includeHistory
    ? { date: options.date || todayIso(), days: options.days || 7, force: options.force === true }
    : { date: options.date, force: options.force === true };
  const fetched = await fetchService.ensureFor(mapping, fetchOptions);

  const result = query.buildResult(Object.assign({}, options, { mapping: mapping }));
  if (fetched.status === "error" && !result.found) {
    return {
      found: false,
      reason: "UPSTREAM_UNAVAILABLE",
      species_code: mapping.code,
      species_id: mapping.species_id || null,
      official_name: mapping.official_name || null,
      is_aquaculture: mapping.is_aquaculture === true
    };
  }
  return result;
}

module.exports = { getMarketPrice: getMarketPrice };
