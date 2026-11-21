# 02: Walking skeleton：模型驅動的草稿變更與回覆

**What to build:** `LLM_ENABLED=true` 且模型可用時，釣客在助手房用自然語言說出上架欄位，助手由模型回覆並更新草稿；模型不能發布，數字只能來自釣客這一則訊息；現有規則仍是安全網，草稿卡暫時保留「修改草稿」。這是最小可運作的垂直切片，包含 listing 回應契約、通用修正告知與修正歷史欄位，以及架構決策紀錄與新名詞。

**Blocked by:** 01（Prefactor：拆開助手回覆與對話流程的接縫）

**Status:** resolved

- [x] 模型回覆契約包含回覆文字、修正告知、草稿變更、修正紀錄、使用者確認字串、處理方式縮短提議與下一個動作；空值可省略。
- [x] 釣客明確說出尾數時，草稿更新並持久化；重新載入助手房仍看得到。
- [x] 尾數、整批售價或每台斤售價若不在釣客這一則訊息中，後端丟棄該變更。
- [x] 模型不能發布、下架、刪除或修改已上架商品。
- [x] 交易房不呼叫 LLM；`LLM_ENABLED=false` 時行為與今日相同。
- [x] 草稿卡暫時保留「修改草稿」，作為後續基本模式 ticket 前的安全網。
- [x] 新增架構決策紀錄，並在名詞彙編加入「錯字修正」「使用者確認字串」「基本模式」。
- [x] 後端 HTTP 與前端對話流程測試涵蓋契約、持久化、數字防護、交易房與 LLM 關閉。
- [x] `npm test` 全綠，所有修改與新增的程式檔案低於 200 行。

## Comments

- 2026-11-22：完成。listing context 回傳 `listing` 契約（reply_text／corrections／draft_changes／correction_history／protected_names／condition_proposal／next_action）；數字未出現在釣客訊息時整輪丟棄；交易房不呼叫 LLM、`LLM_ENABLED=false` 維持規則。草稿卡「修改草稿」在基本／規則模式保留，模型模式由 ticket 03 隱藏。新增 ADR-0015 與 GLOSSARY 名詞。commit 189d45a。
