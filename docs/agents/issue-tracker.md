# Issue tracker：本地 Markdown

這個 repo 的 issue 與 spec 以 Markdown 檔案存放在 `.scratch/`。

## 慣例

- 一個功能一個目錄：`.scratch/<feature-slug>/`
- Spec 是 `.scratch/<feature-slug>/spec.md`
- 實作 issue 一 ticket 一檔：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`，從 `01` 編號，不要用單一合併檔
- Triage 狀態寫在每個 issue 檔案頂端附近的 `Status:` 行（角色字串見 `triage-labels.md`）
- 留言與對話歷史附加在檔案底部的 `## Comments` 標題之下

## 當 skill 說「publish to the issue tracker」

在 `.scratch/<feature-slug>/` 下建立新檔案（必要時建立目錄）。

## 當 skill 說「fetch the relevant ticket」

讀取指定路徑的檔案。使用者通常會直接給路徑或 issue 編號。

## Wayfinding 操作

供 `/wayfinder` 使用。**Map** 是一個檔案，每個 ticket 一個 **child** 檔案。

- **Map**：`.scratch/<effort>/map.md`（Notes / Decisions-so-far / Fog 內容）。
- **Child ticket**：`.scratch/<effort>/issues/NN-<slug>.md`，從 `01` 編號，body 放問題。`Type:` 行記錄 ticket 類型（`research` / `prototype` / `grilling` / `task`）；`Status:` 行記錄 `claimed` / `resolved`。
- **Blocking**：檔案頂端附近的 `Blocked by: NN, NN` 行。當它列出的每個檔案都是 `resolved`，這個 ticket 才算 unblocked。
- **Frontier**：掃描 `.scratch/<effort>/issues/`，找 open、unblocked、unclaimed 的檔案；編號最小的優先。
- **Claim**：開始工作前先設 `Status: claimed` 並存檔。
- **Resolve**：在 `## Answer` 標題下附加答案，設 `Status: resolved`，再把 context pointer（gist + link）附加到 `map.md` 的 Decisions-so-far。
