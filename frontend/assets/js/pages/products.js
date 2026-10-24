/* 漁獲列表：資料只來自 GET /api/products，篩選與排序都在前端做。 */
let PRODUCTS = [];
let SPECIES_BY_ID = {};
let productsFailed = false;
let priceReady = false;
let lastPriceMax = 0;
let filterRegion = normalizeRegion(getRegion());

function renderRegionChips() {
  const box = document.getElementById("region-chips");
  box.innerHTML =
    '<button type="button" class="region-chip ' + (filterRegion ? "" : "on") + '" data-region="">全部</button>' +
    CITY_ORDER.map(function (city) {
      return '<button type="button" class="region-chip ' + (filterRegion === city ? "on" : "") +
        '" data-region="' + city + '">' + city + '</button>';
    }).join("");

  box.querySelectorAll("[data-region]").forEach(function (button) {
    button.addEventListener("click", function () {
      filterRegion = normalizeRegion(button.dataset.region);
      setRegion(filterRegion);
      renderRegionChips();
      render();
    });
  });

  document.getElementById("region-hint").textContent = filterRegion
    ? "只顯示「" + filterRegion + "」的商品"
    : "選擇縣市後，只顯示該縣市的商品";
}

function initPriceRange(force) {
  const input = document.getElementById("price-range");
  const prices = PRODUCTS.map(function (p) { return Number(p.price) || 0; });
  const max = Math.max(1000, ...prices);
  input.max = String(max);
  if (force || !priceReady || Number(input.value) === lastPriceMax || Number(input.value) > max) {
    input.value = String(max);
  }
  priceReady = true;
  lastPriceMax = max;
  document.getElementById("price-max").textContent = productMoney(max);
}

function activeFilter() {
  const search = document.getElementById("nav-search");
  return {
    cats: [...document.querySelectorAll(".f-cat:checked")].map(function (el) { return el.value; }),
    maxPrice: Number(document.getElementById("price-range").value),
    inStock: document.getElementById("f-instock").checked,
    q: (search.value || "").trim().toLowerCase()
  };
}

function categoryOf(p) {
  const item = SPECIES_BY_ID[p.species_id];
  return item && item.category ? item.category : "fish";
}

function passes(p, f) {
  if (!f.cats.includes(categoryOf(p))) return false;
  if (filterRegion && !sameCity(p.region, filterRegion)) return false;
  if (Number(p.price || 0) > f.maxPrice) return false;
  if (f.inStock && productAvailable(p) <= 0) return false;
  if (f.q) {
    const hay = [p.title, p.fish_species, p.species_id, p.region, p.location, p.condition]
      .join(" ").toLowerCase();
    if (hay.indexOf(f.q) === -1) return false;
  }
  return true;
}

function sameCity(region, city) {
  const normalize = function (value) { return String(value || "").replace(/臺/g, "台"); };
  return normalize(region).indexOf(normalize(city)) !== -1;
}

function sortProducts(list) {
  const sort = document.getElementById("sort").value;
  return list.slice().sort(function (a, b) {
    if (sort === "price-asc") return Number(a.price || 0) - Number(b.price || 0);
    if (sort === "price-desc") return Number(b.price || 0) - Number(a.price || 0);
    if (sort === "stock") return productAvailable(b) - productAvailable(a);
    return new Date(b.catch_time || b.created_at || 0) - new Date(a.catch_time || a.created_at || 0);
  });
}

function showState(text, isError) {
  document.getElementById("catch-grid").innerHTML = productStateHTML(text, isError);
}

function render() {
  if (productsFailed) return;
  const filter = activeFilter();
  const list = sortProducts(PRODUCTS.filter(function (p) { return passes(p, filter); }));
  document.getElementById("shown-count").textContent = String(list.length);
  if (!list.length) {
    showState("沒有符合條件的今日漁獲，請調整篩選條件或地區。");
    return;
  }
  renderProductCards("catch-grid", list);
}

async function loadProducts() {
  renderRegionChips();
  try {
    const results = await Promise.all([
      window.HaisenAPI.listProducts(),
      window.HaisenAPI.listSpecies().catch(function () { return []; })
    ]);
    PRODUCTS = results[0];
    SPECIES_BY_ID = {};
    results[1].forEach(function (item) { SPECIES_BY_ID[item.id] = item; });
    productsFailed = false;
    document.getElementById("total-count").textContent = String(PRODUCTS.length);
    initPriceRange();
    render();
  } catch (error) {
    productsFailed = true;
    PRODUCTS = [];
    document.getElementById("total-count").textContent = "—";
    document.getElementById("shown-count").textContent = "—";
    showState(productErrorText(error, "商品"), true);
  }
}

document.getElementById("sort").addEventListener("change", render);
document.getElementById("price-range").addEventListener("input", function (event) {
  document.getElementById("price-max").textContent = productMoney(event.target.value);
  render();
});
document.getElementById("f-instock").addEventListener("change", render);
document.querySelectorAll(".f-cat").forEach(function (el) { el.addEventListener("change", render); });
document.getElementById("nav-search").addEventListener("input", render);
document.getElementById("reset-filters").addEventListener("click", function () {
  document.querySelectorAll(".f-cat").forEach(function (el) { el.checked = true; });
  document.getElementById("f-instock").checked = false;
  filterRegion = "";
  setRegion("");
  renderRegionChips();
  initPriceRange(true);
  document.getElementById("nav-search").value = "";
  render();
});
document.addEventListener("haisen:products-changed", loadProducts);

loadProducts();
