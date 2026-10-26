# 30: 多間 AI 助手房

**What to build:** 助手房可以有多間；每間有自己的 context 與草稿。`POST /api/conversations/assistant` 每次建立一間新的助手房；登入後若沒有助手房才自動建立。`GET /api/conversations` 回多間助手房；收件匣可新增、切換。助手房唯一鍵改為獨立 `id`；舊的 `type + user_ids[0]` 不再限制一間。刪除規則由 #31 實作。（規格：G-20、AC-13、F1、F11）

**Blocked by:** 無

**Status:** ready-for-human

- [x] `POST /api/conversations/assistant` 每次建立一間新的助手房；登入後若沒有助手房才自動建立。
- [x] 助手房唯一鍵改為獨立 `id`；每間有自己的 context／draft；舊的 `type + user_ids[0]` 不再限制一間。
- [x] `GET /api/conversations` 回多間助手房；收件匣可新增、切換。
- [x] 權限：參與者；404 `CONVERSATION_NOT_FOUND`、403 `FORBIDDEN`。
- [x] 測試、glossary、02-domain、03-flows、04-data-model、05-api、06-ui、07-roadmap 同步。

## Comments

- 2026-10-27：已實作。`POST /api/conversations/assistant` 每次建立獨立房間；登入時只在沒有助手房時自動建立並開啟最近一間。收件匣可新增與切換，摘要帶 `deletable`。
