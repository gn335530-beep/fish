/* ============ 販售尾數與重量 ============ */
const tailCountInput = document.getElementById("tail-count");
const individualWeightsInput = document.getElementById("individual-weights");
const averageWeightInput = document.getElementById("average-weight");
const averageWeightField = document.getElementById("f-average-weight");
let tailRows = [];

function syncTailRows(){
  let n = parseInt(tailCountInput.value, 10);
  if(isNaN(n) || n < 1) n = 0;
  if(n > 20) n = 20;
  const next = [];
  for(let i=0;i<n;i++) next.push(tailRows[i] || {weight:""});
  tailRows = next;
  renderTails();
}
function renderTails(){
  const box = document.getElementById("tails");
  box.hidden = !individualWeightsInput.checked;
  if(!tailRows.length){ box.innerHTML = ""; return; }
  box.innerHTML = tailRows.map((t,i)=>`
    <div class="tail-row" data-i="${i}">
      <div class="tail-row__no">第 ${i+1} 尾</div>
      <div class="tail-row__fields">
        <div class="field" style="margin:0">
          <label style="text-transform:none;letter-spacing:.04em;font-size:.78rem">重量（台斤）<span class="req">*</span></label>
          <input class="input tail-weight" type="number" step="0.1" min="0" value="${t.weight}" placeholder="例如：6.3" data-i="${i}">
          <div class="field-err tail-err" data-i="${i}">請填寫第 ${i+1} 尾的重量，且必須為大於 0 的數字</div>
        </div>
      </div>
    </div>`).join("");
  box.querySelectorAll(".tail-weight").forEach(el=>{
    el.addEventListener("input", e=>{ tailRows[+e.target.dataset.i].weight = e.target.value; validate(); });
  });
}
tailCountInput.addEventListener("input", ()=>{ syncTailRows(); validate(); });
tailCountInput.addEventListener("change", ()=>{ syncTailRows(); validate(); });
individualWeightsInput.addEventListener("change", ()=>{
  document.getElementById("individual-weights-option").classList.toggle("on", individualWeightsInput.checked);
  averageWeightField.hidden = individualWeightsInput.checked;
  renderTails();
  validate();
});
averageWeightInput.addEventListener("input", validate);
