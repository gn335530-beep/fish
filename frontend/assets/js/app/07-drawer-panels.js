/* 個人抽屜的內容：只保留交易紀錄與上架紀錄；個人資料改由設定頁維護。 */

function profileHTML(){
  return `
  <button class="drawer__entry" type="button" id="dr-listings" data-open-listings>
    <b>上架紀錄</b><span>上架中、已下架與已售出的商品 →</span>
  </button>
  <button class="drawer__entry" type="button" id="dr-history">
    <b>交易紀錄</b><span>所有訂單、金額與評價 →</span>
  </button>`;
}

function bindDrawerBody(){
  const history = document.getElementById("dr-history");
  if(history) history.addEventListener("click", openTradeHistory);
  const listings = document.getElementById("dr-listings");
  if(listings) listings.addEventListener("click", openListings);
  bindTradeHistory();
  bindListingHistory();
}

function initUserMenu(){
  ensureDrawer();
  refreshNavAvatar();
}
