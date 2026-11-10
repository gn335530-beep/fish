# 04: 行情卡與行情問答的 spec 對齊

**What to build:** 行情卡底部來源行保留目前右下位置，不改版面；更新交易房 spec 與 UI 規格，使來源行位置與現況一致。同步把行情卡單位切換改成「切換單位不換算重量數字，只重算參考價格」，更新 ticket 05 的 checklist，並把 fish-platform ticket 25 從「文字回覆＋養殖價格」改成「行情查詢成功回行情卡、不標養殖價格」或註明由本批取代。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 行情卡來源行規格改為目前右下位置，程式不改。
- [x] 交易房 spec §4 與 ticket 05 checklist 對單位切換的描述一致（不換算重量數字）。
- [x] fish-platform ticket 25 不再要求文字回覆或「養殖價格」標記，或已註明由本批取代。
- [x] `docs/spec` 相關章節沒有互相矛盾的行情描述。

## Comments

- 2026-11-10：交易房 spec §4 與 `docs/spec/06-ui.md` 的來源行改為「底部右下」，單位切換統一為「不換算重量數字，只以新單位重算參考價格」；同步更新 ticket 05 的 What to build 與 checklist。`docs/spec/02-domain.md` 來源規則也補上右側。fish-platform ticket 25 改為行情卡輸出、不標養殖價格，並保留決策留言。程式與版面未改。
