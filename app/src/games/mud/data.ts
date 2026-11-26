// 《B13 之龍》的世界資料（第一章「入職」、第二章「加班」、第三章「B13」與終章）。全部原創，見 docs/03-mud-design.md。

export type ClassId = 'engineer' | 'sales' | 'designer';
export type RoomId =
  | 'lobby'
  | 'store'
  | 'pantry'
  | 'eng'
  | 'sales'
  | 'meeting'
  | 'boss-room'
  | 'elevator'
  | 'mkt'
  | 'fin'
  | 'legal'
  | 'it'
  | 'exec'
  | 'b-parking'
  | 'b-archive'
  | 'b-server'
  | 'b13';
export type ItemId =
  | 'coffee'
  | 'boba'
  | 'espresso'
  | 'keyboard'
  | 'laser'
  | 'hoodie'
  | 'headphones'
  | 'energy'
  | 'monitors'
  | 'nc-pro'
  | 'bento'
  | 'ctrl-z'
  | 'camera-off'
  | 'firewall'
  | 'super-energy'
  | 'pto'
  | 'workstation'
  | 'ergo-chair'
  | 'vimrc'
  | 'remote-permit';
export type EnemyId =
  | 'todo'
  | 'merge-slime'
  | 'alert'
  | 'ghost-client'
  | 'quota-ghost'
  | 'quote-twins'
  | 'email-meeting'
  | 'projector'
  | 'agenda-3'
  | 'weekly-meeting'
  | 'urgent-deck'
  | 'one-more-version'
  | 'trend-report'
  | 'midnight-post'
  | 'unbalanced'
  | 'month-end'
  | 'receipt-pile'
  | 'audit-ghost'
  | 'clause-37'
  | 'nda'
  | 'annex-4'
  | 'redline'
  | 'reboot-loop'
  | 'bsod'
  | 'legacy-ie'
  | 'pager'
  | 'airdrop-project'
  | 'lost-car'
  | 'parking-meter'
  | 'flicker-light'
  | 'tow-king'
  | 'old-contract'
  | 'biting-binder'
  | 'jammed-shredder'
  | 'archivist'
  | 'zombie-process'
  | 'y2k-bug'
  | 'two-am-cron'
  | 'mainframe'
  | 'kimatsu';

export const MAX_ENERGY = 20;
/** 每隔多久自動恢復 1 點精力 */
export const ENERGY_REGEN_MS = 6 * 60 * 1000;
export const BOSS_MIN_LEVEL = 4;

export interface ClassDef {
  id: ClassId;
  name: string;
  hp: number;
  atk: number;
  def: number;
  skill: string;
  skillDesc: string;
  desc: string;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  engineer: {
    id: 'engineer',
    name: '工程師',
    hp: 30,
    atk: 6,
    def: 2,
    skill: 'Hotfix',
    skillDesc: '造成 2.5 倍傷害',
    desc: '攻守平衡。相信所有問題都可以用一個 hotfix 解決。',
  },
  sales: {
    id: 'sales',
    name: '業務',
    hp: 36,
    atk: 5,
    def: 3,
    skill: '話術',
    skillDesc: '讓對手愣住 2 回合，這場勝利的金錢 +50%',
    desc: '血最厚、最會賺錢。能把「不」聽成「還在考慮」。',
  },
  designer: {
    id: 'designer',
    name: '設計師',
    hp: 26,
    atk: 7,
    def: 1,
    skill: '改稿',
    skillDesc: '閃過下一次攻擊並反擊；平常有 15% 機率爆擊',
    desc: '攻擊最高、血最少。被改過一百次稿，早就練成了閃避。',
  },
};

export const SKILL_COOLDOWN = 3;

export type Rarity = 'common' | 'fine' | 'rare';

export const RARITY_MARK: Record<Rarity, string> = { common: '', fine: '◆', rare: '★' };

export interface ItemDef {
  id: ItemId;
  name: string;
  /** 0 表示買不到（任務獎勵或掉落） */
  price: number;
  kind: 'consumable' | 'weapon' | 'armor';
  rarity: Rarity;
  /** 恢復精力（雙份濃縮） */
  energy?: number;
  /** 打倒前一章 Boss 之後商店才會上架（2 = 第一章 Boss、3 = 第二章 Boss） */
  chapter?: 2 | 3;
  heal?: number;
  atk?: number;
  def?: number;
  desc: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  coffee: { id: 'coffee', name: '美式咖啡', price: 10, kind: 'consumable', rarity: 'common', heal: 15, desc: '回復 15 HP。上班族的血液。' },
  boba: { id: 'boba', name: '珍奶', price: 25, kind: 'consumable', rarity: 'common', heal: 35, desc: '回復 35 HP。全糖去冰。' },
  espresso: {
    id: 'espresso',
    name: '雙份濃縮',
    price: 40,
    kind: 'consumable',
    rarity: 'common',
    energy: 5,
    desc: '立刻恢復 5 點精力。喝完會覺得自己還可以再巡一層樓。',
  },
  keyboard: { id: 'keyboard', name: '機械鍵盤', price: 40, kind: 'weapon', rarity: 'common', atk: 3, desc: '攻擊 +3。青軸，敲起來很有氣勢。' },
  laser: { id: 'laser', name: '雷射筆', price: 120, kind: 'weapon', rarity: 'common', atk: 6, desc: '攻擊 +6。簡報時指誰誰就閉嘴。' },
  hoodie: { id: 'hoodie', name: '連帽 T', price: 35, kind: 'armor', rarity: 'common', def: 2, desc: '防禦 +2。帽子一戴，誰都不認識你。' },
  headphones: { id: 'headphones', name: '降噪耳機', price: 110, kind: 'armor', rarity: 'common', def: 4, desc: '防禦 +4。物理上與精神上的隔離。' },
  energy: {
    id: 'energy',
    name: '能量飲',
    price: 45,
    kind: 'consumable',
    rarity: 'fine',
    chapter: 2,
    heal: 60,
    desc: '回復 60 HP。喝完心跳會變成 4/4 拍。',
  },
  monitors: { id: 'monitors', name: '雙螢幕', price: 320, kind: 'weapon', rarity: 'fine', chapter: 2, atk: 10, desc: '攻擊 +10。一邊開會，一邊做事。' },
  'nc-pro': { id: 'nc-pro', name: '降噪 Pro 耳機', price: 300, kind: 'armor', rarity: 'fine', chapter: 2, def: 7, desc: '防禦 +7。連主管叫你都聽不到。' },
  bento: { id: 'bento', name: '阿桂姨的愛心便當', price: 0, kind: 'consumable', rarity: 'rare', heal: 90, desc: '回復 90 HP。滷蛋是兩顆。' },
  'ctrl-z': { id: 'ctrl-z', name: '傳說中的 Ctrl+Z', price: 0, kind: 'weapon', rarity: 'rare', atk: 15, desc: '攻擊 +15。可以讓一切回到昨天。只會從怪物身上掉落。' },
  'camera-off': {
    id: 'camera-off',
    name: '視訊關鏡頭',
    price: 0,
    kind: 'armor',
    rarity: 'rare',
    def: 11,
    desc: '防禦 +11。沒有人知道你其實穿著睡衣。只會從怪物身上掉落。',
  },
  'super-energy': {
    id: 'super-energy',
    name: '超級能量飲',
    price: 90,
    kind: 'consumable',
    rarity: 'fine',
    chapter: 3,
    heal: 120,
    desc: '回復 120 HP。罐子上寫著「一天限一罐」，沒有人遵守。',
  },
  pto: {
    id: 'pto',
    name: '特休假單',
    price: 150,
    kind: 'consumable',
    rarity: 'fine',
    chapter: 3,
    desc: '帶在身上就好。季末吞噬你的回合時，會自動亮出來擋住一次。',
  },
  workstation: { id: 'workstation', name: '三螢幕工作站', price: 900, kind: 'weapon', rarity: 'fine', chapter: 3, atk: 20, desc: '攻擊 +20。左邊開會、中間寫扣、右邊看股票。' },
  'ergo-chair': { id: 'ergo-chair', name: '人體工學椅', price: 850, kind: 'armor', rarity: 'fine', chapter: 3, def: 15, desc: '防禦 +15。坐上去之後，腰就是你的了。' },
  vimrc: { id: 'vimrc', name: '祖傳的 Vim 設定檔', price: 0, kind: 'weapon', rarity: 'rare', atk: 26, desc: '攻擊 +26。沒有人知道怎麼離開它。只會從地下樓層的怪物身上掉落。' },
  'remote-permit': {
    id: 'remote-permit',
    name: '永久遠端工作許可',
    price: 0,
    kind: 'armor',
    rarity: 'rare',
    def: 19,
    desc: '防禦 +19。傳說中的文件，持有者可以永遠不用進辦公室。只會從地下樓層的怪物身上掉落。',
  },
  firewall: { id: 'firewall', name: 'KPI-9000 的防火牆', price: 0, kind: 'armor', rarity: 'rare', def: 10, desc: '防禦 +10。KPI-9000 送的。它說這是「信任的證明」。' },
};

export const SHOP_ITEMS: ItemId[] = [
  'coffee',
  'boba',
  'espresso',
  'energy',
  'super-energy',
  'pto',
  'keyboard',
  'hoodie',
  'laser',
  'headphones',
  'monitors',
  'nc-pro',
  'workstation',
  'ergo-chair',
];

/** 第二章的稀有掉落 */
export const RARE_DROPS: ItemId[] = ['ctrl-z', 'camera-off'];
/** 第三章（地下樓層）的稀有掉落 */
export const RARE_DROPS_CH3: ItemId[] = ['vimrc', 'remote-permit'];
export const DROP_CHANCE = 0.06;

/** 道具名稱加上稀有度記號 */
export function itemLabel(id: ItemId): string {
  return `${RARITY_MARK[ITEMS[id].rarity]}${ITEMS[id].name}`;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  hp: number;
  atk: number;
  def: number;
  exp: number;
  gold: number;
  intro: string;
  attacks: string[];
  defeat: string;
  boss?: boolean;
  /** 只在夜間（台灣時間 19:00~07:00）出現 */
  night?: boolean;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  todo: {
    id: 'todo',
    name: '未命名的 TODO',
    hp: 8,
    atk: 3,
    def: 0,
    exp: 5,
    gold: 3,
    intro: '一行「// TODO: 之後再修」從程式碼裡爬了出來。它已經在這裡三年了。',
    attacks: ['TODO 提醒你它還沒被修。', 'TODO 複製了自己一份。'],
    defeat: 'TODO 終於被修掉了。git log 寫著：「fix: 終於」。',
  },
  'merge-slime': {
    id: 'merge-slime',
    name: '合併衝突史萊姆',
    hp: 10,
    atk: 3,
    def: 1,
    exp: 6,
    gold: 4,
    intro: '一團寫滿「<<<<<<< HEAD」的黏液擋住了走道。',
    attacks: ['史萊姆把你的修改和同事的修改黏在一起。', '史萊姆噴出一串「>>>>>>>」。'],
    defeat: '史萊姆被 resolve 了。兩邊的修改都留下來了，大概吧。',
  },
  alert: {
    id: 'alert',
    name: '凌晨三點的告警',
    hp: 12,
    atk: 4,
    def: 1,
    exp: 8,
    gold: 6,
    intro: '手機突然震動。螢幕上寫著：「[CRITICAL] 03:00 CPU 100%」。',
    attacks: ['告警又響了一次。', '告警把你從夢裡拖出來。'],
    defeat: '告警被設成「已確認」。世界恢復安靜。',
  },
  'ghost-client': {
    id: 'ghost-client',
    name: '已讀不回的客戶',
    hp: 16,
    atk: 5,
    def: 1,
    exp: 10,
    gold: 10,
    intro: '一個半透明的身影飄過來，頭上顯示著「已讀」。',
    attacks: ['客戶已讀了你的訊息。然後沒有回。', '客戶回了一個「？」。'],
    defeat: '客戶終於回覆了：「好的，那就這樣。」它化成一張簽好的合約。',
  },
  'quota-ghost': {
    id: 'quota-ghost',
    name: '業績目標幽靈',
    hp: 18,
    atk: 6,
    def: 2,
    exp: 12,
    gold: 12,
    intro: '白板上的數字自己長了出來，變成一個寫著「+30% YoY」的幽靈。',
    attacks: ['幽靈把目標往上調了 10%。', '幽靈在你耳邊說：「還差一點點。」'],
    defeat: '幽靈達標之後就消失了。下個月它會再來，而且更大。',
  },
  'quote-twins': {
    id: 'quote-twins',
    name: '報價單雙胞胎',
    hp: 20,
    atk: 5,
    def: 3,
    exp: 13,
    gold: 12,
    intro: '兩份長得一模一樣的報價單，一份叫「final」，一份叫「final_v2_真的最終版」。',
    attacks: ['雙胞胎互換了位置，你搞不清楚哪份才是最新的。', '其中一份寄給了客戶。是錯的那份。'],
    defeat: '你把兩份合成「final_v3」。勝利，但你知道這不是結束。',
  },
  'email-meeting': {
    id: 'email-meeting',
    name: '可以寫成 email 的會議',
    hp: 26,
    atk: 7,
    def: 3,
    exp: 18,
    gold: 16,
    intro: '一封會議邀請自己打開了。主旨：「快速對焦一下（1 小時）」。',
    attacks: ['會議請大家輪流自我介紹。', '會議說：「我們先對齊一下背景。」'],
    defeat: '會議化成一封三行的 email。早就該這樣了。',
  },
  projector: {
    id: 'projector',
    name: '投影機連不上',
    hp: 24,
    atk: 8,
    def: 2,
    exp: 18,
    gold: 15,
    intro: '天花板上的投影機閃著藍光：「無訊號」。所有人都看著你。',
    attacks: ['投影機要求你換一條 HDMI 線。', '投影機顯示：「解析度不支援」。'],
    defeat: '你拔掉再插回去。它好了。沒有人知道為什麼。',
  },
  'agenda-3': {
    id: 'agenda-3',
    name: '議程第三項',
    hp: 30,
    atk: 7,
    def: 4,
    exp: 22,
    gold: 18,
    intro: '它是所有會議永遠討論不到的那一項。今天它決定自己來找你。',
    attacks: ['議程第三項被移到了下次會議。它變得更強了。', '議程第三項說：「這個我們會後再聊。」'],
    defeat: '你終於討論到了議程第三項。結論是：再開一次會。',
  },
  'weekly-meeting': {
    id: 'weekly-meeting',
    name: '無限延長的週會',
    hp: 120,
    atk: 11,
    def: 5,
    exp: 60,
    gold: 80,
    boss: true,
    intro: '大會議室的門自動關上了。白板上寫著：「週會（預計 30 分鐘）」。牆上的時鐘已經顯示「第 4 小時」。',
    attacks: ['週會進入「各部門報告」環節。', '週會說：「最後一點，很快。」', '週會讓每個人都發表一下意見。'],
    defeat: '週會終於說出了那句話：「那今天就先到這裡。」大會議室的燈亮了起來。',
  },
  'urgent-deck': {
    id: 'urgent-deck',
    name: '急件簡報',
    hp: 38,
    atk: 16,
    def: 7,
    exp: 16,
    gold: 22,
    intro: '一份檔名叫「明天要（急）.pptx」的簡報從印表機裡飄出來。',
    attacks: ['簡報要求你把字放大，但頁數不能變多。', '簡報自動套用了一個你沒看過的範本。'],
    defeat: '簡報終於定稿了。檔名變成「明天要（急）_final.pptx」。',
  },
  'one-more-version': {
    id: 'one-more-version',
    name: '再改一版',
    hp: 40,
    atk: 15,
    def: 8,
    exp: 17,
    gold: 22,
    intro: '它長得跟上一版一模一樣。它說：「感覺不太對，再改一版。」',
    attacks: ['再改一版說：「可以再活潑一點，但要穩重。」', '再改一版把顏色從藍色改成「比較不藍的藍色」。'],
    defeat: '你交出第 8 版。對方選了第 1 版。勝利，某種程度上。',
  },
  'trend-report': {
    id: 'trend-report',
    name: '年度趨勢報告',
    hp: 42,
    atk: 16,
    def: 7,
    exp: 18,
    gold: 26,
    intro: '一份 120 頁的趨勢報告擋住去路。第一頁寫著：「今年的關鍵字是 AI」。',
    attacks: ['報告引用了一個你沒聽過的「業界專家」。', '報告畫了一條一路往上的曲線。'],
    defeat: '你把 120 頁濃縮成一句話：「明年的關鍵字也是 AI」。',
  },
  'midnight-post': {
    id: 'midnight-post',
    name: '半夜的品牌貼文',
    hp: 48,
    atk: 19,
    def: 8,
    exp: 26,
    gold: 38,
    night: true,
    intro: '🌙 凌晨十二點，一則還沒排程的貼文在螢幕上發光：「各位晚安！」',
    attacks: ['貼文被留言「小編還沒下班喔？」', '貼文的 hashtag 打錯了，已經有三百個人轉發。'],
    defeat: '貼文排程成功，明早九點發出。你終於可以關電腦了。',
  },
  unbalanced: {
    id: 'unbalanced',
    name: '對不起來的帳',
    hp: 46,
    atk: 19,
    def: 8,
    exp: 20,
    gold: 28,
    intro: '試算表右下角閃著紅字：「差額：NT$ 1」。就差一塊錢。',
    attacks: ['帳目又差了一塊錢，換了一個位置。', '帳把你的小數點往右移了一位。'],
    defeat: '你找到那一塊錢了。它在三個月前的一張計程車收據上。',
  },
  'month-end': {
    id: 'month-end',
    name: '月結地獄',
    hp: 50,
    atk: 20,
    def: 8,
    exp: 22,
    gold: 30,
    intro: '日曆翻到了 30 號。整層樓的人突然都不說話了。',
    attacks: ['月結要求你今天下班前交出所有憑證。', '月結把截止時間提前了一天。'],
    defeat: '帳關了。財務部的人第一次笑了。',
  },
  'receipt-pile': {
    id: 'receipt-pile',
    name: '報帳單據山',
    hp: 52,
    atk: 18,
    def: 9,
    exp: 23,
    gold: 32,
    intro: '一座由發票、收據和便利商店小白單疊成的小山動了起來。',
    attacks: ['一張感熱紙收據已經褪色到看不見了。', '單據山說：「這張沒有統編。」'],
    defeat: '你一張一張貼好、蓋章、送簽。山崩了，變成一份整齊的報帳單。',
  },
  'audit-ghost': {
    id: 'audit-ghost',
    name: '稽核前夜的幽靈',
    hp: 60,
    atk: 23,
    def: 9,
    exp: 33,
    gold: 48,
    night: true,
    intro: '🌙 明天會計師要來查帳。一個抱著檔案夾的幽靈在走廊上飄來飄去。',
    attacks: ['幽靈翻出一張去年的傳票：「這張的附件呢？」', '幽靈在你耳邊說：「抽樣。」'],
    defeat: '幽靈確認所有憑證都齊了，安心地消失了。',
  },
  'clause-37': {
    id: 'clause-37',
    name: '條款第 37 條',
    hp: 56,
    atk: 22,
    def: 10,
    exp: 25,
    gold: 34,
    intro: '合約第 37 條從紙上站了起來：「本條款之解釋，以甲方為準。」',
    attacks: ['第 37 條引用了第 12 條，第 12 條又引用了第 37 條。', '第 37 條加了一句「但不限於」。'],
    defeat: '你在第 37 條後面加上「雙方另議」。它不甘願地坐回紙上。',
  },
  nda: {
    id: 'nda',
    name: '保密協議',
    hp: 58,
    atk: 21,
    def: 10,
    exp: 26,
    gold: 36,
    intro: '一份保密協議擋在前面。它不能告訴你它為什麼擋在這裡。',
    attacks: ['保密協議對你說：「這個我不能說。」', '保密協議要求你簽名之後才能看內容。'],
    defeat: '協議到期了。它終於可以說出它的秘密：「其實沒什麼秘密。」',
  },
  'annex-4': {
    id: 'annex-4',
    name: '附件四之三',
    hp: 62,
    atk: 22,
    def: 9,
    exp: 28,
    gold: 38,
    intro: '主約只有 3 頁。附件四之三有 87 頁。它來了。',
    attacks: ['附件四之三翻到了附件四之三之一。', '附件四之三的字小到需要放大鏡。'],
    defeat: '你讀完了附件四之三。全世界大概只有你讀完過。',
  },
  redline: {
    id: 'redline',
    name: '紅線修訂版',
    hp: 70,
    atk: 26,
    def: 11,
    exp: 40,
    gold: 56,
    night: true,
    intro: '🌙 晚上十一點，對方律師寄來新版合約。整份文件都是紅色的。',
    attacks: ['紅線把你上一版的修改又改了回去。', '紅線在每一頁都加了一個註解：「請再確認」。'],
    defeat: '你按下「接受所有修訂」。文件終於變回黑色了。',
  },
  'reboot-loop': {
    id: 'reboot-loop',
    name: '無限重開機',
    hp: 66,
    atk: 25,
    def: 11,
    exp: 30,
    gold: 40,
    intro: '一台主機開機、出現 logo、然後又重新開機。它已經這樣三天了。',
    attacks: ['主機重開機了。你的進度不見了。', '主機顯示：「正在安裝更新 1/247」。'],
    defeat: '你拔掉了那顆不知道誰插的隨身碟。它終於開機了。',
  },
  bsod: {
    id: 'bsod',
    name: '藍色畫面',
    hp: 70,
    atk: 24,
    def: 12,
    exp: 32,
    gold: 42,
    intro: '整面牆的螢幕突然變成藍色，上面只有一個哭臉。',
    attacks: ['藍色畫面顯示了一串沒人看得懂的錯誤代碼。', '藍色畫面說：「正在收集錯誤資訊……0%」。'],
    defeat: '你查到了錯誤代碼的意思：「發生錯誤」。總之它好了。',
  },
  'legacy-ie': {
    id: 'legacy-ie',
    name: '舊版瀏覽器',
    hp: 72,
    atk: 25,
    def: 11,
    exp: 34,
    gold: 44,
    intro: '一個藍色的 e 字從角落的老電腦裡飄出來。內部系統只支援它。',
    attacks: ['舊版瀏覽器跳出一個 ActiveX 安裝提示。', '舊版瀏覽器把你的版面排版全部打亂。'],
    defeat: '你在系統公告上寫：「本系統已支援新版瀏覽器」。它安息了。',
  },
  pager: {
    id: 'pager',
    name: '半夜的 on-call 呼叫器',
    hp: 80,
    atk: 29,
    def: 12,
    exp: 47,
    gold: 64,
    night: true,
    intro: '🌙 凌晨三點，值班手機響了。螢幕上寫著：「P0：全部掛了」。',
    attacks: ['呼叫器又響了一次，這次是 P0+。', '呼叫器把你拉進一個有四十個人的事故頻道。'],
    defeat: '你寫完事故報告的最後一句：「已加入監控，未來不會再發生」。天亮了。',
  },
  'airdrop-project': {
    id: 'airdrop-project',
    name: '凌晨兩點的空降專案',
    hp: 320,
    atk: 28,
    def: 14,
    exp: 300,
    gold: 400,
    boss: true,
    intro: '董事長室的門打開了。裡面沒有人，只有一份專案企劃書浮在半空中。封面寫著：「明天早上要」。',
    attacks: ['空降專案說：「這個很簡單，應該半天就好。」', '空降專案追加了一個「小小的」需求。', '空降專案說：「老闆很重視這個案子。」'],
    defeat: '專案終於結案了。企劃書在你面前慢慢燒成灰，灰燼裡有一張卡片。',
  },
  'lost-car': {
    id: 'lost-car',
    name: '永遠找不到的車位',
    hp: 90,
    atk: 32,
    def: 15,
    exp: 40,
    gold: 50,
    intro: '你明明記得車停在 B3。但這裡每一根柱子都寫著 B3。',
    attacks: ['車位又往前移了一格。', '遠方傳來你車子的防盜器聲，但你找不到它。'],
    defeat: '你終於找到了。車位號碼是 B3-127，你把它拍下來，發誓下次一定記得。',
  },
  'parking-meter': {
    id: 'parking-meter',
    name: '停車費計時器',
    hp: 95,
    atk: 33,
    def: 14,
    exp: 42,
    gold: 52,
    intro: '一台繳費機的螢幕亮起：「您已停車 72 小時，應繳金額：NT$ 4,320」。',
    attacks: ['計時器跳了一格，又多 30 元。', '繳費機說：「本機不收紙鈔」。'],
    defeat: '你出示了員工停車證。計時器沉默地歸零了。',
  },
  'flicker-light': {
    id: 'flicker-light',
    name: '閃爍的日光燈',
    hp: 100,
    atk: 31,
    def: 16,
    exp: 44,
    gold: 54,
    intro: '頭上的日光燈開始閃。亮、暗、亮、暗……你的眼睛開始痛了。',
    attacks: ['燈管發出「滋滋」聲，你的頭更痛了。', '燈完全暗掉三秒，再突然亮起來。'],
    defeat: '你報修了。總務說三個工作天內處理。它在你走之前就自己好了。',
  },
  'tow-king': {
    id: 'tow-king',
    name: '拖吊車之王',
    hp: 260,
    atk: 38,
    def: 18,
    exp: 160,
    gold: 200,
    boss: true,
    intro: 'B4 的盡頭停著一台巨大的拖吊車。車斗上掛著幾十台被拖走的機車。它的大燈亮了起來。',
    attacks: ['拖吊車把你的機車吊了起來。', '拖吊車開出一張罰單，金額是你的日薪。', '拖吊車倒車，嗶——嗶——嗶——'],
    defeat: '拖吊車熄火了。車斗上掉下一張樓梯間的門禁卡，上面寫著「B5」。',
  },
  'old-contract': {
    id: 'old-contract',
    name: '十年前的合約',
    hp: 110,
    atk: 36,
    def: 17,
    exp: 48,
    gold: 58,
    intro: '一份泛黃的合約從檔案櫃裡爬出來。它還沒過期，而且自動續約了十次。',
    attacks: ['合約翻到「自動續約」那一條。', '合約說：「本合約終止需於三個月前書面通知」。'],
    defeat: '你找到了終止條款，寄出存證信函。合約終於安息了。',
  },
  'biting-binder': {
    id: 'biting-binder',
    name: '會咬人的資料夾',
    hp: 115,
    atk: 37,
    def: 16,
    exp: 50,
    gold: 60,
    intro: '一個藍色的 D 型環資料夾張開嘴巴。裡面的環已經生鏽了。',
    attacks: ['資料夾咬住了你的手指。', '資料夾吐出兩百張沒有編號的文件。'],
    defeat: '你把資料夾的環扳開，文件歸檔完畢。它終於不咬人了。',
  },
  'jammed-shredder': {
    id: 'jammed-shredder',
    name: '卡紙的碎紙機',
    hp: 120,
    atk: 35,
    def: 18,
    exp: 52,
    gold: 62,
    intro: '碎紙機發出痛苦的聲音。它吃了一份 300 頁的報告，現在吐不出來也吞不下去。',
    attacks: ['碎紙機倒轉，把碎紙噴到你臉上。', '碎紙機咬住了你的識別證掛繩。'],
    defeat: '你按住倒退鍵十秒。碎紙機咳出最後一張紙，上面寫著「機密」。',
  },
  archivist: {
    id: 'archivist',
    name: '被遺忘的檔案管理員',
    hp: 300,
    atk: 42,
    def: 20,
    exp: 200,
    gold: 240,
    boss: true,
    intro: 'B8 最深處坐著一個人影，抱著一疊卡片目錄。它說：「我在這裡整理了二十年。沒有人來借過任何東西。」',
    attacks: ['檔案管理員說：「這份文件要填調閱申請。」', '檔案管理員把你歸檔到「待處理」。', '檔案管理員用卡片目錄砸你。'],
    defeat: '「謝謝你……終於有人來了。」它把一張寫著「B9」的鑰匙放在你手上，然後慢慢變成一張索引卡。',
  },
  'zombie-process': {
    id: 'zombie-process',
    name: '殭屍程序',
    hp: 130,
    atk: 40,
    def: 19,
    exp: 56,
    gold: 66,
    intro: '一個 PID 不斷跳動的程序從機櫃裡爬出來。它已經死了，但父程序不肯收屍。',
    attacks: ['殭屍程序佔住了你的 PID。', '殭屍程序咬了你一口，你的記憶體少了 4KB。'],
    defeat: '你找到它的父程序，送了一個 SIGCHLD。它終於被回收了。',
  },
  'y2k-bug': {
    id: 'y2k-bug',
    name: '千禧蟲',
    hp: 135,
    atk: 41,
    def: 20,
    exp: 58,
    gold: 68,
    intro: '一隻寫著「99」的蟲從老舊的報表程式裡爬出來。它以為現在是 1900 年。',
    attacks: ['千禧蟲把你的年資算成負 126 年。', '千禧蟲把所有日期都變成 01/01/00。'],
    defeat: '你把年份欄位從兩位數改成四位數。它在 2000 年就該死了。',
  },
  'two-am-cron': {
    id: 'two-am-cron',
    name: '半夜兩點的排程',
    hp: 140,
    atk: 42,
    def: 19,
    exp: 60,
    gold: 70,
    intro: '一行 crontab 亮了起來：「0 2 * * *」。沒有人知道它在做什麼，但沒有人敢刪掉它。',
    attacks: ['排程在凌晨兩點準時寄了一封信給全公司。', '排程把磁碟塞滿了 log。'],
    defeat: '你在那行前面加了一個「#」。世界沒有毀滅。你鬆了一口氣。',
  },
  mainframe: {
    id: 'mainframe',
    name: '大型主機',
    hp: 340,
    atk: 46,
    def: 22,
    exp: 240,
    gold: 280,
    boss: true,
    intro: 'B12 的中央立著一台比人還高的大型主機。綠色的字在螢幕上滾動：「SYSTEM READY. 1987.」',
    attacks: ['大型主機吐出一卷印滿數字的報表紙。', '大型主機說：「請插入第 2 片磁片」。', '主機的磁帶機瘋狂轉動，噪音震耳欲聾。'],
    defeat: '你按下那顆紅色的大按鈕。主機的燈一盞一盞熄滅。最後一行字是：「B13 ACCESS GRANTED.」',
  },
  kimatsu: {
    id: 'kimatsu',
    name: '季末',
    hp: 850,
    atk: 48,
    def: 24,
    exp: 800,
    gold: 1000,
    boss: true,
    intro: '機房深處的冷氣忽然停了。黑暗中睜開兩隻眼睛，每隻都像一個倒數計時器：「距離季末還有 0 天」。牠醒了。',
    attacks: ['季末吐出一口火，你的行事曆燒掉了一整週。', '季末甩動尾巴，掃落了一整排的待辦事項。', '季末咆哮：「結算！結算！結算！」'],
    defeat: '季末倒下了。牠咳了幾聲，吐出一張閃閃發光的卡片。',
  },
};

export interface RoomDef {
  id: RoomId;
  floor: string;
  title: string;
  desc: string[];
  enemies?: EnemyId[];
  /** 夜間才會出現的怪物 */
  nightEnemies?: EnemyId[];
  /** 夜間的額外描述 */
  nightDesc?: string;
}

export const ROOMS: Record<RoomId, RoomDef> = {
  lobby: {
    id: 'lobby',
    floor: '1F',
    title: '1F 大廳',
    desc: [
      '自動門開開關關，冷氣強得像冰箱。',
      '左邊是便利商店，右邊是公告欄，保全大叔坐在櫃台後面打瞌睡。',
      '電梯的樓層按鈕從 1 到 12，最下面還有一顆灰色的 B13。',
    ],
  },
  store: {
    id: 'store',
    floor: '1F',
    title: '1F 便利商店',
    desc: ['冷藏櫃嗡嗡作響。店員頭也不抬：「歡迎光臨。」', '架上的東西似乎都跟「撐過今天」有關。'],
  },
  pantry: {
    id: 'pantry',
    floor: '2F',
    title: '2F 茶水間',
    desc: ['咖啡機咕嚕咕嚕地響，旁邊有一張看起來很好睡的沙發。', '阿桂姨正在整理餅乾，一邊哼著歌。'],
  },
  eng: {
    id: 'eng',
    floor: '3F',
    title: '3F 工程部',
    desc: ['一排排螢幕發出藍光，空氣中瀰漫著冷掉的咖啡味。', '角落有人在對著小黃鴨自言自語。'],
    enemies: ['todo', 'merge-slime', 'alert'],
  },
  sales: {
    id: 'sales',
    floor: '5F',
    title: '5F 業務部',
    desc: ['電話聲此起彼落，白板上的業績數字閃閃發光。', '每個人都在笑，但眼睛沒有在笑。'],
    enemies: ['ghost-client', 'quota-ghost', 'quote-twins'],
  },
  meeting: {
    id: 'meeting',
    floor: '7F',
    title: '7F 會議室樓層',
    desc: [
      '走廊兩側全是會議室，每一間的門口都寫著「使用中」。',
      '走廊盡頭是一扇厚重的門：「大會議室」。門縫裡傳出永不停止的說話聲。',
    ],
    enemies: ['email-meeting', 'projector', 'agenda-3'],
  },
  'boss-room': {
    id: 'boss-room',
    floor: '7F',
    title: '7F 大會議室',
    desc: ['長桌、白板、一台永遠在投影「Agenda」的投影機。', '這裡的時間好像停住了。'],
  },
  elevator: {
    id: 'elevator',
    floor: '電梯',
    title: '電梯',
    desc: ['電梯裡放著輕音樂。鏡子裡的你看起來有點累。'],
  },
  mkt: {
    id: 'mkt',
    floor: '8F',
    title: '8F 行銷部',
    desc: ['牆上貼滿了被退件的海報，每一張都比上一張更「有質感」。', '白板上寫著：「本週主題：讓品牌更有溫度」。'],
    enemies: ['urgent-deck', 'one-more-version', 'trend-report'],
    nightEnemies: ['midnight-post'],
    nightDesc: '夜深了，只剩小編的螢幕還亮著。',
  },
  fin: {
    id: 'fin',
    floor: '9F',
    title: '9F 財務部',
    desc: ['計算機的按鍵聲像下雨一樣。每張桌子上都有一疊比人還高的單據。', '印表機旁邊有一台很舊的影印機，後面好像卡著什麼東西。'],
    enemies: ['unbalanced', 'month-end', 'receipt-pile'],
    nightEnemies: ['audit-ghost'],
    nightDesc: '走廊盡頭傳來翻檔案的聲音，但那裡沒有人。',
  },
  legal: {
    id: 'legal',
    floor: '10F',
    title: '10F 法務部',
    desc: ['這層樓安靜得連冷氣聲都很清楚。每一份文件都有三個版本。', '牆上掛著一幅字：「以上皆為參考，以實際合約為準」。'],
    enemies: ['clause-37', 'nda', 'annex-4'],
    nightEnemies: ['redline'],
    nightDesc: '對方律師所在的時區，現在是上班時間。',
  },
  it: {
    id: 'it',
    floor: '11F',
    title: '11F 資訊部',
    desc: ['伺服器的風扇聲很吵，地板上爬滿了網路線。', '角落有一台會說話的終端機，螢幕上寫著：KPI-9000。'],
    enemies: ['reboot-loop', 'bsod', 'legacy-ie'],
    nightEnemies: ['pager'],
    nightDesc: '值班的人趴在鍵盤上睡著了，手機螢幕還亮著。',
  },
  'b-parking': {
    id: 'b-parking',
    floor: 'B1~B4',
    title: 'B1~B4 地下停車場',
    desc: ['一排排機車和汽車安靜地停著，空氣裡有汽油和潮濕的味道。', '樓梯間的門上貼著：「往下：B5 檔案室（需門禁卡）」。B4 的盡頭停著一台巨大的拖吊車。'],
    enemies: ['lost-car', 'parking-meter', 'flicker-light'],
  },
  'b-archive': {
    id: 'b-archive',
    floor: 'B5~B8',
    title: 'B5~B8 檔案室',
    desc: ['一排又一排的鐵櫃延伸到看不見的地方。每個抽屜都貼著標籤：「2009 年度 · 其他」。', 'B8 最深處有微弱的檯燈光。'],
    enemies: ['old-contract', 'biting-binder', 'jammed-shredder'],
  },
  'b-server': {
    id: 'b-server',
    floor: 'B9~B12',
    title: 'B9~B12 舊機房',
    desc: ['老舊的機櫃發出低沉的嗡嗡聲。有些伺服器的開機時間顯示：「6,742 天」。', '樓梯繼續往下。最底下的那扇門上，用紅漆寫著「B13」。'],
    enemies: ['zombie-process', 'y2k-bug', 'two-am-cron'],
  },
  b13: {
    id: 'b13',
    floor: 'B13',
    title: 'B13 機房 · 龍的巢穴',
    desc: ['冷氣強到可以看見自己的呼吸。地上散落著無數本被啃過的行事曆。', '機房最深處，有什麼巨大的東西在呼吸。每一次呼氣，牆上的日曆就翻過一頁。'],
  },
  exec: {
    id: 'exec',
    floor: '12F',
    title: '12F 董事長室',
    desc: ['紅色地毯一路鋪到一扇厚重的木門前。', '門縫透出燈光。保全大叔說得沒錯，這盞燈從來沒有關過。'],
  },
};

export interface FloorDef {
  label: string;
  room: RoomId | null;
  /** 需要的旗標（例如打倒第一章 Boss 的 boss1）；沒有就是鎖住 */
  requires?: string;
  locked?: string;
  /** 對應的開放段落（見 releases.ts）；還沒開放時鎖住 */
  release?: 'ch3' | 'finale';
}

const CH2_LOCKED = '8F 以上的按鈕貼著一張便條：「7F 週會結束前，不開放」。先去解決大會議室的那場週會吧。';

/** 電梯按鈕 */
export const FLOORS: FloorDef[] = [
  { label: '1F 大廳', room: 'lobby' },
  { label: '2F 茶水間', room: 'pantry' },
  { label: '3F 工程部', room: 'eng' },
  { label: '5F 業務部', room: 'sales' },
  { label: '7F 會議室', room: 'meeting' },
  { label: '8F 行銷部', room: 'mkt', requires: 'boss1', locked: CH2_LOCKED },
  { label: '9F 財務部', room: 'fin', requires: 'boss1', locked: CH2_LOCKED },
  { label: '10F 法務部', room: 'legal', requires: 'boss1', locked: CH2_LOCKED },
  { label: '11F 資訊部', room: 'it', requires: 'boss1', locked: CH2_LOCKED },
  { label: '12F 董事長室', room: 'exec', requires: 'boss1', locked: CH2_LOCKED },
  {
    label: 'B1 停車場',
    room: 'b-parking',
    requires: 'card',
    release: 'ch3',
    locked: '你按了 B1。面板上顯示：「需要臨時權限卡」。也許 12 樓的事情解決之後，KPI-9000 有辦法。',
  },
  { label: 'B5 檔案室', room: 'b-archive', requires: 'mb1', release: 'ch3', locked: 'B5 的按鈕需要門禁卡。聽說 B4 的拖吊車上有一張。' },
  { label: 'B9 舊機房', room: 'b-server', requires: 'mb2', release: 'ch3', locked: 'B9 的按鈕需要鑰匙。檔案室最深處的那個人，也許知道在哪。' },
  {
    label: 'B13',
    room: 'b13',
    requires: 'mb3',
    release: 'finale',
    locked: '你按了 B13。按鈕亮了一下又熄掉，面板上顯示：「需要權限卡（3 片）」。',
  },
];

/** 章節 Boss */
export interface BossDef {
  room: RoomId;
  enemy: EnemyId;
  minLevel: number;
  flag: string;
  /** 進門後所在的房間 */
  arena: RoomId;
  button: string;
  tooLow: string;
  cleared: string;
}

export const BOSSES: BossDef[] = [
  {
    room: 'meeting',
    enemy: 'weekly-meeting',
    minLevel: BOSS_MIN_LEVEL,
    flag: 'boss1',
    arena: 'boss-room',
    button: '🚪 進入大會議室',
    tooLow: '門口的白板寫著：「與會資格：Lv{min} 以上」。你現在 Lv{lv}，再去練練吧。',
    cleared: '大會議室空蕩蕩的。白板上還留著一行字：「本次會議提早結束」。',
  },
  {
    room: 'exec',
    enemy: 'airdrop-project',
    minLevel: 9,
    flag: 'boss2',
    arena: 'exec',
    button: '🚪 敲董事長室的門',
    tooLow: '門上貼著：「Lv{min} 以上才能進入」。門縫裡傳來「這個很簡單」的聲音，你決定再練練。',
    cleared: '董事長室的燈關著。桌上有一張便條：「今天準時下班。」',
  },
  {
    room: 'b-parking',
    enemy: 'tow-king',
    minLevel: 11,
    flag: 'mb1',
    arena: 'b-parking',
    button: '🚚 走向 B4 的拖吊車',
    tooLow: '拖吊車的大燈照過來，你本能地退了一步。（建議 Lv{min} 以上，你現在 Lv{lv}）',
    cleared: 'B4 的盡頭空了。地上只剩一道長長的輪胎痕。',
  },
  {
    room: 'b-archive',
    enemy: 'archivist',
    minLevel: 12,
    flag: 'mb2',
    arena: 'b-archive',
    button: '🕯 走向 B8 的檯燈',
    tooLow: '檯燈下的人影抬起頭：「你的調閱權限不足。」（建議 Lv{min} 以上，你現在 Lv{lv}）',
    cleared: '檯燈還亮著，桌上整齊地放著一張索引卡：「已歸檔」。',
  },
  {
    room: 'b-server',
    enemy: 'mainframe',
    minLevel: 13,
    flag: 'mb3',
    arena: 'b-server',
    button: '🖥 走向 B12 的大型主機',
    tooLow: '主機的螢幕閃過一行字：「ACCESS LEVEL TOO LOW.」（建議 Lv{min} 以上，你現在 Lv{lv}）',
    cleared: '大型主機安靜地關機了。螢幕上留著最後一行：「B13 ACCESS GRANTED.」',
  },
  {
    room: 'b13',
    enemy: 'kimatsu',
    minLevel: 14,
    flag: 'dragon',
    arena: 'b13',
    button: '🐉 喚醒季末',
    tooLow: '黑暗中有一隻眼睛睜開了一條縫，又閉上了。牠還不把你當一回事。（建議 Lv{min} 以上，你現在 Lv{lv}）',
    cleared: '機房裡很安靜。冷氣恢復了運轉，牆上的日曆停在週五。',
  },
];

// ---------- 天賦（Lv5、7、9 各選一個） ----------

export interface PerkDef {
  tier: 5 | 7 | 9;
  choice: 1 | 2;
  name: string;
  desc: string;
}

export const PERKS: PerkDef[] = [
  { tier: 5, choice: 1, name: '咖啡因耐受', desc: '所有回血道具效果 +50%' },
  { tier: 5, choice: 2, name: '早鳥', desc: '每天精力上限 +5' },
  { tier: 7, choice: 1, name: '抗壓', desc: '最大 HP +15' },
  { tier: 7, choice: 2, name: '效率', desc: '技能冷卻少 1 回合' },
  { tier: 9, choice: 1, name: '升遷之路', desc: '攻擊 +4' },
  { tier: 9, choice: 2, name: '人脈', desc: '戰鬥金錢 +30%，巡邏更容易遇到好事' },
];

export const PERK_TIERS = [5, 7, 9] as const;

export const KPI_QUEST_KILLS = 5;

export const GUARD_LINES = [
  '保全大叔睜開一隻眼：「新來的？電梯那顆 B13 不要亂按啊。」',
  '保全大叔壓低聲音：「我在這裡顧了二十年。每到季末，B13 就會傳出打呼聲。那是龍，叫做『季末』。」',
  '保全大叔：「被季末吃掉週末的人，會慢慢變成辦公室裡的怪物。所以樓上才會有那些東西。」',
  '保全大叔：「聽說要湊齊三片權限卡碎片才進得去。其中一片……好像在 7 樓的大會議室裡。」',
  '保全大叔又睡著了。他的夢話是：「準時……下班……」',
];

export const GUARD_LINES_CH2 = [
  '保全大叔：「你把 7 樓的週會解決了？……年輕人，有你的。」',
  '保全大叔：「8 樓以上是加班樓層。那裡的人晚上都不回家，久了就變成那樣了。」',
  '保全大叔：「12 樓董事長室的燈，我顧了二十年，從來沒看它關過。第二片碎片，八成在那裡。」',
  '保全大叔：「11 樓有一台會說話的電腦，叫 KPI-9000。它什麼都知道，就是不太會聊天。」',
  '保全大叔：「晚上的 8 樓以上特別危險。但聽說晚上出沒的東西，掉的錢也比較多。」',
];

export const AUNTIE_LINES = [
  '阿桂姨：「唉唷，新來的喔？餓了就來茶水間，沙發隨便你躺。」',
  '阿桂姨：「我跟你講喔，3 樓的怪比較好打，先在那邊練一練。5 樓業務部的怪比較會掉錢啦。」',
  '阿桂姨：「便利商店的機械鍵盤很划算喔，我看工程部的人都在用。」',
  '阿桂姨：「7 樓那個大會議室，裡面的週會每三回合就會再延長一次，越拖越兇。記得多帶幾杯咖啡。」',
  '阿桂姨：「你說 B13 喔？……那個不能講啦。吃餅乾吃餅乾。」',
];

export const AUNTIE_QUEST = {
  give: '阿桂姨：「欸，你現在可以上 8 樓以上了喔？那拜託你一件事。我上禮拜去 9 樓財務部送餅乾，保溫杯忘在那裡了。杯子上有一個『桂』字。」',
  waiting: '阿桂姨：「保溫杯找到了嗎？應該在 9 樓財務部，可能在影印機那邊。」',
  found: '你在財務部那台舊影印機後面，找到一個印著「桂」字的保溫杯。裡面還有半杯菊花茶。',
  done: '阿桂姨接過保溫杯，眼睛都亮了：「就是這個！來，這兩個便當給你，滷蛋我多放了一顆。」',
};

export const KPI_LINES = {
  intro: [
    'KPI-9000：「偵測到未授權員工。……身分比對完成。你就是終結 7F 週會的那位。」',
    'KPI-9000：「我需要你的協助。10F 與 11F 出現大量異常程序，請協助稽核：打倒 5 個。」',
  ],
  progress: (n: number) => `KPI-9000：「稽核進度 ${n}/5。效率尚可。」`,
  done: [
    'KPI-9000：「稽核完成。效率：超出預期 23.7%。……謝謝你。」',
    'KPI-9000：「這是我的防火牆，送你。根據計算，第二片碎片在 12F 董事長室。第三片……在季末的肚子裡。」',
  ],
  after: [
    'KPI-9000：「你知道嗎？我一直想問人類一個問題：週末是什麼感覺？」',
    'KPI-9000：「季末每吃掉一個週末，我的監控名單就多一個人。我不喜歡這樣。」',
    'KPI-9000：「12F 的那份專案，每 4 回合就會變更一次需求。建議攜帶能量飲。」',
  ],
};

export const KPI_CH3 = {
  card: [
    'KPI-9000：「你讓 12F 的專案結案了。根據計算，現在是前往 B13 的最佳時機。」',
    'KPI-9000：「我用你的兩片碎片，做了一張臨時權限卡。電梯只能到 B1，剩下的路要走樓梯。B4、B8、B12 各有一個守門的東西。」',
    'KPI-9000：「第三片碎片在季末的肚子裡。……祝你好運。這是我第一次祝別人好運。」',
  ],
  locked: 'KPI-9000：「B13 的路線還在計算中。請稍後再來。」（第三章《B13》即將開放）',
};

export const GUARD_LINES_CH3 = [
  '保全大叔：「你要下去了？……我在這裡顧了二十年，只看過一個人下去過。他現在是董事長。」',
  '保全大叔：「B4 那台拖吊車，以前拖走過我的機車。幫我教訓它一下。」',
  '保全大叔：「季末最可怕的不是火，是牠會吃掉你的『回合』。帶幾張特休假單下去吧。」',
];

export const ENDINGS = {
  overtime: {
    id: 'end-overtime',
    choice: '⚔️ 給牠最後一擊',
    title: '結局一：準時下班',
    text: [
      '你舉起武器，給了季末最後一擊。牠化成無數張日曆紙，在機房裡飄散。',
      '隔天早上，雲頂大樓的每一個人都在 18:00 準時關上了電腦。8 樓以上的燈，第一次在晚上全部熄滅。',
      '保全大叔在大廳的公告欄上貼了一張紙：「今日加班人數：0」。',
    ],
  },
  weekend: {
    id: 'end-weekend',
    choice: '💬 問牠為什麼要吃週末',
    title: '結局二：季末的週末',
    text: [
      '季末沉默了很久，然後說：「因為……我從來沒有過週末。我一出生就是季末。」',
      '你帶牠搭電梯到 2F 茶水間。阿桂姨給了牠一塊餅乾。那是牠這輩子第一次休息。',
      '下一季開始，公司宣布每季最後一週放「季末假」。季末成了公司的吉祥物，每天在茶水間的沙發上睡午覺。',
    ],
  },
  schedule: {
    id: 'end-schedule',
    choice: '🤖 請 KPI-9000 接手',
    title: '結局三：新的排程',
    text: [
      'KPI-9000 的聲音從機房的喇叭傳出來：「交給我吧。」',
      '它幫季末寫了一個新的排程：每季睡 89 天，醒來 1 天，那天只負責吃掉「沒有人要開的會議」。',
      '至於 KPI-9000 自己——它把監控頻率調成每週一到週五。週六，它第一次關機了。它說，週末的感覺「超出預期 100%」。',
    ],
    requires: 'kpi',
  },
} as const;

export type EndingKey = keyof typeof ENDINGS;

export const CREDITS = [
  '【工作人員名單】',
  '主角 ............ 你',
  'AI 助理 ......... Mo',
  '保全 ............ 保全大叔',
  '總務 ............ 阿桂姨',
  '監控 ............ KPI-9000',
  '實習 ............ Intern-07',
  '龍 .............. 季末',
  '',
  '感謝所有在上班時間偷偷玩到這裡的人。',
  '記得按時下班。',
];

export interface PatrolEvent {
  text: string;
  gold?: number;
  heal?: number;
  item?: ItemId;
  exp?: number;
}

export const PATROL_EVENTS: PatrolEvent[] = [
  { text: '你在鍵盤底下找到一些零錢。', gold: 8 },
  { text: '阿凱經過，分了你一塊雞排。', heal: 10 },
  { text: '有人在印表機旁邊留了一杯沒開過的美式咖啡。你決定收下它。', item: 'coffee' },
  { text: 'Intern-07 跑來問你 git 怎麼用。你教了他二十分鐘，覺得自己成長了。', exp: 6 },
  { text: '你繞了一圈，什麼事都沒發生。這大概是今天最好的事。' },
];

export const GOSSIP = [
  '【八卦】聽說 12 樓董事長室的燈，已經連續三十天沒有關過。',
  '【公告】茶水間咖啡機已修復，請大家不要再對它說髒話。',
  '【八卦】有人在 B13 的電梯門口撿到一片龍鱗，結果是一張很舊的硬碟貼紙。',
  '【公告】本週五為「無會議日」。（註：週四會議延長至週五）',
  '【八卦】KPI-9000 最近好像在偷偷觀察某位員工。',
  '【公告】請勿在大會議室過夜。',
  '【八卦】9 樓財務部的影印機後面，好像卡著一個保溫杯。',
  '【公告】11F 資訊部提醒：請不要再問 KPI-9000「你今天好嗎」，它會當機。',
  '【八卦】有人說在 12F 聽到有人在念：「這個很簡單，應該半天就好。」',
];
