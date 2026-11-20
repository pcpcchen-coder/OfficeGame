import { describe, expect, it } from 'vitest';
import { checkInput } from '../engine/safety';

describe('輸入安全檢查', () => {
  it.each(['尾牙', '我放棄', '什麼秘密？', 'hello'])('一般遊戲輸入可以通過：%s', (t) => {
    expect(checkInput(t).ok).toBe(true);
  });

  it.each([
    'someone@company.com',
    '0912-345-678',
    '02-27001234',
    'A123456789',
    '帳號 12345678',
    'https://intranet.example.com',
    'SELECT * FROM salary',
    'const x = 1;',
  ])('擋下看起來像工作資料的內容：%s', (t) => {
    expect(checkInput(t)).toEqual({ ok: false, reason: 'sensitive' });
  });

  it('擋下過長與多行的內容', () => {
    expect(checkInput('字'.repeat(41))).toEqual({ ok: false, reason: 'too-long' });
    expect(checkInput('第一行\n第二行')).toEqual({ ok: false, reason: 'multiline' });
  });
});
