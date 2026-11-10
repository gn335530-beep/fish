/* Playwright 視覺 seam：啟動測試後端與靜態前台，只跑 chromium。
   baseline 規則見 e2e/README.md。 */

const { defineConfig } = require("@playwright/test");
const { FRONTEND_PORT, API_PORT, E2E_DB } = require("./e2e/config");

function envWith(extra) {
  return Object.assign({}, process.env, extra);
}

module.exports = defineConfig({
  testDir: "./e2e/tests",
  timeout: 30000,
  expect: {
    timeout: 7000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide"
    }
  },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:" + FRONTEND_PORT,
    browserName: "chromium",
    locale: "zh-TW",
    timezoneId: "Asia/Taipei",
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1280, height: 800 } }
    },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true
      }
    }
  ],
  webServer: [
    {
      command: "node e2e/scripts/start-backend.js",
      port: API_PORT,
      timeout: 60000,
      reuseExistingServer: false,
      env: envWith({
        PORT: String(API_PORT),
        FISHMATCH_DB: E2E_DB
      })
    },
    {
      command: "node tools/serve-frontend.js",
      port: FRONTEND_PORT,
      timeout: 30000,
      reuseExistingServer: false,
      env: envWith({ PORT: String(FRONTEND_PORT) })
    }
  ]
});
