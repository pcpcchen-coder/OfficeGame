# Moyu MVP（網頁版）

企劃書：[`../docs/02-game-design.md`](../docs/02-game-design.md)

## 這一版有什麼

- **★ 主線：B13 之龍**（`mo-mud-b13`）：原創的辦公室文字 MUD。雲頂大樓 B13 睡著一條吃週末的龍「季末」，你從 1 樓一路打上去。目前開放第一章《入職》（1F~7F、三種職業、商店、茶水間、每日精力、公告欄）與第二章《加班》（8F~12F、夜間怪物、天賦、NPC 任務、稀有裝備）。第三章《B13》2026-12-12 開放；終章（三階段龍戰與三種結局）和二周目 2026-12-24 開放。企劃見 [`../docs/03-mud-design.md`](../docs/03-mud-design.md)。

以下是小品：

- **聊天外殼**：左側欄的對話紀錄就是存檔，頂部的「模型選單」用來切換遊戲，按鈕是「建議回覆」。
- **老闆鍵**：按 `Esc` 或連按兩下 `Shift`（手機上點右上角的 `⌄`），畫面會瞬間換成一段真的有用的工作對話。分頁標題和圖示也會一起換掉。偽裝畫面裡輸入 `/mo` 也能切回來。
- **新手教學**（`mo-assistant`）：照企劃書 §4.3 的開場劇本。
- **每日提示詞**（`mo-daily`）：每天一題，台灣時間午夜換題。有不爆雷的成績卡、連勝紀錄和成績統計。
- **算力農場**（`mo-idle-turbo`）：放置經營。GPU 自己產出 tokens，離線最多累積 8 小時；可以買 GPU、請標註員、升級散熱，累積夠多就「發布新版本」換取永久的模型聲望。另有 5 種隨機事故報告（實習生、機房過熱、KPI-9000 稽核……）。
- **Bug 地城**（`mo-rogue-mini`）：ASCII roguelite，共 10 層。用每日種子，同一天全服地圖相同；有戰爭迷霧、5 種 bug 怪物、咖啡、小黃鴨，以及每局一次的 `git revert` 悔棋。第 10 層要打倒死線惡魔才能「準時下班」。
- **年終密碼**（`mo-guard`，**2026-12-12 上線**）：說服 5 位守門 Bot（人資、總務、IT、秘書、法務）說出秘密。規則式說服引擎：訊息依關鍵字分成 10 種策略，每個 Bot 有自己的弱點和地雷；同一招重複用會遞減，一次塞太多招會被扣分。上線日之前在模型選單顯示倒數，網址加上 `?preview` 可以提前試玩。
- **建議回覆人生**（`mo-life-sim`）：每天有人傳訊息給你，從 Mo 提供的 3 個建議回覆中選一個。四個指標（績效、精神、人緣、荷包）任何一項到 0 或 100 就觸發結局。劇本有 42 則事件（含 5 則支線事件）、5 條支線（獵頭、創業、迷因、福委會、和 KPI-9000 當朋友），共 14 種結局可收集。
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
| `src/games/idle/` | 算力農場：產出結算、升級、事件、發布新版本 |
| `src/games/rogue/` | Bug 地城：地圖生成、戰爭迷霧、怪物 AI、道具、悔棋 |
| `src/games/mud/` | 主線 B13 之龍：世界資料（`data.ts`）、遊戲邏輯（`mud.ts`） |
| `src/games/guard/` | 年終密碼：守門 Bot 角色資料（`bots.ts`）、說服引擎（`guard.ts`） |
| `src/games/life/` | 建議回覆人生：事件與結局劇本（`events.ts`）、遊戲邏輯（`life.ts`） |
| `src/engine/rng.ts` | 可重現的亂數（每日種子用） |
| `src/bosskey/fakeChats.ts` | 老闆鍵的偽裝對話（5 段） |
| `src/components/` | 介面元件 |

## 新增一款遊戲

1. 在 `src/games/` 實作 `MoyuGame<S>`。
2. 在 `src/games/registry.ts` 的 `GAMES` 與 `MODEL_MENU` 註冊。
3. 在 `src/engine/types.ts` 的 `GameId` 加上新的 id。

## 新增每日題目

在 `src/games/daily/puzzles.ts` 加一筆。`npm test` 會檢查格式：必須是 6 行，2 行預先顯示，而且預先顯示的那 2 行不能直接出現答案。

## 新增建議回覆人生的事件

在 `src/games/life/events.ts` 的 `EVENTS` 加一筆。每則事件要有 3 個選項，選項文字不能重複。`effects` 裡的數字是相對大小，實際套用時會乘以 1.3（`EFFECT_SCALE`）。支線的後續事件要標 `chainOnly: true`。`npm test` 會檢查格式、支線指向，以及每種結局是否都能觸發。

## 設定遊戲的上線日

在遊戲物件上加 `releaseDate: 'YYYY-MM-DD'`（台灣時間）。上線日之前，模型選單會顯示「M/D 上線 · 還有 N 天」，而且不能點；日期一到會自動開放，不需要重新部署。網址加上 `?preview` 可以略過這個限制來測試。

## 開放《B13 之龍》的後續章節

編輯 `src/games/mud/releases.ts`，把要開放的段落從 `null` 改成日期（台灣時間）：

```ts
export const MUD_RELEASES = {
  ch3: '2026-12-20',    // 第三章《B13》
  finale: '2027-01-01', // 終章：龍戰與結局
  ngplus: null,         // 二周目（還沒開放）
};
```

合併到 `main` 之後，日期一到就自動開放。網址加上 `?preview` 可以先試玩全部內容。
