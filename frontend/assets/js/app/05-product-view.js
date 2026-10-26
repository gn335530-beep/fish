/* 商品（products API）的顯示轉換與卡片。 */

function productEscape(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

function productMoney(value) {
  return Number(value || 0).toLocaleString("en-US") + " 元";
}

function productDate(value) {
  if (!value) return "日期未提供";
  var d = new Date(value);
  if (isNaN(d.getTime())) return "日期未提供";
  var month = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "/" + month + "/" + day;
}

function productWeight(p) {
  return Number(p.weight_kg || 0).toFixed(1);
}

function productAvailable(p) {
  return Math.max(0, Number(p.available || 0));
}

function productTitle(p) {
  if (p.title) return p.title;
  var quantity = Number(p.quantity || 0);
  return (p.fish_species || "未提供魚種") + "（" + productWeight(p) + "kg / " +
    quantity + "尾 / " + (p.condition || "未標示") + "）";
}

function productStatus(p) {
  if (p.status === "PARTIALLY_RESERVED") return "洽談中";
  if (p.status === "SOLD_OUT") return "已售出";
  return "可售 " + productAvailable(p) + " 尾";
}

function hasMarketSnapshot(snapshot) {
  return !!(snapshot && snapshot.price_per_taijin != null);
}

function marketSnapshotPrice(snapshot) {
  if (!hasMarketSnapshot(snapshot)) return "暫無行情";
  return Number(snapshot.price_per_taijin).toFixed(1).replace(/\.0$/, "") + " 元／台斤";
}

function marketSnapshotScope(snapshot) {
  if (!hasMarketSnapshot(snapshot)) return "";
  return snapshot.scope === "city" ? (snapshot.region || "縣市") + "平均" : "全國平均";
}

function marketSnapshotSource(snapshot) {
  const parts = ["新鮮批發參考"];
  if (hasMarketSnapshot(snapshot) && snapshot.source) parts.unshift(snapshot.source);
  if (hasMarketSnapshot(snapshot) && snapshot.is_aquaculture) parts.push("養殖價格");
  return parts.join(" · ");
}

function marketSnapshotCardHTML(snapshot) {
  if (!hasMarketSnapshot(snapshot)) {
    return '<div class="card__market"><span class="card__market-label">新鮮批發參考</span>' +
      '<span class="card__market-empty">暫無行情</span></div>';
  }
  var meta = [
    marketSnapshotScope(snapshot),
    snapshot.trade_date,
    marketSnapshotSource(snapshot)
  ].filter(Boolean).join(" · ");
  return '<div class="card__market"><span class="card__market-label">新鮮批發參考</span>' +
    '<b class="card__market-price">' + productEscape(marketSnapshotPrice(snapshot)) + '</b>' +
    '<span class="card__market-meta">' + productEscape(meta) + '</span></div>';
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

function productDateLabel(p) {
  if (p.catch_time) return "釣獲 " + productDate(p.catch_time);
  if (p.created_at) return "上架 " + productDate(p.created_at);
  return "日期未提供";
}

function dealQuantityOptions(available) {
  var options = "";
  for (var i = 1; i <= available; i++) {
    options += '<option value="' + i + '">' + i + ' 尾</option>';
  }
  return options;
}

function dealControls(p) {
  var available = productAvailable(p);
  if (available <= 0) {
    var note = Number(p.reserved_quantity) > 0 ? "洽談中，暫無法購買" : "已售出，無法洽談";
    return '<div class="card__deal"><span class="card__deal-note">' + note + '</span></div>';
  }
  return '<div class="card__deal">' +
    '<select class="select card__deal-qty" data-deal-qty="' + productEscape(p.id) + '" aria-label="購買尾數">' +
    dealQuantityOptions(available) + '</select>' +
    '<button type="button" class="btn btn--primary btn--sm" data-deal-product="' +
    productEscape(p.id) + '">洽談購買</button>' +
    '</div>';
}

function productCardHTML(p) {
  var href = "product-detail.html?id=" + encodeURIComponent(p.id);
  var photo = window.HaisenAPI.photoUrl(p.photo_url);
  var region = normalizeCityName(p.region) || "地區未提供";
  var location = normalizeCityName(p.location) || "地點未提供";
  var quantity = Number(p.quantity || 0);
  var available = productAvailable(p);
  var unknown = !p.species_id;
  var media = photo
    ? '<img src="' + productEscape(photo) + '" alt="' + productEscape(p.fish_species || "商品照片") + '">'
    : '<div class="media-empty">沒有照片</div>';

  return '<article class="card catch-card">' +
    '<a href="' + href + '" class="card__media">' + media +
    '<div class="card__tags"><span class="badge">' + productEscape(region) + '</span>' +
    (unknown ? '<span class="badge">未知魚種</span>' : "") +
    '<span class="badge badge--coral">' + productEscape(productStatus(p)) + '</span></div>' +
    '</a>' +
    '<div class="card__body">' +
    '<div class="card__seller">' + productEscape(productDateLabel(p)) + '</div>' +
    '<h3 class="card__title"><a href="' + href + '">' + productEscape(productTitle(p)) + '</a></h3>' +
    '<div class="card__meta"><span>' + productWeight(p) + ' kg · 共 ' + quantity + ' 尾</span>' +
    '<span>可售 ' + available + ' 尾</span></div>' +
    '<div class="card__meta"><span>每尾均價 ' + productMoney(p.unit_price) + '</span>' +
    (p.price_per_taijin != null ? '<span>每台斤 ' + productMoney(p.price_per_taijin) + '</span>' : '') +
    '</div>' +
    marketSnapshotCardHTML(p.market_snapshot) +
    '<div class="card__meta"><span>' + productEscape(location) + '</span></div>' +
    (unknown ? '<div class="card__meta"><span>料理資料暫無</span></div>' : "") +
    '<div class="card__price"><b>' + productMoney(p.price) +
    '<span class="unit"> · 整批</span>' +
    (p.price_auto ? '<span class="unit"> · 自動計算</span>' : '') +
    '</b></div>' +
    dealControls(p) +
    '<a href="' + href + '" class="btn btn--ghost btn--sm" style="margin-top:10px">查看詳情</a>' +
    '</div></article>';
}

function renderProductCards(containerId, products) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = (products || []).map(productCardHTML).join("");
}
