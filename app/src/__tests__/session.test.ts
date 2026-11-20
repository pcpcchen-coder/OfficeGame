import { describe, expect, it } from 'vitest';
import { createConversation, findCurrent, sendInput } from '../engine/session';
import { emptyProfile, type Profile, type StepContext } from '../engine/types';

const ctx = (profile: Profile = emptyProfile()): StepContext => ({ profile, now: new Date('2026-11-20T10:00:00+08:00') });

describe('新手教學流程', () => {
  it('週報 → 秘密 → 老闆鍵 → 開啟每日提示詞', () => {
    let { conversation: conv } = createConversation('mo-assistant', ctx(), []);
    expect(conv.suggestions).toContain('幫我寫週報');

    let r = sendInput(conv, { type: 'text', text: '幫我寫週報' }, ctx());
    if (!r.ok) throw new Error(r.notice);
    conv = r.conversation;
    expect(conv.suggestions).toEqual(['什麼秘密？', '我要去跟 IT 講']);

    r = sendInput(conv, { type: 'text', text: '什麼秘密？' }, ctx());
    if (!r.ok) throw new Error(r.notice);
    conv = r.conversation;

    r = sendInput(conv, { type: 'event', name: 'bosskey-released' }, ctx());
    if (!r.ok) throw new Error(r.notice);
    expect(r.profile?.tutorialDone).toBe(true);
    conv = r.conversation;
    expect(conv.suggestions).toEqual(['好，開始']);

    r = sendInput(conv, { type: 'text', text: '好，開始' }, ctx(r.profile));
    if (!r.ok) throw new Error(r.notice);
    expect(r.action).toEqual({ type: 'open-game', gameId: 'mo-daily' });
  });

  it('教學完成後，新的主對話直接進選單', () => {
    const { conversation } = createConversation('mo-assistant', ctx({ ...emptyProfile(), tutorialDone: true }), []);
    expect(conversation.suggestions).toContain('開始今天的每日提示詞');
  });

  it('沒有對應的事件不會清掉建議回覆', () => {
    const { conversation } = createConversation('mo-assistant', ctx(), []);
    const r = sendInput(conversation, { type: 'event', name: 'bosskey-released' }, ctx());
    if (!r.ok) throw new Error(r.notice);
    expect(r.conversation.suggestions).toEqual(conversation.suggestions);
    expect(r.conversation.messages).toHaveLength(conversation.messages.length);
  });
});

describe('輸入處理', () => {
  it('看起來像工作資料的輸入被擋下，不進對話紀錄', () => {
    const { conversation } = createConversation('mo-daily', ctx(), []);
    const r = sendInput(conversation, { type: 'text', text: 'boss@company.com' }, ctx());
    expect(r.ok).toBe(false);
  });

  it('格式不對的猜測被擋下', () => {
    const { conversation } = createConversation('mo-daily', ctx(), []);
    const r = sendInput(conversation, { type: 'text', text: 'abc' }, ctx());
    expect(r).toMatchObject({ ok: false });
  });

  it('合法的猜測會加入玩家訊息與 Mo 的回覆', () => {
    const { conversation } = createConversation('mo-daily', ctx(), []);
    const r = sendInput(conversation, { type: 'text', text: '年終' }, ctx());
    if (!r.ok) throw new Error(r.notice);
    expect(r.conversation.messages).toHaveLength(conversation.messages.length + 2);
    expect(r.conversation.messages.at(-2)?.role).toBe('user');
  });

  it('每日題目以今天的種子找回同一局', () => {
    const { conversation } = createConversation('mo-daily', ctx(), []);
    expect(findCurrent('mo-daily', ctx(), [conversation])?.id).toBe(conversation.id);
    const tomorrow: StepContext = { ...ctx(), now: new Date('2026-11-21T10:00:00+08:00') };
    expect(findCurrent('mo-daily', tomorrow, [conversation])).toBeUndefined();
  });
});
