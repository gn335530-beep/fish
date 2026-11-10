/* e2e 共用位址：前台固定 8090，測試後端固定 3101，避免碰觸開發中的 3001。
   截圖 baseline 目前以 win32 建立；其他平台可用 E2E_VISUALS=1 重新產生。 */

const path = require("node:path");

const FRONTEND_PORT = 8090;
const API_PORT = 3101;
const API_ORIGIN = "http://127.0.0.1:" + API_PORT;
const E2E_DB = path.join(__dirname, ".data", "db.json");
const VISUAL_BASELINE = process.platform === "win32" || process.env.E2E_VISUALS === "1";

module.exports = {
  FRONTEND_PORT: FRONTEND_PORT,
  API_PORT: API_PORT,
  API_ORIGIN: API_ORIGIN,
  E2E_DB: E2E_DB,
  VISUAL_BASELINE: VISUAL_BASELINE
};
