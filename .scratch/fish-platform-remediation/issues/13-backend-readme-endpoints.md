# 13: 後端 README 端點表補齊

**What to build:** `backend/README.md` 的端點表與實際路由一致，包含販賣確認與刪除對話，並正確描述助手房建立語意。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 端點表含 `POST /api/users/seller-consent` 與 `DELETE /api/conversations/:id`。
- [x] `POST /api/conversations/assistant` 描述改為「每次建立新的助手房」，與 `docs/api/README.md` 一致。
- [x] 不再有過期或重複的端點列；`npm test` 全綠。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「D4」。

## Comments

2026-10-27 完成。`backend/README.md` 補上 `POST /api/users/seller-consent` 與 `DELETE /api/conversations/{id}`，助手房端點改成「每次建立一間新的助手房」，並把 `conversation-delete` 加進路由目錄清單。端點表與 `docs/api/README.md` 對齊。
