import { describe, expect, it } from 'vitest';
import { emptyProfile, type StepContext } from '../engine/types';
import {
  baseRate,
  formatNum,
  freshState,
  gpuCap,
  gpuCost,
  idleGame,
  OFFLINE_CAP_MS,
  releaseThreshold,
  settle,
  TUNE_COOLDOWN_MS,
  type IdleState,
} from '../games/idle/idle';

const T0 = new Date('2026-11-20T09:00:00+08:00').getTime();
const ctxAt = (ms: number): StepContext => ({ profile: emptyProfile(), now: new Date(ms) });
const text = (t: string) => ({ type: 'text' as const, text: t });
/** 把事件時間推遠，避免隨機事件干擾測試 */
const calm = (s: IdleState, now: number): IdleState => ({ ...s, lastEventAt: now + 1e12 });

describe('產出結算', () => {
  it('一張 GPU 每秒 5 tokens', () => {
    const s = freshState(T0);
    expect(baseRate(s)).toBe(5);
    expect(settle(s, T0 + 10_000).gained).toBeCloseTo(50);
  });

  it('離線最多算 8 小時', () => {
    const s = freshState(T0);
    const r = settle(s, T0 + OFFLINE_CAP_MS * 3);
    expect(r.capped).toBe(true);
    expect(r.gained).toBeCloseTo((5 * OFFLINE_CAP_MS) / 1000);
  });

  it('暫時加成只算重疊的時間', () => {
    const s: IdleState = { ...freshState(T0), buff: { mult: 2, until: T0 + 10_000, label: 'x' } };
    // 前 10 秒 ×2，後 10 秒 ×1
    expect(settle(s, T0 + 20_000).gained).toBeCloseTo(150);
    expect(settle(s, T0 + 20_000).state.buff).toBeNull();
  });

  it('標註員與聲望各 +10%', () => {
    const s: IdleState = { ...freshState(T0), labelers: 2, prestige: 3 };
    expect(baseRate(s)).toBeCloseTo(5 * 1.2 * 1.3);
  });
});

describe('指令', () => {
  it('買 GPU 會扣款、受散熱上限限制', () => {
    let s = calm({ ...freshState(T0), tokens: 10_000 }, T0);
    const cost = gpuCost(s);
    let r = idleGame.step(s, text('🖥 買 GPU（58）'), ctxAt(T0));
    expect(r.state.gpus).toBe(2);
    expect(r.state.tokens).toBeCloseTo(10_000 - cost);

    s = calm({ ...freshState(T0), tokens: 1e9, gpus: gpuCap(freshState(T0)) }, T0);
    r = idleGame.step(s, text('買 GPU'), ctxAt(T0));
    expect(r.state.gpus).toBe(10);
    expect(JSON.stringify(r.replies)).toContain('先升級散熱系統');
  });

  it('錢不夠時不會變負數', () => {
    const s = calm(freshState(T0), T0);
    const r = idleGame.step(s, text('雇用標註員'), ctxAt(T0));
    expect(r.state.labelers).toBe(0);
    expect(r.state.tokens).toBeGreaterThanOrEqual(0);
  });

  it('手動調參有冷卻時間', () => {
    const s = calm(freshState(T0), T0);
    const a = idleGame.step(s, text('🔧 手動調參'), ctxAt(T0 + TUNE_COOLDOWN_MS));
    expect(a.state.tokens).toBeGreaterThan(0);
    const b = idleGame.step(calm(a.state, T0), text('🔧 手動調參'), ctxAt(T0 + TUNE_COOLDOWN_MS + 1000));
    expect(JSON.stringify(b.replies)).toContain('GPU 還在燙');
  });

  it('發布新版本：重置進度、取得聲望', () => {
    const base = freshState(T0);
    const s = calm({ ...base, tokens: 1e6, earned: releaseThreshold(base) * 4, gpus: 9, labelers: 5 }, T0);
    expect(idleGame.step(s, text('查看報告'), ctxAt(T0)).suggestions.some((x) => x.includes('發布 v2.0'))).toBe(true);
    const r = idleGame.step(s, text('🚀 發布 v2.0'), ctxAt(T0));
    expect(r.state.version).toBe(2);
    expect(r.state.prestige).toBeGreaterThan(0);
    expect(r.state.gpus).toBe(1);
    expect(r.state.tokens).toBe(0);
  });

  it('只接受按鈕上的指令', () => {
    const s = freshState(T0);
    expect(idleGame.validate!('買 GPU', s)).toBeNull();
    expect(idleGame.validate!('你好', s)).not.toBeNull();
  });
});

describe('隨機事件', () => {
  it('事件出現後要先選擇，選完才恢復一般指令', () => {
    let s: IdleState = { ...freshState(T0), tokens: 1000, lastEventAt: 0 };
    let now = T0;
    let found = false;
    for (let i = 0; i < 50 && !found; i++) {
      now += 1000;
      s = { ...s, lastEventAt: 0 };
      const r = idleGame.step(s, text('查看報告'), ctxAt(now));
      s = r.state;
      found = s.event !== null;
      if (found) {
        expect(r.suggestions.length).toBeGreaterThanOrEqual(2);
        expect(idleGame.validate!(r.suggestions[0], s)).toBeNull();
        const after = idleGame.step(s, text(r.suggestions[0]), ctxAt(now + 1000));
        expect(after.state.event).toBeNull();
        expect(after.suggestions).toContain('📊 查看報告');
      }
    }
    expect(found).toBe(true);
  });
});

it('數字格式', () => {
  expect(formatNum(999)).toBe('999');
  expect(formatNum(12_345)).toBe('12.3K');
  expect(formatNum(9_420_118)).toBe('9.4M');
});
