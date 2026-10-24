/* 首頁今日漁獲：依商品 API 回傳順序取前 4 筆，不使用靜態資料。 */
const HOME_LIMIT = 4;

function homeState(text, isError) {
  document.getElementById("today-catch").innerHTML = productStateHTML(text, isError);
}

async function loadTodayCatch() {
  const count = document.getElementById("today-catch-count");
  try {
    const products = await window.HaisenAPI.listProducts();
    const top = products.slice(0, HOME_LIMIT);
    count.textContent = String(products.length);
    if (!top.length) {
      homeState("目前沒有上架中的商品，請稍後再回來看看。");
      return;
    }
    renderProductCards("today-catch", top);
  } catch (error) {
    count.textContent = "—";
    homeState(productErrorText(error, "商品"), true);
  }
}

document.addEventListener("haisen:products-changed", loadTodayCatch);
loadTodayCatch();
