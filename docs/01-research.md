# 01 · 市場與設計調研摘要

> 目的：在動手設計「長得像 AI 聊天介面的上班摸魚遊戲」之前，先把可借鏡的前例、玩家心理、變現模式與風險盤點清楚。
> 調研日期：2026-11。每條結論後面都附「→ 設計啟示」。

---

## 1. 前例：「偽裝成工作畫面」的遊戲早就存在，而且一直有人買單

| 前例 | 重點 | 來源 |
|---|---|---|
| **老闆鍵（Boss Key）** | 1980 年代起的傳統：按一個鍵，遊戲瞬間變成假試算表或 DOS 畫面。微軟接龍原作者 Wes Cherry 曾內建老闆鍵（顯示假試算表），上市前被要求拿掉；Spectrum HoloByte 版 Tetris 也有假試算表。 | [Wikipedia: Boss key](https://en.wikipedia.org/wiki/Boss_key)、[Boing Boing 2026/07](https://boingboing.net/2026/07/16/boss-key.html) |
| **Spreadsheet Survivors** | 現代 roguelite，按 `~` 一鍵切成專業試算表。 | [gg.deals](https://gg.deals/au/game/spreadsheet-survivors/) |
| **Quarter Close** | 偽裝成試算表的放置經營遊戲：每季設定財測、超標拿「保留盈餘」當轉生貨幣；點擊收益遞減、季度重置；按 Esc 切成空白試算表。 | [Quarter Close](https://kpa-clawbot.github.io/quarter-close/) |
| **Spreadsheet Solitaire / Stealth Excel Game** | 把接龍、小遊戲塞進「看起來像 Excel」的外殼。 | [itch.io](https://presbforboss.itch.io/spreadsheet-solitaire)、[Product Hunt](https://www.producthunt.com/products/stealth-excel-game/reviews) |

**→ 設計啟示**
- 「偽裝」本身就是賣點，也是玩法：試算表外殼已經被做爛了，**AI 聊天介面是 2026 年最自然的新外殼**。現在每個上班族的螢幕上本來就開著 AI 聊天視窗，比 Excel 更不可疑。
- 老闆鍵是必備功能，而且要做到「切過去的畫面本身就很可信」。
- Quarter Close 的「季度」節奏和上班族的語言完全對得上，可以借用「Q1~Q4」的賽季結構。

---

## 2. 前例：「假裝 AI」與「跟 AI 鬥智」都已被證明會爆紅

| 前例 | 重點 | 來源 |
|---|---|---|
| **youraislopbores.me**（2026/04） | 由真人假扮聊天機器人回答別人的請求。回答限時 75 秒，模擬機器的速度。上線約一個月 **2,500 萬不重複訪客**。介面分成「human」和「larp as ai」兩個分頁，並用工具過濾有害內容。 | [NPR 2026/04/14](https://www.npr.org/2026/04/14/nx-s1-5776842/ai-chatbot-comedy-ben-palmer-chatgpt&nbsp) |
| **仿冒 AI 網站（Ben Palmer）** | 喜劇演員用「網址很像真品」的假 AI 網站惡搞，有人分不出是真人在回；**這些網站大多已經下架**。 | 同上 |
| **Gandalf（Lakera）** | 想辦法讓 AI 說出密碼的關卡遊戲，2023 年爆紅，蒐集到 27.9 萬筆攻擊提示詞。 | [The Register](https://www.theregister.com/2023/09/17/gandalf_prompt_injection_game/)、[arXiv](https://arxiv.org/html/2501.07927v1) |
| **AI Dungeon** | GPT-2 起家的文字冒險，2020 年月活破百萬。批評者認為它只是包了一層外殼的文字預測。另一派設計建議：每回合給「幾個選項」比完全自由輸入更好玩。 | [Wikipedia](https://www.wikipedia.org/wiki/AI_Dungeon)、[gwern.net](https://gwern.net/cyoa)、[Frank Lantz](https://franklantz.substack.com/p/why-no-ai-games) |
| **Infinite Craft** | 把概念合成新概念的 AI 遊戲，有過一波大爆紅。 | 同上 |
| **GMTK 2023 Jam、ChatHuman 等** | 獨立作品已有人用「長得像 ChatGPT」的介面做遊戲，但**沒有找到任何以「上班偷玩」為定位的系列產品**，這是市場空缺。 | [itch.io](https://itch.io/jam/gmtk-2023/rate/2154610?after=0) |

**→ 設計啟示**
- 「真人 vs AI」「說服 AI」「合成概念」三種玩法已被驗證有病毒傳播力，可以改造成職場題材。
- 純自由輸入的 LLM 遊戲容易流於空洞，**每回合給「建議回覆」按鈕（AI 介面本來就有）**，比較好上手、也比較適合碎片時間。
- 不能做成「會被誤認為真品」的仿冒站：品牌、網址、Logo 都要自己的（見 §6）。

---

## 3. 每日解謎與社群分享：Wordle / NYT Games 的公式

| 觀察 | 來源 |
|---|---|
| Wordle 最重要的設計是**不爆雷的 emoji 格子分享**，而且這個點子來自社群，不是原作者。 | [Medium/IPG](https://medium.com/ipg-media-lab/five-lessons-that-marketers-can-learn-from-wordle-ad513845378d)、[Game Developer](https://www.gamedeveloper.com/marketing/josh-wardle-reflects-on-the-the-unconventional-road-to-wordle-s-success) |
| **一天只有一題**的稀缺性，讓期待感每 24 小時累積一次；沒有閃爍橫幅、推播或干擾動畫。 | [CNBC](https://www.cnbc.com/2022/02/15/bite-sized-fun-the-psychology-behind-your-sudden-wordle-obsession.html) |
| NYT：Wordle、Connections、Strands、Pips 免費；Mini、完整填字遊戲與一萬多題的題庫**只給訂閱者**。Mini、Connections、Strands 各自破十億次遊玩。2026 年推出第一款雙人遊戲。 | [thewordfinder 2026](https://www.thewordfinder.com/blog/?p=2000)、[WTOP 2026/01](https://wtop.com/consumer-news/2026/01/this-just-in-from-the-new-york-times-its-first-2-player-game-and-an-evolving-business-model/) |
| 有人評「每日成績分享頻道」是最被低估的職場儀式；但**多數 Slack 遊戲 90 天內就死掉**（個人觀點，無數據）。 | [Water Cooler Trivia](https://www.watercoolertrivia.com/blog/slack-games) |

**→ 設計啟示**
- 至少一款遊戲要有「每天一題＋不爆雷分享卡」。
- 分享卡要做成**看起來像程式碼／Log 的格式**，貼在公司群組裡也不突兀。
- 免費玩當日題，訂閱解鎖題庫與額外內容，NYT 已證明這套能讓人付費。
- 要避開「90 天就膩」，得靠賽季、團隊副本與持續更新的劇情。

---

## 4. 上班族行為與台灣付費習慣

| 觀察 | 來源 |
|---|---|
| 2012 年 1111 調查：94% 上班族玩遊戲，每週平均 8.23 小時；玩 App 遊戲的人有 69% 只下載免費遊戲（數據較舊）。 | [蕃新聞](https://n.yam.com/Article/20120131194823) |
| 台灣玩家 87.1% 用手機、平板玩遊戲（2021）。 | [關鍵評論網](https://www.thenewslens.com/article/149371) |
| 104 人資長觀點：工作專注力長期被通訊軟體打斷，上班族更想在零碎時間找「短暫停頓」；「微療癒」遊戲流行，反映職場隱性過勞。 | [遠見 城市學](https://city.gvm.com.tw/article/129329) |
| 資策會 MIC（2025）：35.5% 玩家有付費習慣，比前一年少約一成；**72.1% 每月花費在 NT$1,000 以內**。 | [聯合新聞網](https://udn.com/news/story/7266/9433106) |
| 找不到近年專門調查「上班時間玩遊戲」的台灣數據。 | — |

**→ 設計啟示**
- 主力是**桌機瀏覽器**（上班情境），但一定要有手機版（PWA），讓通勤、午休也能接著玩。
- 定位是「**微休息**」而不是「逃避工作」，對外好說明，也比較不會被 IT 封鎖。
- 定價要壓在小額：月費 NT$100 左右、單品 NT$30~150。

---

## 5. 變現模式基準

| 觀察 | 來源 |
|---|---|
| 休閒遊戲正從超休閒（純廣告）轉向**混合休閒**（廣告＋內購）。 | [Appodeal 2025 報告](https://appdevelopermagazine.com/mobile-casual-benchmarks-report-2025/) |
| 估計約 60% 暢銷遊戲有戰鬥通行證，占內購營收約 22%（部落格估計值）。季票能製造「賽季進度感」。 | [Game Growth Advisor](https://gamegrowthadvisor.com/blog/2026-04-02-f2p-monetization-models-comparison-2026/) |
| 獎勵式影片廣告最受玩家接受（87% 正面評價），但**純靠廣告已不足以支撐休閒遊戲獲利**。 | [Verve](https://verve.com/blog/hybrid-monetization-in-casual-games-how-beresnev-strikes-the-right-balance/)、[AppSamurai](https://playbook.appsamurai.com/monetization-playbook) |
| 單一案例：Coin Sort 的「免廣告通行證」讓 31% 看廣告的玩家轉成付費玩家（廠商說法）。 | [causalzap](https://causalzap.github.io/knitout.net/articles/hybrid-casual-monetization-coin-sort-revenue-blueprint.html) |
| AI Dungeon：用訂閱與 AI 點數收費，多人主持模式一開始只給付費會員。 | [Wikipedia](https://www.wikipedia.org/wiki/AI_Dungeon) |

**→ 設計啟示（本專案最關鍵的差異化）**
- **廣告會讓偽裝破功**（彈出一個手遊廣告，旁邊同事一眼就看穿），所以我們**完全不放廣告**，這點直接寫進品牌承諾。
- 營收來自：訂閱＋賽季通行證＋外觀（偽裝皮膚）＋ AI 點數（LLM 推論有真實成本，收費名正言順）。

---

## 6. 法律與風險

| 風險 | 觀察 | 來源 |
|---|---|---|
| **UI 外觀仿冒** | 整體外觀（trade dress）可以受保護，但門檻高，而且常被「屬於功能性設計」抗辯；真正的風險在**讓人混淆來源**。英國有案例判定抄襲 App 圖示與幾乎相同的文字構成商標侵權。新進者最好**不要刻意模仿知名品牌的外觀**。 | [AFS Law](https://www.afslaw.com/perspectives/alerts/ai-software-clones-raise-trademark-and-trade-dress-issues-not-just-copyright)、[Asia IP](https://www.asiaiplaw.com/sector/media/ui-and-ux-protecting-the-modern-interface) |
| **機率型商品** | 台灣自 2023/01/01 起，網路遊戲中凡涉及付費的機會中獎商品（含合成），都必須在官網首頁、登入頁或購買頁以**百分比**揭露機率。 | [經濟部修正說明](https://srps.kl.edu.tw/news/file/780/%E7%B6%B2%E8%B7%AF%E9%80%A3%E7%B7%9A%E9%81%8A%E6%88%B2%E6%9C%8D%E5%8B%99%E5%AE%9A%E5%9E%8B%E5%8C%96%E5%A5%91%E7%B4%84%E7%AF%84%E6%9C%AC%E4%BF%AE%E6%AD%A3%E8%AA%AA%E6%98%8E.pdf)、[TechNews](https://technews.tw/2021/12/01/mobile-game-probabilistic-goods-must-be-revealed/) |
| **使用者生成內容** | youraislopbores.me 需要過濾有害內容；Gandalf 曾因分析儀表板公開而外洩。 | [NPR](https://www.npr.org/2026/04/14/nx-s1-5776842/ai-chatbot-comedy-ben-palmer-chatgpt&nbsp)、[The Register](https://www.theregister.com/2023/09/17/gandalf_prompt_injection_game/) |

**→ 設計啟示**
- 採用「**通用 AI 聊天語彙**」（左側欄、對話泡泡、輸入框、模型選單），這些屬於功能性慣例；**不用** ChatGPT / Claude 的名稱、Logo、品牌色、字型或特有圖示，網址與品牌完全自創。
- **不做轉蛋**。如果之後要做任何機率型付費內容，一定要照規定揭露機率。
- 使用者寫的內容（反向圖靈、自訂守門 Bot）要有審核、檢舉與過濾機制。
- 新風險（調研時發現的）：介面長得像 AI 助理，**玩家可能真的把公司機密貼進輸入框**，必須在設計上防堵（見企劃書 §8）。

---

## 7. 調研結論：一句話定位

> **「Moyu（摸魚）」：一個長得像 AI 助理的迷你遊戲合集。每局 30 秒到 3 分鐘，隨時關、隨時接；沒有廣告，因為廣告會讓你被抓包。**

完整企劃與劇本見 [`02-game-design.md`](./02-game-design.md)。
