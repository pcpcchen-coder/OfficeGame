// 介面長得像 AI 助理，玩家可能順手把工作內容貼進來。
// 這裡在任何遊戲處理輸入之前先擋下看起來像工作資料的內容。
// 被擋下的內容不會進入對話紀錄、不會被儲存，也不會送到任何伺服器。

export type SafetyVerdict =
  | { ok: true }
  | { ok: false; reason: 'sensitive' | 'too-long' | 'multiline' };

const MAX_LENGTH = 40;

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const URL = /(https?:\/\/|www\.)\S+/i;
// 台灣手機、市話，或任何 8 碼以上的連續數字（帳號、統編、身分證字號等）
const PHONE_OR_ID = /(09\d{2}[-\s]?\d{3}[-\s]?\d{3})|(\(?0\d{1,2}\)?[-\s]?\d{6,8})|(\d{8,})|([A-Z][12]\d{8})/i;
const CODE_LIKE = /[{};]|=>|<\/?[a-z][^>]*>|\b(SELECT|INSERT|UPDATE|DELETE|function|const|import|class)\b/i;

export function checkInput(text: string): SafetyVerdict {
  if (/\r|\n/.test(text.trim())) return { ok: false, reason: 'multiline' };
  if (text.trim().length > MAX_LENGTH) return { ok: false, reason: 'too-long' };
  if (EMAIL.test(text) || URL.test(text) || PHONE_OR_ID.test(text) || CODE_LIKE.test(text)) {
    return { ok: false, reason: 'sensitive' };
  }
  return { ok: true };
}

export function safetyMessage(reason: 'sensitive' | 'too-long' | 'multiline'): string {
  switch (reason) {
    case 'sensitive':
      return '這裡是遊戲，看起來像工作資料（email、電話、網址、程式碼）的內容已被擋下，沒有送出也沒有儲存。';
    case 'too-long':
      return `這裡是遊戲，一次最多 ${MAX_LENGTH} 個字。內容沒有送出也沒有儲存。`;
    case 'multiline':
      return '這裡是遊戲，不接受多行貼上。內容沒有送出也沒有儲存。';
  }
}
