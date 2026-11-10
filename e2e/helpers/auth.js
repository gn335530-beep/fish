/* 以 seed 帳號登入；登入頁流程也是要驗證的使用者行為。 */

const { expect } = require("@playwright/test");

const BUYER = Object.freeze({
  phone: "0987654321",
  password: "buyer123",
  displayName: "小魚買家"
});

const SELLER = Object.freeze({
  phone: "0912345678",
  password: "seller123",
  displayName: "陳阿海"
});

async function loginAs(page, account) {
  const user = account || BUYER;
  await page.goto("/pages/login.html");
  await page.locator("#li-phone").fill(user.phone);
  await page.locator("#li-pass").fill(user.password);
  await page.locator("#li-submit").click();
  await expect(page.locator("#auth-modal")).toHaveClass(/show/);
  await page.locator("#auth-go").click();
  await expect(page).toHaveURL(/\/pages\/index\.html$/);
  await expect(page.locator(".nav-user__name")).toHaveText(user.displayName);
}

function loginAsBuyer(page) {
  return loginAs(page, BUYER);
}

function loginAsSeller(page) {
  return loginAs(page, SELLER);
}

module.exports = {
  BUYER: BUYER,
  SELLER: SELLER,
  loginAs: loginAs,
  loginAsBuyer: loginAsBuyer,
  loginAsSeller: loginAsSeller
};
