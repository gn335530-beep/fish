/* ============ 表單驗證（必填僅：魚種、尾數＋重量、價格） ============ */
function setField(id, ok, errId){
  const f = document.getElementById(id);
  f.classList.toggle("invalid", !ok);
  f.classList.toggle("valid", ok);
  if(errId) document.getElementById(errId).classList.toggle("show", !ok);
  return ok;
}
function checkPrice(){
  const v = Number(document.getElementById("price").value);
  const s = marketFor(curSpecies).avg;
  const warn = document.getElementById("w-price");
  if(!v || v <= 0){ warn.classList.remove("show"); return; }
  let msg = "";
  if(v < s * 0.5) msg = "售價明顯低於魚市均價（低於 50%），請確認是否為特價出清。";
  else if(v > s * 2) msg = "售價明顯高於魚市均價（超過 200%），請確認是否為特上規格。";
  if(msg){ warn.textContent = msg; warn.classList.add("show"); } else warn.classList.remove("show");
}

function validate(){
  const price = Number(document.getElementById("price").value);

  let ok = true;
  /* 必填 1：魚種（預設已選，可自行更改） */
  ok = setField("f-species", !!speciesInput.value.trim(), "e-species") && ok;

  /* 必填 2：販售尾數與平均重量或各尾重量 */
  const n = parseInt(tailCountInput.value, 10);
  const countOk = !isNaN(n) && n >= 1 && n <= 20;
  ok = setField("f-tails", countOk, "e-tails") && ok;
  const rowsMatchCount = countOk && tailRows.length === n;
  let weightsOk = rowsMatchCount;
  if(individualWeightsInput.checked){
    averageWeightField.classList.remove("invalid", "valid");
    document.getElementById("e-average-weight").classList.remove("show");
    tailRows.forEach((t,i)=>{
      const weightOk = Number(t.weight) > 0;
      if(!weightOk) weightsOk = false;
      const wErr = document.querySelector('.tail-err[data-i="' + i + '"]');
      if(wErr) wErr.classList.toggle("show", !weightOk);
      const row = document.querySelector('.tail-row[data-i="' + i + '"]');
      if(row) row.classList.toggle("invalid", !weightOk);
    });
  } else {
    const averageWeightOk = Number(averageWeightInput.value) > 0;
    weightsOk = rowsMatchCount && setField("f-average-weight", averageWeightOk, "e-average-weight");
    tailRows.forEach((_,i)=>{
      const wErr = document.querySelector('.tail-err[data-i="' + i + '"]');
      if(wErr) wErr.classList.remove("show");
      const row = document.querySelector('.tail-row[data-i="' + i + '"]');
      if(row) row.classList.remove("invalid");
    });
  }
  ok = weightsOk && ok;

  /* 必填 3：售價（合理範圍：均價 30% ~ 300%） */
  const s = marketFor(curSpecies).avg;
  let priceOk = !!price && price > 0;
  if(priceOk && (price < s*0.3 || price > s*3)){
    priceOk = false;
    document.getElementById("e-price").textContent = "售價超出合理範圍（澎湖魚市均價 " + money(s) + "，合理區間 " + money(Math.round(s*0.3)) + "–" + money(Math.round(s*3)) + "）";
  } else {
    document.getElementById("e-price").textContent = "請填寫售價，且必須為大於 0 的數字";
  }
  ok = setField("f-price", priceOk, "e-price") && ok;

  /* 以下皆為選填：地區與地址、處理方式、照片、運送與付款、定金金額 */
  fillDistrictsHint();
  let depOk = true;
  if(depositOn.checked){
    const d = Number(document.getElementById("deposit-amount").value);
    depOk = !!d && d > 0;
  }
  ok = setField("f-deposit", depOk, "e-deposit") && ok;

  document.getElementById("submit-btn").disabled = !ok;

  return ok;
}
function fillDistrictsHint(){
  if(citySel.value && districtSel.disabled) fillDistricts();
}

["price"].forEach(id=>{
  const el = document.getElementById(id);
  el.addEventListener("input", validate);
  el.addEventListener("change", validate);
  el.addEventListener("blur", validate);
});
document.getElementById("price").addEventListener("input", checkPrice);
