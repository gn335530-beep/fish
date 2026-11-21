/* lookup_species：唯讀官方字典精確查詢，供魚種修正前確認；不做模糊比對。 */

const search = require("../../market/catalog-search");
const sync = require("../../market/catalog-sync");

function brief(row) {
  return {
    species_code: row.species_code,
    official_name: row.official_name,
    aliases: row.aliases || []
  };
}

async function run(args, ctx) {
  const name = String(args.name || args.species_name || "").trim();
  if (!name) return { found: false, query: "", candidates: [] };
  const ready = await sync.ensureCatalog({ timeoutMs: ctx && ctx.timeoutMs });
  if (!ready.available) {
    return { found: false, query: name, candidates: [], reason: "CATALOG_UNAVAILABLE" };
  }
  const candidates = search.lookup(name).candidates.map(brief);
  return { found: candidates.length > 0, query: name, candidates: candidates };
}

module.exports = { run: run };
