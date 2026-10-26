/* 行情查詢服務：需要時先按需抓取，再用本機快取組回應。 */

const fetchService = require("./fetch");
const query = require("./query");
const mappings = require("./mappings");
const { todayIso } = require("./dates");

async function getMarketPrice(options) {
  const mapping = mappings.mappingBySpecies(options.speciesId);
  if (!mapping) return { found: false, reason: "NO_MAPPING", species_id: options.speciesId };

  let fetched;
  if (options.includeHistory) {
    fetched = await fetchService.ensureFor(mapping, {
      date: options.date || todayIso(),
      days: options.days || 7
    });
  } else {
    fetched = await fetchService.ensureFor(mapping, { date: options.date });
  }

  const result = query.buildResult(options);
  if (fetched.status === "error" && !result.found) {
    return { found: false, reason: "UPSTREAM_UNAVAILABLE", species_id: options.speciesId };
  }
  return result;
}

module.exports = { getMarketPrice: getMarketPrice };
