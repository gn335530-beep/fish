/* 商品（products API）的顯示轉換與卡片；與舊 CATCH 模型分開。 */
const CEPH_IDS = ["squid", "cuttlefish", "octopus"];

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
  const available = productAvailable(p);
  if (available <= 0) return "已售出";
  if (Number(p.reserved_quantity || 0) > 0) return "洽談中";
  return "可售 " + available + " 尾";
}

function isCephalopod(p) {
  return CEPH_IDS.indexOf(p.species_id) !== -1;
}

function productDateLabel(p) {
  if (p.catch_time) return "釣獲 " + productDate(p.catch_time);
  if (p.created_at) return "上架 " + productDate(p.created_at);
  return "日期未提供";
}

function productCardHTML(p) {
  var href = "product-detail.html?id=" + encodeURIComponent(p.id);
  var photo = window.HaisenAPI.photoUrl(p.photo_url);
  var region = p.region || "地區未提供";
  var location = p.location || "地點未提供";
  var quantity = Number(p.quantity || 0);
  var available = productAvailable(p);
  var media = photo
    ? '<img src="' + productEscape(photo) + '" alt="' + productEscape(p.fish_species || "商品照片") + '">'
    : '<div class="media-empty">沒有照片</div>';

  return '<article class="card catch-card">' +
    '<a href="' + href + '" class="card__media">' + media +
    '<div class="card__tags"><span class="badge">' + productEscape(region) + '</span>' +
    '<span class="badge badge--coral">' + productEscape(productStatus(p)) + '</span></div>' +
    '</a>' +
    '<div class="card__body">' +
    '<div class="card__seller">' + productEscape(productDateLabel(p)) + '</div>' +
    '<h3 class="card__title"><a href="' + href + '">' + productEscape(productTitle(p)) + '</a></h3>' +
    '<div class="card__meta"><span>' + productWeight(p) + ' kg · 共 ' + quantity + ' 尾</span>' +
    '<span>可售 ' + available + ' 尾</span></div>' +
    '<div class="card__meta"><span>每尾 ' + productMoney(p.unit_price) + '</span></div>' +
    '<div class="card__meta"><span>' + productEscape(location) + '</span></div>' +
    '<div class="card__price"><b>' + productMoney(p.price) + '<span class="unit"> · 整批</span></b></div>' +
    '<a href="' + href + '" class="btn btn--ghost btn--sm" style="margin-top:14px">查看詳情</a>' +
    '</div></article>';
}

function renderProductCards(containerId, products) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = (products || []).map(productCardHTML).join("");
}
