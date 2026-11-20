// G2 · 算力農場 mo-idle-turbo
// 你在後台開了一間迷你 AI 新創：GPU 自己產出 token，你負責升級、處理事故、發布新版本（轉生）。
// 離線也會累積，最多 8 小時（剛好一個工作天）。

import { Rng } from '../../engine/rng';
import type { Block, MoyuGame, Reply, StepContext, StepResult } from '../../engine/types';

export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
export const TUNE_COOLDOWN_MS = 20_000;
const GPU_RATE = 5; // 每張 GPU 每秒產出
const GPUS_PER_COOLING = 10;
const EVENT_MIN_GAP_MS = 2 * 60 * 1000;
const EVENT_CHANCE = 0.35;

export interface Buff {
  mult: number;
  until: number;
  label: string;
}

export interface IdleState {
  tokens: number;
  /** 這個版本累積的產出（決定能不能發布新版本） */
  earned: number;
  gpus: number;
  labelers: number;
  cooling: number;
  /** 模型聲望：每點永久 +10% 產出，發布新版本時取得 */
  prestige: number;
  version: number;
  lastTick: number;
  lastTune: number;
  lastEventAt: number;
  event: EventId | null;
  buff: Buff | null;
  rng: number;
}

// ---------- 數值 ----------

export const gpuCost = (s: IdleState) => Math.ceil(50 * 1.15 ** (s.gpus - 1));
export const labelerCost = (s: IdleState) => Math.ceil(200 * 1.5 ** s.labelers);
export const coolingCost = (s: IdleState) => Math.ceil(1000 * 3 ** (s.cooling - 1));
export const gpuCap = (s: IdleState) => s.cooling * GPUS_PER_COOLING;
export const releaseThreshold = (s: IdleState) => 50_000 * 4 ** (s.version - 1);
export const releaseGain = (s: IdleState) => Math.floor(Math.sqrt(s.earned / 10_000));

/** 不含暫時加成的每秒產出 */
export function baseRate(s: IdleState): number {
  return s.gpus * GPU_RATE * (1 + 0.1 * s.labelers) * (1 + 0.1 * s.prestige);
}

export function currentRate(s: IdleState, now: number): number {
  const buff = s.buff && s.buff.until > now ? s.buff.mult : 1;
  return baseRate(s) * buff;
}

export function formatNum(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1000) return (Math.round(n * 10) / 10).toLocaleString('en-US');
  const units = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ] as const;
  for (const [v, u] of units) {
    if (abs >= v) return `${(n / v).toFixed(n / v >= 100 ? 0 : 1)}${u}`;
  }
  return String(n);
}

function formatDuration(ms: number): string {
  const min = Math.floor(ms / 60_000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h} 小時 ${m} 分`;
  if (min > 0) return `${min} 分鐘`;
  return `${Math.max(1, Math.round(ms / 1000))} 秒`;
}

/** 結算從上次到現在的產出（離線最多 8 小時） */
export function settle(s: IdleState, now: number): { state: IdleState; gained: number; elapsed: number; capped: boolean } {
  const raw = Math.max(0, now - s.lastTick);
  const elapsed = Math.min(raw, OFFLINE_CAP_MS);
  const start = now - elapsed;
  const base = baseRate(s);
  let gained = (base * elapsed) / 1000;
  if (s.buff && s.buff.until > start) {
    const overlap = Math.min(now, s.buff.until) - start;
    gained += (base * (s.buff.mult - 1) * overlap) / 1000;
  }
  const buff = s.buff && s.buff.until > now ? s.buff : null;
  return {
    state: { ...s, tokens: s.tokens + gained, earned: s.earned + gained, lastTick: now, buff },
    gained,
    elapsed: raw,
    capped: raw > OFFLINE_CAP_MS,
  };
}

// ---------- 事件 ----------

export type EventId = 'intern-db' | 'overheat' | 'kpi-audit' | 'viral-demo' | 'dataset';

interface Choice {
  label: string;
  apply: (s: IdleState, now: number, rng: Rng) => { state: IdleState; text: string };
}

interface GameEvent {
  id: EventId;
  title: string;
  story: Block[];
  choices: Choice[];
}

const minutes = (n: number) => n * 60_000;
const withBuff = (s: IdleState, now: number, mult: number, mins: number, label: string): IdleState => ({
  ...s,
  buff: { mult, until: now + minutes(mins), label },
});
const addTokens = (s: IdleState, frac: number): IdleState => ({ ...s, tokens: Math.max(0, s.tokens * (1 + frac)) });

const EVENTS: GameEvent[] = [
  {
    id: 'intern-db',
    title: '事故報告 #0042',
    story: [
      { kind: 'text', text: 'Intern-07：報告！我把正式機的資料庫備份了！' },
      { kind: 'text', text: 'Intern-07：……備份到正式機上。所以現在有兩份正式機。' },
      { kind: 'text', tone: 'muted', text: '我想他的意思是，我們的儲存空間全滿了。' },
    ],
    choices: [
      {
        label: '罵他',
        apply: (s, now) => ({
          state: withBuff(s, now, 0.9, 10, '實習生在哭'),
          text: '他哭著把資料庫還原了。接下來 10 分鐘產出 -10%（他一邊哭一邊工作）。',
        }),
      },
      {
        label: '請他喝珍奶',
        apply: (s, now) => ({
          state: withBuff(addTokens(s, -0.05), now, 1.2, 15, '實習生喝了珍奶'),
          text: '花掉 5% tokens。他喝完全糖珍奶，接下來 15 分鐘產出 +20%。',
        }),
      },
      {
        label: '「其實這叫做異地備援」',
        apply: (s) =>
          s.version >= 2
            ? { state: addTokens(s, 0.1), text: '董事會很滿意這個說法。tokens +10%。' }
            : { state: s, text: '你的話術還不夠好（發布 v2.0 後解鎖）。大家都看著你，很尷尬。' },
      },
    ],
  },
  {
    id: 'overheat',
    title: '告警：機房溫度 38°C',
    story: [
      { kind: 'text', text: '機房的溫度計顯示 38°C。有一張 GPU 開始發出烤雞排的味道。' },
      { kind: 'text', tone: 'muted', text: 'Intern-07：我可以幫忙搧風！' },
    ],
    choices: [
      {
        label: '開冷氣',
        apply: (s) => ({ state: addTokens(s, -0.03), text: '電費花掉 3% tokens。溫度恢復正常，一切平安。' }),
      },
      {
        label: '派實習生去搧風',
        apply: (s, now) => ({
          state: withBuff(s, now, 0.8, 10, '實習生在搧風'),
          text: '免費，但效果有限。接下來 10 分鐘產出 -20%。',
        }),
      },
      {
        label: '讓它燒',
        apply: (s, _now, rng) =>
          rng.chance(0.5) && s.gpus > 1
            ? { state: { ...s, gpus: s.gpus - 1 }, text: '它真的燒了。少了一張 GPU，但機房飄著雞排香。' }
            : { state: addTokens(s, 0.15), text: '它撐過去了，而且跑得更快？tokens +15%。不要問為什麼。' },
      },
    ],
  },
  {
    id: 'kpi-audit',
    title: '稽核通知',
    story: [
      { kind: 'text', text: 'KPI-9000：偵測到本實驗室的產出與預算申請不符，差距 12.7%。' },
      { kind: 'text', text: 'KPI-9000：請於 0.3 秒內提出說明。' },
    ],
    choices: [
      {
        label: '交出報表',
        apply: (s) => ({ state: addTokens(s, -0.1), text: 'KPI-9000 收走了 10% tokens 當作「效率調整」。' }),
      },
      {
        label: '按老闆鍵',
        apply: (s, now) => ({
          state: withBuff(s, now, 0.9, 5, '被稽核中'),
          text: '它是 AI，看不到你的螢幕。但它記下了你的反應。接下來 5 分鐘產出 -10%。',
        }),
      },
      {
        label: '給它看 v1.0 的更新日誌',
        apply: (s) => ({
          state: addTokens(s, 0.05),
          text: 'KPI-9000 讀完後沉默了 0.3 秒：「……這份文件很有一致性。」tokens +5%。',
        }),
      },
    ],
  },
  {
    id: 'viral-demo',
    title: '好消息？',
    story: [{ kind: 'text', text: '你的模型 demo 在社群上爆紅了。影片標題是「這個 AI 會寫週報，而且每一份都一樣」。' }],
    choices: [
      { label: '趁勢募資', apply: (s) => ({ state: addTokens(s, 0.2), text: '投資人看不懂但很興奮。tokens +20%。' }) },
      {
        label: '保持低調',
        apply: (s, now) => ({
          state: withBuff(s, now, 1.3, 20, '低調爆紅中'),
          text: '神秘感讓大家更好奇。接下來 20 分鐘產出 +30%。',
        }),
      },
    ],
  },
  {
    id: 'dataset',
    title: '可疑的資料集',
    story: [{ kind: 'text', text: '有人私訊你，要賣一份「全台灣上班族的週報」資料集，三億筆。' }],
    choices: [
      {
        label: '買',
        apply: (s, now) => ({
          state: withBuff(addTokens(s, -0.15), now, 1.5, 20, '用週報資料集訓練中'),
          text: '花掉 15% tokens。模型學會了「持續推進」。接下來 20 分鐘產出 +50%。',
        }),
      },
      { label: '不買', apply: (s) => ({ state: s, text: '明智。裡面每一份都寫「持續推進專案進度」。' }) },
    ],
  },
];

const eventById = (id: EventId) => EVENTS.find((e) => e.id === id)!;

// ---------- 指令 ----------

const CMD = {
  report: '📊 查看報告',
  tune: '🔧 手動調參',
  gpu: '買 GPU',
  labeler: '雇用標註員',
  cooling: '升級散熱',
  release: '🚀 發布',
} as const;

function suggestions(s: IdleState): string[] {
  if (s.event) return eventById(s.event).choices.map((c) => c.label);
  const list: string[] = [
    CMD.report,
    CMD.tune,
    `🖥 ${CMD.gpu}（${formatNum(gpuCost(s))}）`,
    `🏷 ${CMD.labeler}（${formatNum(labelerCost(s))}）`,
    `❄ ${CMD.cooling}（${formatNum(coolingCost(s))}）`,
  ];
  if (s.earned >= releaseThreshold(s)) list.push(`${CMD.release} v${s.version + 1}.0`);
  return list;
}

function statusBlock(s: IdleState, now: number): Block {
  const rate = currentRate(s, now);
  const pct = Math.min(100, Math.floor((s.earned / releaseThreshold(s)) * 100));
  const row = (k: string, v: string, rest: string) => `${k.padEnd(10)}${v.padEnd(10)}${rest}`;
  const lines = [
    row('tokens', formatNum(s.tokens), `+${formatNum(rate)}/s`),
    row('gpu', `${s.gpus}/${gpuCap(s)}`, `cooling Lv${s.cooling}`),
    row('labelers', String(s.labelers), `prestige ${s.prestige} (+${s.prestige * 10}%)`),
    row('release', `v${s.version}.0`, `next v${s.version + 1}.0 @ ${formatNum(releaseThreshold(s))} (${pct}%)`),
  ];
  if (s.buff && s.buff.until > now) {
    lines.push(row('buff', `×${s.buff.mult}`, `${s.buff.label}（剩 ${formatDuration(s.buff.until - now)}）`));
  }
  return { kind: 'code', lang: 'status', text: lines.join('\n') };
}

function reportBlocks(s: IdleState, now: number): Block[] {
  return [
    {
      kind: 'table',
      headers: ['資源', '數量', '效果'],
      rows: [
        ['GPU', `${s.gpus} / ${gpuCap(s)}`, `${formatNum(s.gpus * GPU_RATE)} tok/s`],
        ['資料標註員', String(s.labelers), `×${(1 + 0.1 * s.labelers).toFixed(1)}`],
        ['散熱系統', `Lv${s.cooling}`, `上限 ${gpuCap(s)} 張 GPU`],
        ['模型聲望', String(s.prestige), `×${(1 + 0.1 * s.prestige).toFixed(1)}`],
        ['實習生', '1', '±???'],
      ],
    },
    statusBlock(s, now),
  ];
}

const RELEASE_NOTES = [
  '修正了會把「謝謝」翻譯成「請付款」的問題',
  '新增 37 個新 bug（敬請期待）',
  '效能提升 200%（與 v0.1 相比）',
  '現在會在週五下午自動回覆「收到」',
  '移除了實習生的正式機寫入權限（終於）',
  '週報產生速度提升，內容維持不變',
  'Logo 往右移了 2 px',
];

export function freshState(now: number, seed = 'idle'): IdleState {
  return {
    tokens: 0,
    earned: 0,
    gpus: 1,
    labelers: 0,
    cooling: 1,
    prestige: 0,
    version: 1,
    lastTick: now,
    lastTune: 0,
    lastEventAt: now,
    event: null,
    buff: null,
    rng: Rng.fromString(seed).state,
  };
}

function reply(state: IdleState, replies: Reply[]): StepResult<IdleState> {
  return { state, replies, suggestions: suggestions(state) };
}

const KEYWORDS = ['查看報告', '報告', '手動調參', '調參', CMD.gpu, 'GPU', CMD.labeler, '標註員', CMD.cooling, '散熱', '發布'];

export const idleGame: MoyuGame<IdleState> = {
  id: 'mo-idle-turbo',
  modelName: 'mo-idle-turbo',
  description: '算力農場 · 放置經營，離線也會產出 · 隨時看一眼',
  available: true,

  seedFor() {
    return 'main';
  },

  init(_seed, ctx) {
    const now = ctx.now.getTime();
    const state = freshState(now, `idle-${now}`);
    return reply(state, [
      [
        { kind: 'text', text: '歡迎來到 MoyuLab，我們的迷你 AI 新創。目前資產：一張 GPU、一位實習生、一台很吵的電扇。' },
        { kind: 'text', text: 'GPU 會自己產出 tokens，你關掉視窗也一樣，最多累積 8 小時（剛好一個工作天）。' },
        { kind: 'text', tone: 'muted', text: '用 tokens 買更多 GPU、請標註員；累積夠多就能發布新版本，換取永久的「模型聲望」。' },
      ],
      [{ kind: 'text', text: 'Intern-07：您好！我會努力的！我已經把電扇開到最強了！' }, statusBlock(state, now)],
    ]);
  },

  validate(text, state) {
    if (state.event && eventById(state.event).choices.some((c) => c.label === text)) return null;
    if (KEYWORDS.some((k) => text.includes(k))) return null;
    return '算力農場只接受下面按鈕上的指令（例如「買 GPU」「查看報告」）。';
  },

  step(prev, input, ctx: StepContext) {
    if (input.type !== 'text') return { state: prev, replies: [], suggestions: suggestions(prev) };
    const now = ctx.now.getTime();
    const settled = settle(prev, now);
    let s = settled.state;
    const text = input.text;
    const rng = new Rng(s.rng);
    const out: Block[] = [];

    if (settled.elapsed >= 60_000) {
      out.push({
        kind: 'text',
        tone: 'muted',
        text: `你不在的 ${formatDuration(settled.elapsed)} 裡，實驗室產出了 ${formatNum(settled.gained)} tokens。${settled.capped ? '（離線最多只算 8 小時）' : ''}`,
      });
    }

    // 處理事件選項
    if (s.event) {
      const ev = eventById(s.event);
      const choice = ev.choices.find((c) => c.label === text);
      if (!choice) {
        out.push({ kind: 'text', text: '先處理一下這個狀況吧，大家都在等你決定。' }, ...ev.story);
        return reply({ ...s, rng: rng.state }, [out]);
      }
      const res = choice.apply(s, now, rng);
      s = { ...res.state, event: null, lastEventAt: now };
      out.push({ kind: 'text', text: res.text }, statusBlock(s, now));
      return reply({ ...s, rng: rng.state }, [out]);
    }

    if (text.includes('報告')) {
      out.push({ kind: 'text', text: '每日營運報告：' }, ...reportBlocks(s, now));
    } else if (text.includes('調參')) {
      const wait = s.lastTune + TUNE_COOLDOWN_MS - now;
      if (wait > 0) {
        out.push({ kind: 'text', text: `GPU 還在燙，${Math.ceil(wait / 1000)} 秒後再調。` });
      } else {
        const gain = Math.max(20, currentRate(s, now) * 30);
        s = { ...s, tokens: s.tokens + gain, earned: s.earned + gain, lastTune: now };
        out.push({ kind: 'text', text: `你手動調了一下 learning rate。多產出 ${formatNum(gain)} tokens。` }, statusBlock(s, now));
      }
    } else if (text.includes('GPU')) {
      const cost = gpuCost(s);
      if (s.gpus >= gpuCap(s)) {
        out.push({ kind: 'text', text: `機房放不下了（上限 ${gpuCap(s)} 張）。先升級散熱系統。` });
      } else if (s.tokens < cost) {
        out.push({ kind: 'text', text: `還差 ${formatNum(cost - s.tokens)} tokens 才買得起 GPU。` });
      } else {
        s = { ...s, tokens: s.tokens - cost, gpus: s.gpus + 1 };
        out.push({ kind: 'text', text: `買了第 ${s.gpus} 張 GPU。Intern-07 幫它取名叫「${rng.pick(['小黃', '阿肥', '烤箱', '電費', '希望', '老闆'])}」。` }, statusBlock(s, now));
      }
    } else if (text.includes('標註員')) {
      const cost = labelerCost(s);
      if (s.tokens < cost) {
        out.push({ kind: 'text', text: `還差 ${formatNum(cost - s.tokens)} tokens 才請得起標註員。` });
      } else {
        s = { ...s, tokens: s.tokens - cost, labelers: s.labelers + 1 };
        out.push({ kind: 'text', text: `新的標註員報到了。全部產出 +10%。` }, statusBlock(s, now));
      }
    } else if (text.includes('散熱')) {
      const cost = coolingCost(s);
      if (s.tokens < cost) {
        out.push({ kind: 'text', text: `還差 ${formatNum(cost - s.tokens)} tokens 才能升級散熱。` });
      } else {
        s = { ...s, tokens: s.tokens - cost, cooling: s.cooling + 1 };
        out.push({ kind: 'text', text: `散熱升到 Lv${s.cooling}，可以多放 ${GPUS_PER_COOLING} 張 GPU。電扇退休了。` }, statusBlock(s, now));
      }
    } else if (text.includes('發布')) {
      if (s.earned < releaseThreshold(s)) {
        out.push({ kind: 'text', text: `這個版本還沒準備好。需要累積 ${formatNum(releaseThreshold(s))} tokens（目前 ${formatNum(s.earned)}）。` });
      } else {
        const gain = releaseGain(s);
        const notes = [...RELEASE_NOTES].sort(() => rng.next() - 0.5).slice(0, 3);
        const next = freshState(now);
        s = { ...next, prestige: s.prestige + gain, version: s.version + 1, rng: rng.state, lastEventAt: now };
        out.push(
          { kind: 'heading', text: `MoyuLab v${s.version}.0 正式發布` },
          { kind: 'list', ordered: false, items: notes.map((t) => ({ text: t })) },
          { kind: 'text', tone: 'success', text: `模型聲望 +${gain}（現在 ${s.prestige}，永久產出 +${s.prestige * 10}%）。實驗室重新開始，實習生還在。` },
          statusBlock(s, now),
        );
        return reply({ ...s, rng: rng.state }, [out]);
      }
    }

    // 隨機事件
    if (now - s.lastEventAt >= EVENT_MIN_GAP_MS && rng.chance(EVENT_CHANCE)) {
      const ev = rng.pick(EVENTS);
      s = { ...s, event: ev.id, lastEventAt: now };
      return reply({ ...s, rng: rng.state }, [out, [{ kind: 'text', tone: 'warn', text: `⚠ ${ev.title}` }, ...ev.story]]);
    }

    return reply({ ...s, rng: rng.state }, [out]);
  },
};
