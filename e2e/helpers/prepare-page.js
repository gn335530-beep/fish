/* 每個 spec 共用的頁面前置：測試後端 base 與固定行情。 */

const { useTestApi } = require("./test-api");
const { installMarketFixture } = require("./market-fixture");

async function preparePage(page) {
  await useTestApi(page);
  await installMarketFixture(page);
}

module.exports = { preparePage: preparePage };
