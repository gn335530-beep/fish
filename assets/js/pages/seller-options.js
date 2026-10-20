/* ============ 選項群（處理方式 / 運送 / 付款） ============ */
let processVal = "";
let shipVals = [];
let payVals = [];

document.querySelectorAll("#process-opts .opt").forEach(b=>{
  b.addEventListener("click", ()=>{
    processVal = (processVal === b.dataset.process) ? "" : b.dataset.process;
    document.querySelectorAll("#process-opts .opt").forEach(x=> x.classList.toggle("on", x.dataset.process === processVal));
    validate();
  });
});
document.querySelectorAll("#shipping-opts .opt").forEach(b=>{
  b.addEventListener("click", ()=>{
    const v = b.dataset.ship;
    if(shipVals.includes(v)) shipVals = shipVals.filter(x=>x!==v);
    else shipVals.push(v);
    b.classList.toggle("on", shipVals.includes(v));
    validate();
  });
});
document.querySelectorAll("#payment-opts .opt").forEach(b=>{
  b.addEventListener("click", ()=>{
    const v = b.dataset.pay;
    if(payVals.includes(v)) payVals = payVals.filter(x=>x!==v);
    else payVals.push(v);
    b.classList.toggle("on", payVals.includes(v));
    validate();
  });
});

/* 定金（選填；勾選後金額才必填） */
const depositOn = document.getElementById("deposit-on");
const depositFields = document.getElementById("deposit-fields");
depositOn.addEventListener("change", ()=>{
  depositFields.classList.toggle("show", depositOn.checked);
  validate();
});
document.getElementById("deposit-amount").addEventListener("input", validate);
