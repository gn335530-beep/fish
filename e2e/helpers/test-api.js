/* 把前台 config.js 的 API base 指到測試後端，不動開發中的 3001。 */

const { API_ORIGIN } = require("../config");

async function useTestApi(page) {
  await page.route("**/assets/js/config.js*", function (route) {
    return route.fulfill({
      status: 200,
      contentType: "text/javascript; charset=utf-8",
      body: 'window.HAISEN_API_BASE = "' + API_ORIGIN + '";'
    });
  });
}

module.exports = { useTestApi: useTestApi };
