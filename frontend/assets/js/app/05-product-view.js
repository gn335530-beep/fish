/* 商品（products API）的顯示轉換與首頁／今日漁獲共用的直式商品卡。 */

/* 格式化集中於 shared/format.js；這裡用延遲取值，classic 腳本不依賴載入順序。 */
function productEscape(value) { return window.HaisenFormat.escapeHtml(value); }
function productMoney(value) { return window.HaisenFormat.money(value); }

function productAvailable(p) {
  return Math.max(0, Number(p.available || 0));
}

function productStateHTML(text, isError) {
  return '<p class="state-msg' + (isError ? " state-msg--error" : "") + '">' +
    productEscape(text) + '</p>';
}

function productErrorText(error, label) {
  return error.status === 0
    ? "無法連線到伺服器，請確認後端已啟動"
    : label + "載入失敗：" + error.message;
}

function placeOf(p) {
  var region = normalizeCityName(p.region);
  var location = normalizeCityName(p.location);
  if (!region || !location) return "地區未提供";
  return region + "　" + location;
}

/* 兩個按鈕並排；賣家資訊目前只保留入口，不註冊任何行為。 */
function dealControls(p) {
  var seller = '<button type="button" class="btn btn--ghost btn--sm" data-action="seller-info">賣家資訊</button>';
  if (productAvailable(p) <= 0) {
    var note = Number(p.reserved_quantity) > 0 ? "洽談中，暫無法購買" : "已售出";
    return '<div class="card__deal">' + seller +
      '<span class="card__deal-note">' + note + '</span></div>';
  }
  return '<div class="card__deal">' + seller +
    '<button type="button" class="btn btn--primary btn--sm" data-deal-product="' +
    productEscape(p.id) + '">洽談購買</button></div>';
}

function productCardHTML(p) {
  var photo = window.HaisenAPI.photoUrl(p.photo_url);
  var species = p.fish_species || "商品資訊未提供";
  var media = photo
    ? '<img src="' + productEscape(photo) + '" alt="' + productEscape(species) + '">'
    : '<div class="media-empty">沒有照片</div>';

  return '<article class="card catch-card">' +
    '<div class="card__media">' + media + '</div>' +
    '<div class="card__body">' +
    '<h3 class="card__title">' + productEscape(species) + '</h3>' +
    '<span class="badge badge--coral card__condition">處理方式：' + productEscape(p.condition || "未提供") + '</span>' +
    '<div class="card__meta"><span>共 ' + Number(p.quantity || 0) + ' 尾</span></div>' +
    (p.price_per_taijin != null
      ? '<div class="card__meta"><span>每台斤售價：' + productMoney(p.price_per_taijin) + '</span></div>'
      : '') +
    '<div class="card__price"><b>整批售價：' + productMoney(p.price) + '</b></div>' +
    '<div class="card__meta"><span>' + productEscape(placeOf(p)) + '</span></div>' +
    dealControls(p) +
    '</div></article>';
}

function renderProductCards(containerId, products) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = (products || []).map(productCardHTML).join("");
}
