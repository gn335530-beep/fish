# Domain Docs

工程技能探索 codebase 時，如何讀取這個 repo 的 domain 文件。

## 探索前先讀

- 根目錄的 **`GLOSSARY.md`**，或
- 如果存在根目錄的 **`GLOSSARY-MAP.md`**：它會指向每個 context 的 `GLOSSARY.md`；讀取與主題相關的每一份。
- **`docs/adr/`**：讀取與你即將動工的區域相關的 ADR。multi-context repo 另外檢查 `src/<context>/docs/adr/` 裡的 context 專屬決策。

如果這些檔案不存在，**安靜地繼續**。不要特別指出它們不存在，也不要主動建議先建立。`/domain-modeling` 技能（可經由 `/grill-with-docs` 與 `/improve-codebase-architecture` 觸及）會在術語或決策真正被解決時，才按需建立。

## 檔案結構

Single-context repo（大多數 repo）：

```text
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repo（根目錄有 `GLOSSARY-MAP.md`）：

```text
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← 全系統決策
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← context 專屬決策
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

## 使用 glossary 的詞彙

當你的輸出提到 domain 概念（issue 標題、重構提案、假設、測試名稱），使用 `GLOSSARY.md` 定義的詞。不要漂移到 glossary 明確列為 Avoid 的同義詞。

如果需要的概念還沒進 glossary，這是一個訊號：你要嘛在發明專案沒用的語言（重新考慮），要嘛真的有缺口（註記給 `/domain-modeling`）。

## 標示 ADR 衝突

如果你的輸出與現有 ADR 矛盾，明確提出來，不要默默覆蓋：

> _與 ADR-0007（event-sourced orders）矛盾，但值得重新打開，因為……_
