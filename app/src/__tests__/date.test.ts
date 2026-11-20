import { describe, expect, it } from 'vitest';
import { taipeiDateString, taipeiDayIndex } from '../engine/date';

describe('台灣時間換日', () => {
  it('2026-11-01 台灣時間是第 0 天', () => {
    expect(taipeiDayIndex(new Date('2026-11-01T00:00:00+08:00'))).toBe(0);
  });

  it('UTC 15:59 還是同一天，16:00 就換日（台灣午夜）', () => {
    expect(taipeiDateString(new Date('2026-11-20T15:59:00Z'))).toBe('2026-11-20');
    expect(taipeiDateString(new Date('2026-11-20T16:00:00Z'))).toBe('2026-11-21');
    expect(taipeiDayIndex(new Date('2026-11-20T16:00:00Z')) - taipeiDayIndex(new Date('2026-11-20T15:59:00Z'))).toBe(1);
  });
});
