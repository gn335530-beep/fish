# 08: 售價精度與自動計算基準

**What to build:** 釣客明確輸入的整批售價原樣保留，不再被四捨五入；只填每台斤時，自動計算用未進位的總重，顯示層才進位。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `price: 999.5` 存回 999.5，API 回應與詳情頁一致。
- [ ] 自動計算以原始總重計算，不使用進位後的重量。
- [ ] 顯示層仍以整數或既定格式呈現，不影響既有版面。
- [ ] 新增測試涵蓋明確價格與自動價格。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「S8」（對應既有票 27）。
