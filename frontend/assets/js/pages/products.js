const FRESH_ORDER = {amberjack:1, seabream:2, grouper:3, tuna:4, seabass:5, mackerel:6, squid:7};
const CEPH = ["squid"];

/* 地區 chips */
function renderRegionChips(){
  const cur = getRegion();
  document.getElementById("region-chips").innerHTML =
    `<button class="region-chip ${cur===''?'on':''}" data-region="">全部地區</button>` +
    REGIONS.map(r=>`<button class="region-chip ${cur===r?'on':''}" data-region="${r}">${r}</button>`).join("");
  document.querySelectorAll("#region-chips .region-chip").forEach(b=>{
    b.addEventListener("click", ()=>{
      setRegion(b.dataset.region);
      renderRegionChips();
      renderRegionChecks();
      render();
    });
  });
  const hint = document.getElementById("region-hint");
  hint.textContent = cur ? ("已設定為「" + cur + "」，優先顯示可運送漁獲") : "選擇地區後，將優先顯示可運送給你的漁獲";
}

/* 地區 checkbox（篩選） */
function renderRegionChecks(){
  const cur = getRegion();
  document.getElementById("f-regions").innerHTML = REGIONS.map(r=>
    `<label class="check"><input type="checkbox" class="f-region" value="${r}" ${(!cur||cur===r)?'checked':''}> ${r}</label>`
  ).join("");
  document.querySelectorAll(".f-region").forEach(el=> el.addEventListener("change", render));
}

function activeFilter(){
  const cats = [...document.querySelectorAll(".f-cat:checked")].map(e=>e.value);
  const regions = [...document.querySelectorAll(".f-region:checked")].map(e=>e.value);
  return {
    cats, regions,
    maxPrice: Number(document.getElementById("price-range").value),
    inStock: document.getElementById("f-instock").checked,
    sashimi: document.getElementById("f-sashimi").checked,
    selfpick: document.getElementById("f-selfpick").checked,
    q: (document.getElementById("nav-search").value || "").trim().toLowerCase()
  };
}

function passes(id, f){
  const p = CATCH[id];
  const isCeph = CEPH.includes(id);
  if(!f.cats.includes(isCeph ? "ceph" : "fish")) return false;
  if(f.regions.length && !f.regions.includes(p.region)) return false;
  if(p.price > f.maxPrice) return false;
  if(f.inStock && soldOut(id)) return false;
  if(f.sashimi && !p.tags.includes("生食級")) return false;
  if(f.selfpick && !p.shipping.includes("買家自取")) return false;
  if(f.q){
    const hay = (p.name + p.latin + p.sea + p.location + p.region + p.seller.name).toLowerCase();
    if(hay.indexOf(f.q) === -1) return false;
  }
  return true;
}

function render(){
  const sort = document.getElementById("sort").value;
  const f = activeFilter();
  let arr = CATCH_ORDER.filter(id=>passes(id, f));
  if(sort === "price-asc") arr.sort((a,b)=>CATCH[a].price-CATCH[b].price);
  else if(sort === "price-desc") arr.sort((a,b)=>CATCH[b].price-CATCH[a].price);
  else if(sort === "stock") arr.sort((a,b)=>CATCH[b].remaining-CATCH[a].remaining);
  else arr.sort((a,b)=>FRESH_ORDER[a]-FRESH_ORDER[b]);

  const grid = document.getElementById("catch-grid");
  grid.innerHTML = arr.length
    ? arr.map(catchCardHTML).join("")
    : '<p style="grid-column:1/-1;color:var(--muted);font-size:.9rem;padding:48px 0">沒有符合條件的今日漁獲，請調整篩選條件或地區。</p>';
  document.getElementById("shown-count").textContent = arr.length;
}

document.getElementById("sort").addEventListener("change", render);
["price-range","f-instock","f-sashimi","f-selfpick"].forEach(id=>{
  document.getElementById(id).addEventListener("input", e=>{
    if(id === "price-range") document.getElementById("price-max").textContent = "$" + Number(e.target.value).toLocaleString();
    render();
  });
});
document.querySelectorAll(".f-cat").forEach(el=> el.addEventListener("change", render));
document.getElementById("nav-search").addEventListener("input", render);
document.getElementById("reset-filters").addEventListener("click", ()=>{
  document.querySelectorAll(".f-cat").forEach(el=> el.checked = true);
  setRegion("");
  renderRegionChips(); renderRegionChecks();
  document.getElementById("f-instock").checked = false;
  document.getElementById("f-sashimi").checked = false;
  document.getElementById("f-selfpick").checked = false;
  document.getElementById("price-range").value = 2000;
  document.getElementById("price-max").textContent = "$2,000";
  document.getElementById("nav-search").value = "";
  render();
});

renderRegionChips();
renderRegionChecks();
render();
/* [資料綁定] 後端漁獲載入完成後重繪清單、地區 chips 與篩選。 */
document.addEventListener("haisen:catch-ready", ()=>{ renderRegionChips(); renderRegionChecks(); render(); });
