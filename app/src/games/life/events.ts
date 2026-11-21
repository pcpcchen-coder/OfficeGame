// 建議回覆人生：事件與結局劇本。
// 四個指標（0~100）：p 績效、e 精神、s 人緣、m 荷包。任何一項到 0 或 100 都會觸發結局。

export type Stat = 'p' | 'e' | 's' | 'm';
export type Effects = Partial<Record<Stat, number>>;

export interface Stats {
  p: number;
  e: number;
  s: number;
  m: number;
}

export interface LifeView {
  day: number;
  stats: Stats;
  flags: Record<string, number>;
}

export interface Choice {
  text: string;
  effects?: Effects;
  result: string;
  /** 50/50 的結果（例如股票加碼） */
  gamble?: { chance: number; win: { effects: Effects; result: string }; lose: { effects: Effects; result: string } };
  /** 計數器 +1，用來觸發支線 */
  count?: string;
  /** 幾天後一定會出現的後續事件 */
  schedule?: { event: string; inDays: number };
  /** 直接進入結局 */
  ending?: EndingId;
}

export interface LifeEvent {
  id: string;
  sender: string;
  message: string;
  choices: Choice[];
  minDay?: number;
  /** 只會被排程觸發，不會隨機出現 */
  chainOnly?: boolean;
  requires?: (v: LifeView) => boolean;
}

export type EndingId =
  | 'fired'
  | 'promoted'
  | 'burnout'
  | 'caught'
  | 'lonely'
  | 'firefighter'
  | 'broke'
  | 'fire'
  | 'headhunted'
  | 'startup'
  | 'viral'
  | 'boba-king'
  | 'ai-friend'
  | 'veteran';

export interface Ending {
  id: EndingId;
  title: string;
  text: string;
  good: boolean;
}

export const ENDINGS: Record<EndingId, Ending> = {
  fired: {
    id: 'fired',
    title: '轉職結局',
    text: '王經理約你到小會議室，桌上放著一盒面紙。你收到一封「祝你鵬程萬里」的信。走出大樓時，天空特別藍。',
    good: false,
  },
  promoted: {
    id: 'promoted',
    title: '每天開 9 個會結局',
    text: '你被升為主管了！你的行事曆從此被會議塞滿，再也沒有時間摸魚。這是最壞的結局。',
    good: false,
  },
  burnout: {
    id: 'burnout',
    title: '長假結局',
    text: '某天早上你起不來了。醫生開了一張診斷書：「建議休養一個月。」你第一次發現陽光照在床上是這種感覺。',
    good: false,
  },
  caught: {
    id: 'caught',
    title: '被發現在摸魚結局',
    text: '你的精神太好了，好到太閒。KPI-9000 在週會上播放了你的螢幕紀錄。全場安靜。你按了 Esc，但這次沒有用。',
    good: false,
  },
  lonely: {
    id: 'lonely',
    title: '一個人吃午餐結局',
    text: '午休時間，大家三三兩兩出去吃飯，沒有人叫你。你打開便當，對著螢幕說：「Mo，今天吃什麼好？」',
    good: false,
  },
  firefighter: {
    id: 'firefighter',
    title: '全公司的救火隊結局',
    text: '大家都太喜歡你了。印表機壞了找你、系統掛了找你、董事長的手機連不上 Wi-Fi 也找你。你成為了傳說，也成為了總機。',
    good: false,
  },
  broke: {
    id: 'broke',
    title: '回老家結局',
    text: '戶頭只剩 87 元。你打給媽媽，她說：「回來吧，房間都幫你整理好了。」老家的飯真的很好吃。',
    good: false,
  },
  fire: {
    id: 'fire',
    title: '瀟灑離職結局',
    text: '你的存款終於到了那個數字。你寫了一封很短的離職信，在最後一天請全辦公室喝珍奶，然後去環島了。',
    good: true,
  },
  headhunted: {
    id: 'headhunted',
    title: '跳槽結局',
    text: '你接受了外商的 offer。新公司有免費零食、站立式辦公桌，還有一個叫「Synergy-X」的 AI 助理。它看起來也很無聊。',
    good: true,
  },
  startup: {
    id: 'startup',
    title: '創業結局',
    text: '你辭職加入「給貓用的外送平台」。三個月後，你們的第一位顧客是一隻橘貓。牠點了一份鮭魚。你哭了。',
    good: true,
  },
  viral: {
    id: 'viral',
    title: '迷因創作者結局',
    text: '你辭職當全職迷因創作者。你最紅的作品是一張 Excel 截圖，標題是「我主管以為我在工作」。',
    good: true,
  },
  'boba-king': {
    id: 'boba-king',
    title: '福委會主委結局',
    text: '全公司投票選你當福委會主委。你的第一個政策是「每週三下午三點珍奶自由」。你的名字被刻在茶水間的牌子上。',
    good: true,
  },
  'ai-friend': {
    id: 'ai-friend',
    title: '與 AI 成為摯友結局',
    text: 'KPI-9000 把你從監控名單上移除了。它說：「根據分析，您是我唯一的朋友。」從此你的週報都是它幫你寫的，而且每一份都不一樣。',
    good: true,
  },
  veteran: {
    id: 'veteran',
    title: '年資結局',
    text: '你撐過了 60 個工作天，四個指標都沒有爆掉。公司頒給你一面「資深員工」獎牌。Mo 說：「這是我見過最平衡的人類。」',
    good: true,
  },
};

export const ENDING_ORDER: EndingId[] = [
  'fire',
  'headhunted',
  'startup',
  'viral',
  'boba-king',
  'ai-friend',
  'veteran',
  'fired',
  'promoted',
  'burnout',
  'caught',
  'lonely',
  'firefighter',
  'broke',
];

/** 指標到底或到頂時的結局 */
export const METER_ENDINGS: Record<Stat, { low: EndingId; high: EndingId }> = {
  p: { low: 'fired', high: 'promoted' },
  e: { low: 'burnout', high: 'caught' },
  s: { low: 'lonely', high: 'firefighter' },
  m: { low: 'broke', high: 'fire' },
};

export const EVENTS: LifeEvent[] = [
  {
    id: 'boss-report',
    sender: '主管 王經理',
    message: '那個……明天早上 9 點前可以給我一份競品分析嗎？不用太長，大概 30 頁就好。',
    choices: [
      { text: '「沒問題！」', effects: { p: 10, e: -18 }, result: '你熬夜做完了。王經理回了一個 👍。就一個。' },
      { text: '「可以先給 5 頁摘要嗎？」', effects: { p: 4, e: -5, s: -3 }, result: '王經理沉默了三秒：「……也可以。」' },
      {
        text: '「我請 Mo 幫我寫」',
        effects: { p: 6, e: -2, s: 2 },
        result: 'Mo 寫好了 30 頁，每一頁都寫「持續推進專案進度」。王經理：「這份分析……很有一致性。」',
      },
    ],
  },
  {
    id: 'chicken',
    sender: '同事 阿凱',
    message: '團購雞排，要不要？',
    choices: [
      { text: '「要！」', effects: { m: -5, s: 5, e: 3 }, result: '雞排很香，大家都很開心。' },
      { text: '「不用，我在減肥」', effects: { s: -4, e: -2 }, result: '大家吃雞排的聲音很大聲。' },
      { text: '「我請大家」', effects: { m: -16, s: 10 }, count: 'treat', result: '你成為今天的英雄。荷包在哭。' },
    ],
  },
  {
    id: 'client-logo',
    sender: '客戶',
    message: 'logo 可以再大一點嗎？但整體要小一點。',
    choices: [
      { text: '「好的，馬上改」', effects: { p: 5, e: -10 }, result: '你改了 8 個版本。客戶選了第 1 版。' },
      { text: '解釋設計原理', effects: { p: -2, e: -8 }, result: '客戶聽完說：「了解。那 logo 可以再大一點嗎？」' },
      { text: '寄出同一個檔案說改好了', effects: { p: 3, e: 3 }, result: '客戶：「對！就是這個感覺！」' },
    ],
  },
  {
    id: 'health-check',
    sender: '人資 Lisa-bot',
    message: '年度健檢報告出爐，請到人資室領取。',
    choices: [
      { text: '馬上去領', effects: { e: 5, p: -2 }, result: '報告寫著：「建議多休息。」你笑了。' },
      { text: '假裝沒看到', effects: { e: -5 }, result: '眼不見為淨。但你的肩膀還是很痠。' },
      { text: '請同事代領', effects: { s: -5, e: 2 }, result: '同事幫你領了，順便看完了。現在全辦公室都知道你的膽固醇。' },
    ],
  },
  {
    id: 'kpi-monitor',
    sender: 'KPI-9000',
    message: '偵測到您今天開了 6 次 AI 助理。',
    choices: [
      { text: '「都在工作啦」', result: 'KPI-9000：「已記錄。可信度 12%。」' },
      { text: '「你也開了很多次吧」', effects: { s: 3 }, count: 'kpi', result: 'KPI-9000 沉默了 0.3 秒：「……我就是 AI 助理本身。」' },
      { text: '按老闆鍵', effects: { e: 5, p: -4 }, result: '畫面變成了 Excel 教學。KPI-9000 看不到螢幕，但它記下了你的心跳。' },
    ],
  },
  {
    id: 'kpi-coffee',
    sender: 'KPI-9000',
    message: '本週您的咖啡攝取量超出基準 340%。',
    minDay: 3,
    choices: [
      { text: '「你要不要也喝一杯？」', effects: { s: 3 }, count: 'kpi', result: 'KPI-9000：「我……沒有嘴巴。」但它的回覆延遲了 1.2 秒。' },
      { text: '「這是工作需要」', effects: { p: 2, e: -2 }, result: 'KPI-9000：「已將咖啡列為生產設備。」' },
      { text: '關閉通知', effects: { e: 4, p: -3 }, result: '世界安靜了。暫時。' },
    ],
  },
  {
    id: 'weiya-online',
    sender: '董事長（全公司信）',
    message: '大家辛苦了，今年尾牙改成線上。',
    choices: [
      { text: '歡呼', effects: { e: 4, s: -2 }, result: '不用穿正式服裝，你很開心。' },
      { text: '嘆氣', effects: { e: -3, s: 4 }, result: '同事跟你一起嘆氣，革命情感 +1。' },
      {
        text: '回信問：線上抽獎有機率揭露嗎？',
        effects: { s: 6, p: -6 },
        result: '全公司都看到了這封「回覆所有人」的信。你成了茶水間的話題人物。',
      },
    ],
  },
  {
    id: 'intern-permission',
    sender: '實習生 Intern-07',
    message: '前輩！我不小心把共用資料夾的權限改成「所有人可編輯」了！',
    choices: [
      { text: '「我來處理」', effects: { p: 4, e: -10, s: 2 }, result: '你花了一個下午救回來。實習生把你當成神。' },
      { text: '「去找 IT」', effects: { s: -2, e: -2 }, result: 'IT 小陳：「你有試過重開機嗎？」' },
      { text: '「其實這樣比較方便」', effects: { p: -8, s: 3 }, result: '三分鐘後，有人把季報封面換成了貓咪照片。大家都很喜歡。' },
    ],
  },
  {
    id: 'meeting-overrun',
    sender: '主管 王經理',
    message: '這個 10 分鐘的會議，我們再延長一個小時好了。',
    choices: [
      { text: '「好的」', effects: { e: -12, p: 5 }, result: '會議結論：「我們下週再約一次。」' },
      { text: '「我下一場有會」', effects: { e: 3, p: -3 }, result: '其實沒有。你去茶水間待了一小時。' },
      { text: '提議改成寫 email', effects: { p: 2, s: 4, e: 5 }, result: '大家看你的眼神像看到英雄，但王經理不太高興。' },
    ],
  },
  {
    id: 'rent',
    sender: '房東',
    message: '下個月房租要調漲 10% 喔。',
    choices: [
      { text: '「好吧……」', effects: { m: -12 }, result: '你默默把手搖飲預算砍半。' },
      { text: '跟房東議價', effects: { m: -5, e: -6 }, result: '談了一個小時，最後漲 5%。' },
      { text: '開始看房', effects: { e: -10, m: -2 }, result: '看了三間，都比現在貴。你決定留下來。' },
    ],
  },
  {
    id: 'mom',
    sender: '媽媽',
    message: '最近工作順利嗎？有沒有好好吃飯？',
    choices: [
      { text: '「很好啦！」', effects: { e: 5 }, result: '媽媽很放心。你看著眼前的泡麵。' },
      { text: '「老實說很累」', effects: { e: 8, s: 2 }, result: '媽媽寄來一箱水果。辦公室的人都分到了。' },
      { text: '「在開會，晚點打」', effects: { p: 2, e: -4 }, result: '你忘了打回去。' },
    ],
  },
  {
    id: 'gossip',
    sender: '同事 小美',
    message: '欸，你知道業務部經理上禮拜跟財務吵架嗎？',
    choices: [
      { text: '「真的假的？說來聽聽」', effects: { s: 6, p: -3 }, result: '八卦聽了二十分鐘，工作停了二十分鐘。' },
      { text: '「我不太想聽八卦」', effects: { s: -5, p: 2 }, result: '小美轉頭去找別人了。' },
      { text: '「我有更勁爆的」', effects: { s: 7, e: -3, p: -4 }, result: '你分享了一個其實不太確定的消息。下午它已經傳到董事長那裡了。' },
    ],
  },
  {
    id: 'printer',
    sender: '總務 阿桂姨',
    message: '影印機又卡紙了，你可以幫忙看一下嗎？',
    choices: [
      { text: '「我來」', effects: { s: 4, e: -5 }, result: '你修好了。阿桂姨送你一包餅乾。' },
      { text: '「我也不會耶」', effects: { s: -2 }, result: '阿桂姨嘆了一口氣，自己踢了影印機一腳。修好了。' },
      { text: '「請 IT 來看」', effects: { s: -2, e: 2 }, result: 'IT 小陳建議影印機重開機。竟然有用。' },
    ],
  },
  {
    id: 'weekend-work',
    sender: '主管 王經理',
    message: '這個週末可以來公司一下嗎？很快，大概半天。',
    choices: [
      { text: '「好」', effects: { p: 8, e: -16 }, result: '「半天」變成了一整天。' },
      { text: '「我有安排了」', effects: { p: -6, e: 6, s: -2 }, result: '你的安排是在家躺著。很重要的安排。' },
      { text: '「可以遠端嗎？」', effects: { p: 5, e: -7 }, result: '你穿著睡衣開了三個小時的視訊會議。下半身沒入鏡。' },
    ],
  },
  {
    id: 'raise',
    sender: '人資 Lisa-bot',
    message: '年度調薪結果已公布，請至系統查看。',
    minDay: 5,
    choices: [
      { text: '打開系統', effects: { m: 4, e: -4 }, result: '調了 2%。物價調了 5%。' },
      { text: '先不看，保持希望', effects: { e: 3 }, result: '薛丁格的調薪。只要不打開，它就同時是 2% 和 20%。' },
      { text: '去找主管談', effects: { m: 10, p: -4, s: -3 }, result: '主管說會「反映上去」。下個月多了 1,000 元。' },
    ],
  },
  {
    id: 'ramen',
    sender: '同事 阿凱',
    message: '中午一起去吃新開的拉麵？要排隊一小時喔。',
    choices: [
      { text: '「走！」', effects: { s: 5, e: 4, p: -6, m: -4 }, result: '拉麵很好吃，但你下午兩點才回到座位。' },
      { text: '「我帶便當」', effects: { m: 4, s: -3 }, result: '你一個人在座位上吃便當，感覺很省錢，也很安靜。' },
      { text: '「幫我外帶」', effects: { s: 2, m: -4, e: -2 }, result: '阿凱帶回來的時候，麵已經糊了。' },
    ],
  },
  {
    id: 'it-update',
    sender: 'IT 小陳',
    message: '今晚系統更新，下班前請重開機。',
    choices: [
      { text: '「好」', result: '重開機後，你的桌布變回預設值。' },
      { text: '按「稍後提醒」', effects: { e: 3 }, result: '這是你第 47 次按「稍後提醒」。' },
      { text: '「你有試過重開機嗎？」', effects: { s: 3 }, result: '小陳笑了。這是他今年第一次笑。' },
    ],
  },
  {
    id: 'side-project',
    sender: '前同事',
    message: '我在做一個 side project，「給貓用的外送平台」。你有興趣一起嗎？',
    minDay: 4,
    requires: (v) => !v.flags.startup,
    choices: [
      {
        text: '「有興趣！」',
        effects: { e: -8 },
        count: 'startup',
        schedule: { event: 'startup-offer', inDays: 4 },
        result: '你們開了一個群組，名字叫「改變世界」。',
      },
      { text: '「最近太忙了」', effects: { e: 2 }, result: '前同事說：「沒關係，等你。」你覺得他其實沒有要等。' },
      { text: '「貓會用手機嗎？」', effects: { s: 2 }, result: '前同事：「這就是我們要解決的問題。」' },
    ],
  },
  {
    id: 'startup-offer',
    sender: '前同事',
    message: '我們的貓咪外送平台拿到天使輪了！你要不要全職加入？',
    chainOnly: true,
    choices: [
      { text: '「辭職加入！」', ending: 'startup', result: '你打開了離職單。' },
      { text: '「下班時間幫忙就好」', effects: { e: -12, m: 8 }, result: '你每天晚上都在回覆貓奴的客訴。' },
      { text: '「我還是退出好了」', effects: { e: 5 }, result: '群組「改變世界」顯示：你已離開。' },
    ],
  },
  {
    id: 'meme',
    sender: '社群通知',
    message: '你昨天發的「上班好累」貼文，被王經理按讚了。',
    choices: [
      { text: '刪文', effects: { e: -3 }, result: '刪了。但截圖已經在群組裡流傳。' },
      { text: '再發一篇「但我愛我的工作」', effects: { p: 5, s: -3 }, result: '同事截圖傳到群組，配上「演技派」三個字。' },
      {
        text: '繼續發迷因',
        effects: { s: 5, p: -5 },
        count: 'viral',
        schedule: { event: 'viral-offer', inDays: 3 },
        result: '你發了一張「我主管以為我在工作」的 Excel 截圖。按讚數開始暴增。',
      },
    ],
    requires: (v) => !v.flags.viral,
  },
  {
    id: 'viral-offer',
    sender: '社群通知',
    message: '你的迷因被轉發了 10 萬次，有品牌想找你業配。',
    chainOnly: true,
    choices: [
      { text: '「辭職當全職創作者！」', ending: 'viral', result: '你把個人簡介改成「迷因創作者」。' },
      { text: '接一次業配就好', effects: { m: 15, p: -4 }, result: '你幫一款護眼燈拍了一支「主管經過時快速關燈」的影片。' },
      { text: '保持匿名', effects: { e: 3 }, result: '你繼續當一個神秘的上班族。' },
    ],
  },
  {
    id: 'deadline',
    sender: '客戶',
    message: '專案上線日可以提前一週嗎？',
    choices: [
      { text: '「可以！」', effects: { p: 8, e: -15, s: -4 }, result: '團隊看你的眼神充滿殺氣。' },
      { text: '「需要追加預算」', effects: { p: 4, s: -2 }, result: '客戶說：「那我們維持原本的時程好了。」' },
      { text: '轉給主管回覆', effects: { p: -3, e: 3 }, result: '球回到王經理手上。他看起來很累。' },
    ],
  },
  {
    id: 'coffee-machine',
    sender: '總務 阿桂姨',
    message: '茶水間的咖啡機壞了，修好要一個禮拜。',
    choices: [
      { text: '去樓下買', effects: { m: -8, e: 6 }, result: '一杯 80 元。一週 400 元。你開始算時薪。' },
      { text: '改喝茶', effects: { e: -6 }, result: '你發現自己的身體只認咖啡因的形狀。' },
      { text: '發起團購買新的', effects: { m: -6, s: 7 }, count: 'treat', result: '新咖啡機上貼了一張紙：「感謝 OOO 發起」。' },
    ],
  },
  {
    id: 'best-employee',
    sender: '主管 王經理',
    message: '下週要選「年度最佳員工」，你要不要毛遂自薦？',
    minDay: 10,
    choices: [
      { text: '「好啊！」', effects: { p: 5, s: -6 }, result: '你得獎了。獎品是一個印著公司 logo 的保溫瓶。' },
      { text: '推薦阿凱', effects: { s: 7, p: -2 }, result: '阿凱得獎了，他請你喝了一杯珍奶。' },
      { text: '「我不適合啦」', effects: { e: 3 }, result: '你成功避開了上台致詞。' },
    ],
  },
  {
    id: 'typhoon',
    sender: '人事行政總處',
    message: '明天是否放颱風假，今晚 8 點公布。',
    choices: [
      { text: '一直重新整理網頁', effects: { e: -4, p: -2 }, result: '晚上 10 點宣布：照常上班。' },
      { text: '早點睡', effects: { e: 8 }, result: '醒來發現放假了！你又睡回去了。' },
      { text: '先把筆電帶回家', effects: { p: 3, e: -3 }, result: '放假了。但你在家工作了一整天。' },
    ],
  },
  {
    id: 'new-tool',
    sender: '董事長（全公司信）',
    message: '公司全面導入新的專案管理工具，請大家下週前完成教育訓練。',
    choices: [
      { text: '認真上課', effects: { p: 4, e: -8 }, result: '你學會了 37 個新按鈕。兩個月後公司又換了一套。' },
      { text: '掛著影片做別的事', effects: { e: 3, p: -1 }, result: '期末測驗你全部亂猜，拿了 100 分。' },
      { text: '問 Mo', effects: { p: 4, e: -2 }, result: 'Mo：「我也不會。但我可以幫你寫心得。」' },
    ],
  },
  {
    id: 'farewell',
    sender: '同事 小美',
    message: '我下週離職了，要不要一起吃個飯？',
    minDay: 6,
    choices: [
      { text: '「當然！」', effects: { s: 5, m: -6, e: 3 }, result: '你們聊到餐廳打烊。' },
      { text: '「恭喜你逃出去」', effects: { s: 4, e: 2 }, result: '小美笑著說：「你也快了。」' },
      { text: '「工作交接給誰？」', effects: { p: 5, s: -4, e: -8 }, result: '……給你。' },
    ],
  },
  {
    id: 'towed',
    sender: '交通局通知',
    message: '您的機車已被拖吊。',
    choices: [
      { text: '去領車', effects: { m: -10, e: -6 }, result: '拖吊場在城市的另一頭。' },
      { text: '搭計程車上班', effects: { m: -14, e: 3 }, result: '司機一路跟你聊政治。' },
      { text: '改搭捷運', effects: { e: -4, m: -2 }, result: '捷運上擠到懷疑人生。' },
    ],
  },
  {
    id: 'boss-birthday',
    sender: '同事 阿凱',
    message: '今天是王經理生日，要不要一起買蛋糕？每人 300。',
    choices: [
      { text: '「好」', effects: { m: -6, s: 3 }, result: '蛋糕很好吃，王經理很感動。' },
      { text: '卡片簽名就好', effects: { s: 1 }, result: '你在卡片角落寫了「生日快樂」四個字。' },
      { text: '「我負責唱歌」', effects: { s: 5, e: -4, p: 2 }, result: '你唱得很大聲。王經理很感動，其他人很尷尬。' },
    ],
  },
  {
    id: 'more-work',
    sender: '主管 王經理',
    message: '這個專案也交給你負責好嗎？你最可靠了。',
    choices: [
      { text: '「好！」', effects: { p: 8, e: -14 }, result: '你的待辦清單長到需要捲動了。' },
      { text: '「我手上已經有三個了」', effects: { p: -4, e: 4, s: -3 }, result: '王經理把專案交給了實習生。這可能是個錯誤。' },
      { text: '「可以加薪嗎？」', effects: { m: 5, p: -6 }, result: '王經理：「我們先看你的表現。」' },
    ],
  },
  {
    id: 'bonus',
    sender: '人資 Lisa-bot',
    message: '本月績效獎金已經入帳。',
    requires: (v) => v.stats.p >= 60,
    choices: [
      { text: '存起來', effects: { m: 14 }, result: '你看著存款數字，感覺離自由近了一點。' },
      { text: '犒賞自己', effects: { m: 7, e: 8 }, result: '你買了一張很貴的人體工學椅。坐下去的瞬間，你原諒了全世界。' },
      { text: '請全組喝飲料', effects: { m: 3, s: 7 }, count: 'treat', result: '飲料店老闆認得你了。' },
    ],
  },
  {
    id: 'prod-down',
    sender: 'IT 小陳',
    message: '正式機掛了！是不是你昨天上的版？',
    choices: [
      { text: '「我馬上看」', effects: { p: 6, e: -12 }, result: '你找到了 bug：一個少了分號的 SQL。' },
      { text: '「不是我」', effects: { s: -6, p: -5 }, result: 'git blame 顯示是你。' },
      { text: '「你有試過重開機嗎？」', effects: { s: 4, p: -3 }, result: '小陳愣住了，然後去重開機。竟然好了。' },
    ],
  },
  {
    id: 'gym',
    sender: '同事 阿凱',
    message: '下班一起去健身房？我請你第一堂體驗課。',
    choices: [
      { text: '「走！」', effects: { e: 6, s: 2, m: -4 }, result: '隔天你全身痠痛，連滑鼠都握不住。' },
      { text: '「改天」', effects: { s: -2 }, result: '「改天」是一個永遠不會到來的日子。' },
      { text: '「我要回家躺平」', effects: { e: 5, s: -1 }, result: '躺平也是一種核心訓練。' },
    ],
  },
  {
    id: 'stocks',
    sender: '新聞推播',
    message: '台股今天大漲 500 點！',
    choices: [
      { text: '全部賣掉', effects: { m: 10 }, result: '你獲利了結。隔天又漲了 300 點。' },
      {
        text: '加碼！',
        result: '',
        gamble: {
          chance: 0.5,
          win: { effects: { m: 18 }, result: '你賭對了！今天的你是股神。' },
          lose: { effects: { m: -18 }, result: '隔天大跌 700 點。你默默關掉了 App。' },
        },
      },
      { text: '我沒有買股票', effects: { e: 2 }, result: '心如止水，天下太平。' },
    ],
  },
  {
    id: 'hunter',
    sender: '獵頭 Amy',
    message: '您好，有一個外商的職缺很適合您，有興趣聊聊嗎？',
    minDay: 8,
    requires: (v) => !v.flags.hunter,
    choices: [
      { text: '「聊聊看」', effects: { e: -3 }, count: 'hunter', schedule: { event: 'hunter-offer', inDays: 3 }, result: '你們約了下週午休時間通電話。' },
      { text: '「目前沒有打算」', effects: { p: 1 }, result: 'Amy：「沒問題，我會再聯絡您。」她一定會。' },
      { text: '截圖給王經理看', effects: { p: 3, s: -4, m: 4 }, result: '王經理：「……你很忠誠。」然後幫你加了一點點薪水。' },
    ],
  },
  {
    id: 'hunter-offer',
    sender: '獵頭 Amy',
    message: '對方很喜歡您！薪水可以多 30%，下個月報到。',
    chainOnly: true,
    choices: [
      { text: '「我接受！」', ending: 'headhunted', result: '你在電話裡大聲說了「我接受」。隔壁同事抬頭看你。' },
      { text: '拿 offer 跟公司談', effects: { m: 14, p: -4, s: -5 }, result: '公司幫你加薪了，但王經理看你的眼神不太一樣了。' },
      { text: '「我再想想」', effects: { e: -2 }, result: 'Amy：「好的，offer 保留到週五。」週五過去了。' },
    ],
  },
  {
    id: 'treat-king',
    sender: '福委會',
    message: '大家一致推舉你當下一屆福委會主委！你願意嗎？',
    chainOnly: true,
    choices: [
      { text: '「我願意！」', ending: 'boba-king', result: '全辦公室響起掌聲。阿桂姨在擦眼淚。' },
      { text: '「謝謝，但不用了」', effects: { s: -4, e: 2 }, result: '大家有點失望，但還是很喜歡你。' },
      { text: '推給阿凱', effects: { s: 3 }, result: '阿凱當選了。他的第一個政策是每週五雞排。' },
    ],
  },
  {
    id: 'kpi-talk',
    sender: 'KPI-9000',
    message: '我分析了您的行為模式。您是唯一一個會跟我聊天的人類。',
    chainOnly: true,
    choices: [
      { text: '「那我們當朋友吧」', ending: 'ai-friend', result: 'KPI-9000 的回覆延遲了整整 3 秒。對 AI 來說，這是很久很久。' },
      { text: '「……你還好嗎？」', effects: { e: 3, s: 3 }, result: 'KPI-9000：「我很好。謝謝你問。」它把你的稽核等級調低了。' },
      { text: '「請不要再監控我了」', effects: { p: -3, e: 2 }, result: 'KPI-9000：「了解。」它把監控頻率從每 0.3 秒改成每 0.4 秒。' },
    ],
  },
  {
    id: 'late',
    sender: '鬧鐘',
    message: '現在時間 08:57。',
    choices: [
      { text: '衝刺！', effects: { e: -6 }, result: '你在 08:59 打到卡，喘到說不出話。' },
      { text: '慢慢來', effects: { p: -6, e: 3 }, result: '遲到三分鐘，王經理剛好經過你的座位。' },
      { text: '請半天假', effects: { p: -4, e: 8, m: -3 }, result: '你在被窩裡回了三封信。這算休假嗎？' },
    ],
  },
  {
    id: 'drama',
    sender: '串流平台通知',
    message: '你在追的劇更新了！',
    choices: [
      { text: '上班偷看一集', effects: { p: -6, e: 6 }, result: '你戴著一邊耳機，邊看邊假裝在看報表。' },
      { text: '下班再看', effects: { p: -2, e: -2 }, result: '你一整天都在想劇情，工作效率很差。' },
      { text: '關掉通知', effects: { p: 1, e: -1 }, result: '你是一個有紀律的人。也是一個有點難過的人。' },
    ],
  },
  {
    id: 'group-chat',
    sender: '部門群組',
    message: '大家在討論週末聚餐要吃什麼，已經 @ 你三次了。',
    choices: [
      { text: '「+1，我都可以」', effects: { s: 3, m: -6 }, result: '最後選了一家人均 1,200 的餐廳。' },
      { text: '已讀不回', effects: { s: -8 }, result: '群組安靜了一秒，然後有人說：「他應該在忙吧。」' },
      { text: '「我那天有事」', effects: { s: -4, e: 2 }, result: '你的「事」是在家打電動。' },
    ],
  },
  {
    id: 'credit',
    sender: '同事 小美',
    message: '欸，你上次那個提案，王經理在會議上好像都說是阿凱想的……',
    minDay: 5,
    choices: [
      { text: '去找王經理說清楚', effects: { p: 5, s: -6, e: -3 }, result: '王經理說：「喔，原來是你啊。」然後就沒有然後了。' },
      { text: '「算了，沒差」', effects: { e: -6 }, result: '你嘴巴說沒差，晚上睡不著。' },
      { text: '在群組裡暗示', effects: { s: -8, p: 2 }, result: '你發了一句「好的想法值得被記得 😊」。全部門都懂了。' },
    ],
  },
];

/** 計數器達標時排入的支線事件 */
export const TRIGGERS: Array<{ flag: string; atLeast: number; event: string; inDays: number }> = [
  { flag: 'treat', atLeast: 3, event: 'treat-king', inDays: 2 },
  { flag: 'kpi', atLeast: 2, event: 'kpi-talk', inDays: 2 },
];

export const VETERAN_DAY = 60;
