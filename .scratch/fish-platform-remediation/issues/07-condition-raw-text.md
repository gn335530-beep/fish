# 07: 處理方式保留使用者原句

**What to build:** 釣客描述的處理方式保留原句片段，不再被截成白名單裡的第一個詞；白名單只用於提示與分類。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 「3公斤 2尾 放血後冰鎮」的處理方式為「放血後冰鎮」。
- [x] 常見說法（活體、放血冰鎮、三去）仍可辨識。
- [x] 未知說法不會被丟掉或硬改成白名單詞。
- [x] 商品標題與卡片顯示不被截斷。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「S7」（對應既有票 26）。

## Comments

2026-10-27 完成。`extractCondition` 先找最早出現的白名單詞，再保留該詞之後的整段原句（去掉魚種、意圖詞、數字殘留與頭尾語助詞）；沒有命中白名單時保留剩餘原句，不再回傳第一個白名單詞。商品標題與草稿卡直接使用完整處理方式。`frontend/test/condition.test.js`／`backend/test/products-pricing.test.js` 涵蓋原句、未知說法、魚種前後位置與標題顯示。
