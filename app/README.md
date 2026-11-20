# Moyu MVP（網頁版）

企劃書：[`../docs/02-game-design.md`](../docs/02-game-design.md)

## 這一版有什麼

- **聊天外殼**：左側欄的對話紀錄就是存檔，頂部的「模型選單」用來切換遊戲，按鈕是「建議回覆」。
- **老闆鍵**：按 `Esc` 或連按兩下 `Shift`（手機上點右上角的 `⌄`），畫面會瞬間換成一段真的有用的工作對話。分頁標題和圖示也會一起換掉。偽裝畫面裡輸入 `/mo` 也能切回來。
- **新手教學**（`mo-assistant`）：照企劃書 §4.3 的開場劇本。
- **每日提示詞**（`mo-daily`）：每天一題，台灣時間午夜換題。有不爆雷的成績卡、連勝紀錄和成績統計。
- **輸入安全檢查**：看起來像 email、電話、網址、程式碼的輸入，或多行、過長的內容，會在進入遊戲前被擋下，不會被儲存。
- **存檔**：所有進度只存在瀏覽器本機（localStorage），沒有後端。

## 開發

```bash
npm install
npm run dev      # 開發伺服器
npm test         # 單元測試（vitest）
npm run lint     # oxlint
npm run build    # 型別檢查 + 打包到 dist/
```

## 程式結構

| 路徑 | 內容 |
|---|---|
| `src/engine/types.ts` | 遊戲介面 `MoyuGame`：`(state, 玩家輸入) → (新 state, 回覆, 建議回覆)` |
| `src/engine/session.ts` | 對話與遊戲之間的膠水（純函式） |
| `src/engine/safety.ts` | 輸入安全檢查 |
| `src/engine/date.ts` | 台灣時間換日 |
| `src/games/tutorial.ts` | 新手教學／Mo 主選單 |
| `src/games/daily/` | 每日提示詞的邏輯與題庫（14 題，依天數輪替） |
| `src/bosskey/fakeChats.ts` | 老闆鍵的偽裝對話（5 段） |
| `src/components/` | 介面元件 |

## 新增一款遊戲

1. 在 `src/games/` 實作 `MoyuGame<S>`。
2. 在 `src/games/registry.ts` 的 `GAMES` 與 `MODEL_MENU` 註冊。
3. 在 `src/engine/types.ts` 的 `GameId` 加上新的 id。

## 新增每日題目

在 `src/games/daily/puzzles.ts` 加一筆。`npm test` 會檢查格式：必須是 6 行，2 行預先顯示，而且預先顯示的那 2 行不能直接出現答案。
