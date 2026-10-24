/* ============ 魚種搜尋 ============ */
const speciesInput = document.getElementById("species-input");
const speciesResults = document.getElementById("species-results");

function renderQuick(){
  document.getElementById("quick-species").innerHTML =
    '<span style="font-size:.72rem;color:var(--muted-2);letter-spacing:.1em;align-self:center;margin-right:4px">常出售：</span>' +
    QUICK_SPECIES.map(id=>{
      const sp = speciesById(id);
      return `<button type="button" class="quick-chip ${curSpecies===id?'on':''}" data-quick="${id}">${sp.name}</button>`;
    }).join("");
  document.querySelectorAll("[data-quick]").forEach(b=>{
    b.addEventListener("click", ()=> pickSpecies(b.dataset.quick));
  });
}
function pickSpecies(id){
  const sp = speciesById(id);
  if(!sp) return;
  curSpecies = id;
  speciesInput.value = sp.name;
  document.getElementById("species-picked").innerHTML = "已選擇：<b style='color:var(--ink)'>" + sp.name + "</b>（" + sp.latin + "）";
  speciesResults.classList.remove("show");
  renderQuick();
  renderMarket(id);
  validate();
}
function searchSpecies(q){
  q = (q || "").trim().toLowerCase();
  if(!q){ speciesResults.classList.remove("show"); return; }
  const hits = SPECIES.filter(s=>
    s.name.toLowerCase().indexOf(q) !== -1 ||
    s.latin.toLowerCase().indexOf(q) !== -1 ||
    s.id.indexOf(q) !== -1
  ).slice(0, 8);
  speciesResults.innerHTML = hits.length
    ? hits.map(s=>`<div class="species-opt" data-id="${s.id}"><span><b>${s.name}</b> <small>${s.latin}</small></span><span class="mk">均價 ${money(s.market)}</span></div>`).join("")
    : '<div class="species-opt--none">找不到符合的魚種，請換個關鍵字，或直接使用下方常出售魚類。</div>';
  speciesResults.classList.add("show");
  document.querySelectorAll(".species-opt").forEach(el=>{
    el.addEventListener("click", ()=> pickSpecies(el.dataset.id));
  });
}
speciesInput.addEventListener("input", e=> searchSpecies(e.target.value));
speciesInput.addEventListener("focus", e=> searchSpecies(e.target.value));
document.addEventListener("click", e=>{
  if(!e.target.closest(".species-search")) speciesResults.classList.remove("show");
});
