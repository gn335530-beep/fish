# 26: 處理方式改為自由文字

**What to build:** 移除固定四種處理方式。`condition` 改為自由文字（trim、非空、最多 20 字），提示詞只舉例「活體、放血冰鎮」，不再列「三去處理」「冷凍」；釣客自己輸入「冷凍」仍可成立。既有 `condition` 為「冷凍」的商品（含花枝）改成「放血冰鎮」。前端 slots／prompts 與 spec／glossary／tests 同步。（規格：G-17、F2）

**Blocked by:** 無

**Status:** ready-for-human

- [x] `POST /api/products/create` 接受任何非空、≤20 字的處理方式；空白回 400 `MISSING_CONDITION`，過長回 400 `FIELD_TOO_LONG`。
- [x] 不再回 `INVALID_CONDITION`；沒有固定枚舉。
- [x] 助手第一次上架提示只舉例活體、放血冰鎮；不再出現「三去處理」「冷凍」。
- [x] 處理方式欄位缺資料時，助手照使用者下一句原樣記錄，不做活魚→活體的同義詞對照。
- [x] 既有 `condition` 為「冷凍」的商品改成「放血冰鎮」並重算標題；只改現存商品與其上架訊息，已成交訂單中的商品快照不變；若沒有此類商品，不硬造資料。
- [x] GLOSSARY、02-domain、03-flows、04-data-model、05-api、06-ui、07-roadmap 與測試同步。

## Comments

- 2026-10-27：已實作。`condition` 自由文字；提示詞只舉例活體、放血冰鎮。既有「冷凍」商品與其上架訊息由啟動時的 `normalizeProductData()` 改成「放血冰鎮」，成交訂單快照不動。
