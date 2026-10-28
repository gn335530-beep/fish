/* market_species_catalog 與 market_catalog_state 的存取。 */

const { all, findById, insert, patch, setAll } = require("../store");

const CATALOG = "market_species_catalog";
const STATE = "market_catalog_state";
const STATE_ID = "catalog";

function allCodes() {
  return all(CATALOG);
}

function count() {
  return allCodes().length;
}

function replace(rows) {
  setAll(CATALOG, rows);
  return rows;
}

function getState() {
  return findById(STATE, STATE_ID);
}

function saveState(changes) {
  const existing = getState();
  if (existing) return patch(STATE, existing.id, changes);
  return insert(STATE, Object.assign({
    id: STATE_ID,
    last_status: "",
    last_synced_at: null,
    last_attempt_at: null,
    last_row_count: 0,
    last_error: null,
    last_error_at: null
  }, changes));
}

function reset() {
  setAll(CATALOG, []);
  setAll(STATE, []);
}

module.exports = {
  allCodes: allCodes,
  count: count,
  replace: replace,
  getState: getState,
  saveState: saveState,
  reset: reset
};
