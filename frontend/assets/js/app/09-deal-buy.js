/* 商品卡與商品詳情頁的「洽談購買」：交給對話面板開啟交易房。 */

document.addEventListener("click", function (event) {
  var button = event.target.closest("[data-deal-product]");
  if (!button || button.disabled) return;

  var productId = button.getAttribute("data-deal-product");
  var select = document.querySelector('[data-deal-qty="' + productId + '"]');
  var quantity = select ? Number(select.value) || 1 : 1;

  event.preventDefault();
  if (!window.FishMatchBot) {
    if (window.toast) window.toast("小幫手尚未載入，請重新整理");
    return;
  }
  window.FishMatchBot.startDeal(productId, quantity);
});
