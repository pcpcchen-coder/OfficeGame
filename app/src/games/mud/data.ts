// 《B13 之龍》第一章「入職」的世界資料。全部原創，見 docs/03-mud-design.md。

export type ClassId = 'engineer' | 'sales' | 'designer';
export type RoomId = 'lobby' | 'store' | 'pantry' | 'eng' | 'sales' | 'meeting' | 'boss-room' | 'elevator';
export type ItemId = 'coffee' | 'boba' | 'keyboard' | 'laser' | 'hoodie' | 'headphones';
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
  | 'weekly-meeting';

export const MAX_ENERGY = 20;
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

export interface ItemDef {
  id: ItemId;
  name: string;
  price: number;
  kind: 'consumable' | 'weapon' | 'armor';
  heal?: number;
  atk?: number;
  def?: number;
  desc: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  coffee: { id: 'coffee', name: '美式咖啡', price: 10, kind: 'consumable', heal: 15, desc: '回復 15 HP。上班族的血液。' },
  boba: { id: 'boba', name: '珍奶', price: 25, kind: 'consumable', heal: 35, desc: '回復 35 HP。全糖去冰。' },
  keyboard: { id: 'keyboard', name: '機械鍵盤', price: 40, kind: 'weapon', atk: 3, desc: '攻擊 +3。青軸，敲起來很有氣勢。' },
  laser: { id: 'laser', name: '雷射筆', price: 120, kind: 'weapon', atk: 6, desc: '攻擊 +6。簡報時指誰誰就閉嘴。' },
  hoodie: { id: 'hoodie', name: '連帽 T', price: 35, kind: 'armor', def: 2, desc: '防禦 +2。帽子一戴，誰都不認識你。' },
  headphones: { id: 'headphones', name: '降噪耳機', price: 110, kind: 'armor', def: 4, desc: '防禦 +4。物理上與精神上的隔離。' },
};

export const SHOP_ITEMS: ItemId[] = ['coffee', 'boba', 'keyboard', 'hoodie', 'laser', 'headphones'];

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
};

export interface RoomDef {
  id: RoomId;
  floor: string;
  title: string;
  desc: string[];
  enemies?: EnemyId[];
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
    desc: ['電梯裡放著輕音樂。鏡子裡的你看起來有點累。', '按鈕：1F 大廳 · 2F 茶水間 · 3F 工程部 · 5F 業務部 · 7F 會議室 · 8F~12F（施工中）· B13（需要權限卡）'],
  },
};

/** 電梯按鈕 */
export const FLOORS: Array<{ label: string; room: RoomId | null; locked?: string }> = [
  { label: '1F 大廳', room: 'lobby' },
  { label: '2F 茶水間', room: 'pantry' },
  { label: '3F 工程部', room: 'eng' },
  { label: '5F 業務部', room: 'sales' },
  { label: '7F 會議室', room: 'meeting' },
  { label: '8F 🔒', room: null, locked: '8F 以上的按鈕貼著「施工中」。第二章《加班》即將開放。' },
  { label: 'B13 🔒', room: null, locked: '你按了 B13。按鈕亮了一下又熄掉，面板上顯示：「需要權限卡（3 片）」。' },
];

export const GUARD_LINES = [
  '保全大叔睜開一隻眼：「新來的？電梯那顆 B13 不要亂按啊。」',
  '保全大叔壓低聲音：「我在這裡顧了二十年。每到季末，B13 就會傳出打呼聲。那是龍，叫做『季末』。」',
  '保全大叔：「被季末吃掉週末的人，會慢慢變成辦公室裡的怪物。所以樓上才會有那些東西。」',
  '保全大叔：「聽說要湊齊三片權限卡碎片才進得去。其中一片……好像在 7 樓的大會議室裡。」',
  '保全大叔又睡著了。他的夢話是：「準時……下班……」',
];

export const AUNTIE_LINES = [
  '阿桂姨：「唉唷，新來的喔？餓了就來茶水間，沙發隨便你躺。」',
  '阿桂姨：「我跟你講喔，3 樓的怪比較好打，先在那邊練一練。5 樓業務部的怪比較會掉錢啦。」',
  '阿桂姨：「便利商店的機械鍵盤很划算喔，我看工程部的人都在用。」',
  '阿桂姨：「7 樓那個大會議室，裡面的週會每三回合就會再延長一次，越拖越兇。記得多帶幾杯咖啡。」',
  '阿桂姨：「你說 B13 喔？……那個不能講啦。吃餅乾吃餅乾。」',
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
];
