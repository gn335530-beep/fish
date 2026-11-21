# 0015 上架草稿改由模型驅動：模型只回變更，程式驗證與基本模式

## 背景

助手房的上架流程原本完全由規則引擎主導：釣客照固定順序回答魚種、尾數、處理方式、照片與售價，魚種或處理方式打錯字不會被修正，改草稿要先按「修改草稿」再逐項回答。即使 `LLM_ENABLED=true`，模型也只能回 `intent` 與 `slots`，草稿更新仍由規則決定，不能自然對話、不能修正錯字。

平台不能讓模型亂改價格、尾數或魚種，也不能讓模型代替釣客發布商品。因此需要一個折衷：模型理解釣客、回傳「草稿變更」與下一個動作，實際驗證、寫入與卡片時機仍由程式把關；模型失效時要能退回規則，不擋住交易。

## 決策

- **listing 模式改由模型驅動。** 當 conversation context 的 `mode === "listing"` 且草稿存在時，`POST /api/ai/reply` 改用 listing 契約：模型回傳 `reply_text`、`corrections`、`draft_changes`、`protected_names`、`condition_proposal` 與 `next_action`，後端再累積出 `correction_history`，取代原本的 `intent`／`slots`。
- **模型只回變更，程式寫入。** 模型不能直接寫資料庫、不能發布／下架／刪除商品；`draft_changes` 只接受 `fish_species`、`quantity`、`condition`、`price`、`price_per_taijin` 五個白名單欄位，官方代碼與照片不由模型提供。草稿寫入仍由前端套用並存進 conversation context。
- **數字嚴格防護。** `quantity`、`price`、`price_per_taijin` 必須出現在釣客這一則訊息，否則整輪丟棄（`LLM_GUARD_REJECTED`）。
- **卡片時機由程式把關。** `next_action` 只有 `ask`／`show_market_card`／`show_draft_card`／`none` 四種；行情卡只能在非價格欄位完成後顯示，草稿卡只能在全部欄位完成後顯示，不符就降級為 `ask`。
- **基本模式。** 模型逾時、429、無金鑰、上游錯誤或格式錯誤時，前端把該房 `basic_mode` 設為 `true`、顯示一次「AI 暫時無法協助，已切換基本模式；你仍可完成上架」，改走規則引擎，草稿卡恢復「修改草稿」；`basic_mode` 寫進 context，開新助手房才重試模型。欄位驗證失敗只丟棄該輪、改用規則，不切換基本模式。`LLM_ENABLED=false` 是正常規則模式，不算故障、不顯示提示。
- **草稿卡按鈕由卡片資料決定。** 模型模式草稿卡只有「確認上架」與「取消上架」，不顯示「修改草稿」；基本／規則模式恢復「修改草稿」。
- **交易房不變。** 交易房永遠不呼叫 LLM；此限制沿用 ADR-0011。

## 取捨

- **好處**：釣客可用自然語言一次說出多個欄位、修正錯字；平台流程仍可預測、可測試，模型故障或額度用完時仍能完成上架；模型只碰白名單 context 與唯讀工具。
- **代價**：listing 每則訊息都會呼叫模型，免費層額度壓力增加；模型文字每次不同，測試只能驗欄位與行為；修正告知與卡片時機仍可能被模型誤導，需後端二次驗證。
- **刻意不做**：模型直接發布／下架／刪除商品；新增功能旗標；串流回覆；自動重試或排隊。

## 替代方案

- **模型＋寫入工具**：最自由，但需要完整權限與稽核，任何幻覺都可能造成實際交易錯誤。
- **維持規則引擎**：最穩定，但無法自然對話、無法修錯字。
- **模型回 `intent`／`slots` 但由前端理解上架**：與現狀相同，草稿更新仍由規則決定，無法做到「模型直接覆寫草稿」。

## 隱私

- 上架草稿欄位本來就是白名單摘要，已送給模型；`correction_history`、`protected_names`、`condition_proposal` 同屬白名單欄位，先經個資遮蔽再送出。
- 交易房對話仍不外送給任何 LLM。

**Status**: accepted（2026-11-22）

**Considered Options**:

- 模型＋寫入工具。
- 維持規則引擎。
- 模型回 `intent`／`slots` 但由前端理解上架。

**Consequences**:

- 取代 ADR-0011 對「上架流程由規則引擎執行」的限制；交易房不呼叫 LLM 的限制不變。
- `POST /api/ai/reply` 在 listing 模式新增 `listing` 契約；失敗仍回 200 + `handled:false`，錯誤碼維持既有語意（`LLM_INVALID_OUTPUT` 為格式錯誤，`LLM_GUARD_REJECTED` 為欄位驗證失敗）。
- conversation context 新增 `basic_mode`、`correction_history`、`protected_names`、`condition_proposal`；舊草稿缺欄位視為空值，不需遷移。
- 草稿卡在模型模式不顯示「修改草稿」，由卡片資料 `hide_edit` 標記決定。
