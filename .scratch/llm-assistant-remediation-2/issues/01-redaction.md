# 01: 個資遮蔽正確化（第二輪）

**What to build:** 使用者訊息、對話歷史與 context 在送往 Gemini 或 Tavily 前，只遮蔽真正的個資格式。`+886` 開頭的市話、4 碼區碼與以「市」結尾的鄉鎮市區地址不再漏遮；「台北市區的網路」「網路上的天氣」「弄一桌好菜」這類一般句子不再被誤換成 `[已遮蔽]`。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 「網路上的天氣」「弄一桌好菜」「台北市區的網路很慢」原樣送給 provider。
- [x] `+886912345678`、`+886-2-12345678`、`(02)12345678`、`037-123456`、Email 與身分證字號都替換成 `[已遮蔽]`。
- [x] 「頭份市中正路12號」與含「里／鄰」的完整地址被遮蔽。
- [x] 地址必須有行政區錨點才成立；單獨出現的「路」「街」「弄」不觸發遮蔽。
- [x] 對話歷史、context 中的字串欄位與 Tavily 查詢使用同一套遮蔽規則。
- [x] 端點測試斷言 provider 收到的內容不含上述個資，也不含被錯誤遮蔽的一般文字。
- [x] 遮蔽後的 Tavily 查詢不含原始個資。
- [x] 若隱私文件描述遮蔽格式，同步更新。

## Comments

- 2026-11-15：`backend/lib/ai/redact.js` 重寫地址錨點與電話樣式；鄉鎮市區至少兩字、街名至少兩字且不得以虛詞開頭，避免「夜市」「台北市區的網路」「迷路了」誤遮。新增 `backend/test/ai-reply-redaction.test.js` 與 `backend/test/ai-tools-web-redaction.test.js`，同步 backend README 與流程／API／roadmap 的隱私描述。
