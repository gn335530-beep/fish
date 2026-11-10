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

/* 處理方式太長時縮小字級；超長時改用膠囊，避免文字擠出圓框。 */
function conditionClass(condition) {
  if (condition.length > 6) return " catch-card__condition--xlong";
  if (condition.length > 4) return " catch-card__condition--long";
  return "";
}

/* 兩個按鈕並排；賣家資訊目前只保留入口，不註冊任何行為。 */
function dealControls(p) {
  var seller = '<button type="button" class="catch-card__btn catch-card__btn--seller" data-action="seller-info">賣家資訊</button>';
  if (p.status === "DELISTED") {
    return '<div class="catch-card__acts">' + seller +
      '<span class="catch-card__note">已下架</span></div>';
  }
  if (productAvailable(p) <= 0) {
    var note = Number(p.reserved_quantity) > 0 ? "洽談中，暫無法購買" : "已售出";
    return '<div class="catch-card__acts">' + seller +
      '<span class="catch-card__note">' + note + '</span></div>';
  }
  return '<div class="catch-card__acts">' + seller +
    '<button type="button" class="catch-card__btn catch-card__btn--primary" data-deal-product="' +
    productEscape(p.id) + '">洽談購買</button></div>';
}

function productCardHTML(p) {
  var photo = window.HaisenAPI.photoUrl(p.photo_url);
  var species = p.fish_species || "商品資訊未提供";
  var condition = p.condition || "未提供";
  var media = photo
    ? '<img class="catch-card__backdrop" src="' + productEscape(photo) + '" alt="" aria-hidden="true">' +
      '<img class="catch-card__photo" src="' + productEscape(photo) + '" alt="' + productEscape(species) + '">'
    : '<div class="media-empty">沒有照片</div>';

  return '<article class="card catch-card">' +
    '<div class="card__media">' + media + '</div>' +
    '<div class="card__body">' +
    '<div class="catch-card__head">' +
    '<h3 class="card__title">' + productEscape(species) + '</h3>' +
    '<span class="catch-card__condition' + conditionClass(condition) + '"><small>處理方式</small><b>' +
    productEscape(condition) + '</b></span>' +
    '</div>' +
    '<p class="catch-card__qty">共 ' + Number(p.quantity || 0) + ' 尾</p>' +
    '<div class="catch-card__prices">' +
    (p.price_per_taijin != null
      ? '<p>每台斤售價：' + productMoney(p.price_per_taijin) + '</p>'
      : '') +
    '<p>整批售價：' + productMoney(p.price) + '</p>' +
    '</div>' +
    '<p class="catch-card__place">' + productEscape(placeOf(p)) + '</p>' +
    dealControls(p) +
    '</div></article>';
}

function renderProductCards(containerId, products) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = (products || []).map(productCardHTML).join("");
}
