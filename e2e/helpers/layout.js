/* 頁面幾何斷言：只檢查使用者看得到的溢出與載入完成狀態。 */

const { expect } = require("@playwright/test");

async function waitForFonts(page) {
  await page.evaluate(function () {
    return document.fonts && document.fonts.ready;
  });
}

async function horizontalOverflow(page) {
  return page.evaluate(function () {
    const doc = document.documentElement;
    const body = document.body;
    return {
      document: doc.scrollWidth - doc.clientWidth,
      body: body ? body.scrollWidth - body.clientWidth : 0
    };
  });
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await horizontalOverflow(page);
  expect(overflow.document, "文件寬度不得超出版面").toBeLessThanOrEqual(1);
  expect(overflow.body, "body 寬度不得超出版面").toBeLessThanOrEqual(1);
}

module.exports = {
  waitForFonts: waitForFonts,
  horizontalOverflow: horizontalOverflow,
  expectNoHorizontalOverflow: expectNoHorizontalOverflow
};
