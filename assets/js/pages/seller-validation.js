/* ============ 縣市 / 鄉鎮市區（地址） ============ */
const CITY_ORDER = ["基隆市","台北市","新北市","桃園市","新竹縣","新竹市",
  "苗栗縣","台中市","彰化縣","南投縣","雲林縣",
  "嘉義縣","嘉義市","台南市","高雄市","屏東縣",
  "宜蘭縣","花蓮縣","台東縣","澎湖縣"];
const citySel = document.getElementById("city");
const districtSel = document.getElementById("district");

citySel.innerHTML = '<option value="">請選擇縣市</option>' +
  CITY_ORDER.filter(c=> TAIWAN_CITIES[c]).map(c=>`<option value="${c}">${c}</option>`).join("");

function fillDistricts(){
  const c = citySel.value;
  if(!c){
    districtSel.innerHTML = '<option value="">請先選擇縣市</option>';
    districtSel.disabled = true;
  } else {
    districtSel.disabled = false;
    districtSel.innerHTML = '<option value="">請選擇鄉鎮市區</option>' +
      districtsOf(c).map(d=>`<option value="${d}">${d}</option>`).join("");
  }
  updateAddrPreview();
}
function updateAddrPreview(){
  const c = citySel.value, d = districtSel.value;
  const r = regionOfCity(c);
  const el = document.getElementById("addr-preview");
  if(!c){ el.textContent = "所屬地區："; return; }
  el.textContent = "所屬地區：" + (r || "") + (c ? " · " + c + (d || "") : "");
}
citySel.addEventListener("change", ()=>{ fillDistricts(); validate(); });
districtSel.addEventListener("change", ()=>{ updateAddrPreview(); validate(); });
