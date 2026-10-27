/* 商品詳情：所有內容取自 GET /api/products/:id。 */
function detailParam(name) {
  try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; }
}

function showDetailError(title, text) {
  document.getElementById("pd-view").hidden = true;
  document.getElementById("pd-related-section").hidden = true;
  document.getElementById("pd-error").hidden = false;
  document.getElementById("pd-error-title").textContent = title;
  document.getElementById("pd-error-text").textContent = text;
  document.getElementById("crumb-name").textContent = "找不到商品";
  document.title = "找不到商品 — 一支釣";
}

function renderPhoto(p) {
  const photo = window.HaisenAPI.photoUrl(p.photo_url);
  const gallery = document.getElementById("pd-gallery");
  const missing = document.getElementById("pd-no-photo");
  if (!photo) {
    gallery.hidden = true;
    missing.hidden = false;
    return;
  }
  document.getElementById("pd-main").src = photo;
  document.getElementById("pd-main").alt = (p.fish_species || "商品") + " 照片";
  document.getElementById("pd-main").onerror = function () {
    gallery.hidden = true;
    missing.hidden = false;
  };
  gallery.hidden = false;
  missing.hidden = true;
}

function renderSpec(p) {
  const rows = [
    ["魚種", p.fish_species || "—"],
    ["學名", p.species_latin || "—"],
    ["總重", productWeight(p) + " kg"],
    ["尾數", Number(p.quantity || 0) + " 尾"],
    ["處理方式", p.condition || "—"],
    ["整批售價", productMoney(p.price) + (p.price_auto ? "（自動計算）" : "")],
    ["每台斤售價", p.price_per_taijin != null ? productMoney(p.price_per_taijin) : "—"],
    ["每尾均價", productMoney(p.unit_price)],
    ["可售尾數", productAvailable(p) + " 尾"],
    ["地區", normalizeCityName(p.region) || "—"],
    ["地點", normalizeCityName(p.location) || "—"],
    ["釣獲時間", p.catch_time ? productDate(p.catch_time) : "未提供"]
  ];
  if (hasMarketSnapshot(p.market_snapshot)) {
    rows.push(["行情", marketSnapshotPrice(p.market_snapshot)]);
    rows.push(["行情地區", marketSnapshotScope(p.market_snapshot)]);
    rows.push(["交易日期", p.market_snapshot.trade_date || "—"]);
    rows.push(["行情來源", marketSnapshotSource(p.market_snapshot) || "—"]);
  } else {
    rows.push(["行情", "暫無行情"]);
    rows.push(["行情來源", marketSnapshotSource(null)]);
  }
  if (!p.species_id) {
    rows.push(["料理資料", "暫無"]);
  }
  document.getElementById("pd-spec").innerHTML = rows.map(function (row) {
    return "<div>" + row[0] + "</div><div>" + productEscape(row[1]) + "</div>";
  }).join("");
}

function renderDealControls(p) {
  const available = productAvailable(p);
  const select = document.getElementById("pd-deal-qty");
  const button = document.getElementById("pd-deal");
  select.innerHTML = dealQuantityOptions(available);
  select.dataset.dealQty = p.id;
  button.dataset.dealProduct = p.id;
  select.disabled = available <= 0;
  button.disabled = available <= 0;
  button.textContent = available > 0
    ? "洽談購買"
    : (p.status === "PARTIALLY_RESERVED" ? "洽談中" : "已售出");
}

function renderDetail(p) {
  const status = productStatus(p);
  renderPhoto(p);
  document.getElementById("pd-region").textContent = normalizeCityName(p.region) || "地區未提供";
  document.getElementById("pd-condition").textContent = p.condition || "處理方式未提供";
  document.getElementById("pd-status").textContent = status;
  document.getElementById("pd-name").textContent = productTitle(p);
  document.getElementById("pd-latin").textContent = p.species_latin || "";
  document.getElementById("pd-price").innerHTML = productMoney(p.price) +
    '<span class="unit"> / 整批</span>' + (p.price_auto ? '<span class="unit"> · 自動計算</span>' : '');
  document.getElementById("pd-unit-price").textContent = "每尾均價 " + productMoney(p.unit_price);
  document.getElementById("pd-stock-note").textContent =
    status + " · 共 " + Number(p.quantity || 0) + " 尾上架";
  document.getElementById("pd-qty").textContent = String(productAvailable(p));
  renderSpec(p);
  renderDealControls(p);

  document.getElementById("crumb-name").textContent = p.fish_species || "漁獲詳情";
  document.title = productTitle(p) + " — 今日漁獲 | 一支釣";
  document.getElementById("pd-view").hidden = false;
}

async function loadRelated(currentId) {
  try {
    const products = await window.HaisenAPI.listProducts();
    const others = products.filter(function (p) { return p.id !== currentId; }).slice(0, 4);
    if (!others.length) return;
    renderProductCards("related", others);
    document.getElementById("pd-related-section").hidden = false;
  } catch (error) {
    /* 其他漁獲載入失敗不影響主商品。 */
  }
}

function reviewStars(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  return "★".repeat(value) + "☆".repeat(5 - value);
}

function reviewHTML(review) {
  const tags = (review.tags || []).map(function (tag) {
    return '<span class="review__tag">' + productEscape(tag) + "</span>";
  }).join("");
  return '<article class="review">' +
    '<div class="review__head"><b>' + productEscape(review.reviewer_name || "會員") + "</b>" +
    '<span class="review__stars">' + reviewStars(review.rating) + " · " +
    productEscape(productDate(review.created_at)) + "</span></div>" +
    (review.comment ? '<p class="review__body">' + productEscape(review.comment) + "</p>" : "") +
    (tags ? '<div class="review__tags">' + tags + "</div>" : "") +
    "</article>";
}

async function loadReviews(product) {
  if (!product.seller_id) return;
  const section = document.getElementById("pd-reviews-section");
  const summary = document.getElementById("pd-review-summary");
  const list = document.getElementById("pd-reviews");
  section.hidden = false;
  summary.textContent = "評價載入中…";

  try {
    const response = await window.HaisenAPI.request(
      "/api/reviews?user_id=" + encodeURIComponent(product.seller_id) + "&limit=6"
    );
    const data = response.data || {};
    const reviews = data.reviews || [];
    summary.textContent = data.review_count
      ? String(Number(data.rating_score || 0)).replace(/\.0$/, "") + " 星 · " + data.review_count + " 則評價"
      : "目前沒有評價。";
    list.innerHTML = reviews.map(reviewHTML).join("");
  } catch (error) {
    summary.textContent = "評價載入失敗，請稍後再試。";
    list.innerHTML = "";
  }
}

async function loadDetail() {
  const id = detailParam("id");
  if (!id) {
    showDetailError("找不到這筆商品", "商品連結不完整，請回到列表重新選擇。");
    return;
  }
  try {
    const product = await window.HaisenAPI.getProduct(id);
    if (!product) {
      showDetailError("找不到這筆商品", "商品可能已下架或連結有誤。");
      return;
    }
    renderDetail(product);
    loadRelated(product.id);
    loadReviews(product);
  } catch (error) {
    if (error.status === 404) {
      showDetailError("找不到這筆商品", "商品可能已下架或連結有誤。");
      return;
    }
    showDetailError("無法載入商品",
      error.status === 0 ? "無法連線到伺服器，請確認後端已啟動" : error.message);
  }
}

document.addEventListener("DOMContentLoaded", loadDetail);
