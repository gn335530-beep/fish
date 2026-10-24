# 專案指令

## 程式碼規範

單一程式碼檔案不得超過 200 行。新增或修改程式碼時，請在提交前檢查相關檔案的行數；若即將超過上限，應依職責拆分成清晰、易維護的檔案，不要為了符合行數而不合理拆分或壓縮程式碼。若受既有結構或其他限制而無法遵守，請先說明原因。

## Agent skills

### Issue tracker

Issues 與 spec 以 Markdown 存放在 `.scratch/`。見 `docs/agents/issue-tracker.md`。

### Triage labels

使用五個預設 triage 標籤：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。見 `docs/agents/triage-labels.md`。

### Domain docs

單一 context：根目錄 `GLOSSARY.md` 與 `docs/adr/`。見 `docs/agents/domain.md`。
