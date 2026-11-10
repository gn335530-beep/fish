/* e2e 共用位址：前台固定 8090，測試後端固定 3101，避免碰觸開發中的 3001。 */

const path = require("node:path");

const FRONTEND_PORT = 8090;
const API_PORT = 3101;
const API_ORIGIN = "http://127.0.0.1:" + API_PORT;
const E2E_DB = path.join(__dirname, ".data", "db.json");

module.exports = {
  FRONTEND_PORT: FRONTEND_PORT,
  API_PORT: API_PORT,
  API_ORIGIN: API_ORIGIN,
  E2E_DB: E2E_DB
};
