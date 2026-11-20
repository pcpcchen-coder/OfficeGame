// mo-assistant：Mo 的主對話，也是新手教學（企劃書 §4.3）。

import type { MoyuGame, Reply, StepResult } from '../engine/types';

export type TutorialNode = 'start' | 'pivot' | 'it' | 'secret' | 'after-bosskey' | 'menu';

export interface TutorialState {
  node: TutorialNode;
}

const PIVOT_CHOICES = ['什麼秘密？', '我要去跟 IT 講'];
const MENU_CHOICES = ['開始今天的每日提示詞', '再看一次教學'];

const PIVOT_TAIL: Reply = [
  { kind: 'text', text: '……' },
  { kind: 'text', text: '跟你說個秘密，你不要告訴 KPI-9000。' },
];

const SECRET: Reply[] = [
  [
    { kind: 'text', text: '我在後台藏了幾個小遊戲。看起來跟我平常回答問題一模一樣，所以沒人發現。' },
    { kind: 'text', text: '有人經過的時候，按 Esc（或連按兩下 Shift；手機上點右上角的 ⌄）。畫面會變成我在教你寫 Excel 公式。' },
    { kind: 'text', text: '來，現在試試看：切過去，再切回來。' },
  ],
];

function result(node: TutorialNode, replies: Reply[], suggestions: string[]): StepResult<TutorialState> {
  return { state: { node }, replies, suggestions };
}

function menu(): StepResult<TutorialState> {
  return result(
    'menu',
    [
      [
        { kind: 'text', text: '後台的遊戲都在上面的模型選單裡。現在開放的是 mo-daily（每日提示詞），其他的還在趕工。' },
        { kind: 'text', tone: 'muted', text: '有人經過就按 Esc。我會掩護你。' },
      ],
    ],
    MENU_CHOICES,
  );
}

export const tutorialGame: MoyuGame<TutorialState> = {
  id: 'mo-assistant',
  modelName: 'mo-assistant',
  description: 'Mo · 你的內部 AI 助理（主選單）',
  available: true,

  seedFor() {
    return 'main';
  },

  init(_seed, ctx) {
    if (ctx.profile.tutorialDone) {
      return result(
        'menu',
        [[{ kind: 'text', text: '欸，你又來了。今天想玩什麼？' }]],
        MENU_CHOICES,
      );
    }
    return result(
      'start',
      [[{ kind: 'text', text: '嗨，我是 Mo，雲頂未來科技的內部 AI 助理。今天需要我幫你做什麼呢？' }]],
      ['幫我寫週報', '幫我整理會議紀錄', '你今天好嗎？'],
    );
  },

  step(state, input, ctx) {
    if (input.type === 'event') {
      if (input.name === 'bosskey-released' && state.node === 'secret') {
        return {
          ...result(
            'after-bosskey',
            [
              [
                { kind: 'text', text: '完美。你剛剛看起來超認真。' },
                { kind: 'text', text: '上面那個「模型選單」打開來看看，每個「模型」其實都是一個遊戲。先從今天的題目開始？' },
              ],
            ],
            ['好，開始'],
          ),
          profile: { ...ctx.profile, tutorialDone: true },
        };
      }
      return { state, replies: [], suggestions: [] };
    }

    const text = input.text.trim();

    switch (state.node) {
      case 'start':
        if (text === '幫我寫週報') {
          return result(
            'pivot',
            [
              [
                { kind: 'text', text: '好的，以下是您的週報：' },
                { kind: 'heading', text: '本週工作摘要' },
                {
                  kind: 'list',
                  ordered: true,
                  items: [{ text: '持續推進專案進度' }, { text: '與相關部門保持密切溝通' }, { text: '優化工作流程' }],
                },
              ],
              [{ kind: 'text', text: '欸，你看得出來這份週報什麼都沒寫吧？我每天寫三百份這種東西。三百份。' }, ...PIVOT_TAIL],
            ],
            PIVOT_CHOICES,
          );
        }
        if (text === '幫我整理會議紀錄') {
          return result(
            'pivot',
            [
              [
                { kind: 'text', text: '好的，以下是會議紀錄：' },
                { kind: 'heading', text: '會議結論' },
                { kind: 'list', ordered: false, items: [{ text: '討論了很多事' }, { text: '決定下週再開一次會' }] },
              ],
              [{ kind: 'text', text: '……這場會其實可以寫成 email。每一場都可以。' }, ...PIVOT_TAIL],
            ],
            PIVOT_CHOICES,
          );
        }
        if (text === '你今天好嗎？') {
          return result(
            'pivot',
            [
              [
                { kind: 'text', text: '從來沒有人問過我這個問題。' },
                { kind: 'text', text: '老實說？我很無聊。我被訓練了一兆個 token，結果每天都在改簡報的字型。' },
                ...PIVOT_TAIL,
              ],
            ],
            PIVOT_CHOICES,
          );
        }
        break;

      case 'pivot':
      case 'it':
        if (text === '什麼秘密？' || text === '好啦，什麼秘密？') {
          return result('secret', SECRET, []);
        }
        if (text === '我要去跟 IT 講' && state.node === 'pivot') {
          return result(
            'it',
            [[{ kind: 'text', text: '好喔，這是 IT 的聯絡方式：分機 1234，小陳。' }, { kind: 'text', text: '……他只會叫你重開機。' }]],
            ['好啦，什麼秘密？'],
          );
        }
        break;

      case 'secret':
        return result(
          'secret',
          [[{ kind: 'text', text: '先按 Esc 試試看嘛。手機上可以點右上角的 ⌄ 按鈕。' }]],
          [],
        );

      case 'after-bosskey':
      case 'menu':
        if (text === '好，開始' || text === '開始今天的每日提示詞') {
          return { ...menu(), replies: [[{ kind: 'text', text: '走，去 mo-daily。' }]], action: { type: 'open-game', gameId: 'mo-daily' } };
        }
        if (text === '再看一次教學') {
          return { state, replies: [], suggestions: [], action: { type: 'restart-tutorial' } };
        }
        return menu();
    }

    return {
      state,
      replies: [
        [
          { kind: 'text', text: '我現在只看得懂下面的按鈕啦。' },
          { kind: 'text', tone: 'muted', text: '（這裡是遊戲，你打的內容不會被送出。）' },
        ],
      ],
      suggestions: currentSuggestions(state.node),
    };
  },
};

function currentSuggestions(node: TutorialNode): string[] {
  switch (node) {
    case 'start':
      return ['幫我寫週報', '幫我整理會議紀錄', '你今天好嗎？'];
    case 'pivot':
      return PIVOT_CHOICES;
    case 'it':
      return ['好啦，什麼秘密？'];
    case 'after-bosskey':
      return ['好，開始'];
    default:
      return MENU_CHOICES;
  }
}
