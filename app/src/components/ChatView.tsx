import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../engine/types';
import { Logo } from './Logo';
import { MessageBlocks } from './MessageBlocks';

interface Props {
  messages: ChatMessage[];
  suggestions: string[];
  animate: boolean;
  /** 新開的對話從第 0 則開始播放 */
  playFromStart: boolean;
  notice: string;
  onSend: (text: string) => void;
  onClearNotice: () => void;
}

function textLength(m: ChatMessage): number {
  return m.blocks.reduce((n, b) => n + ('text' in b ? b.text.length : b.kind === 'list' ? b.items.length * 20 : 0), 0);
}

export function ChatView({ messages, suggestions, animate, playFromStart, notice, onSend, onClearNotice }: Props) {
  const [animatedShown, setShown] = useState(playFromStart ? 0 : messages.length);
  // 關閉動畫時直接全部顯示
  const shown = animate ? animatedShown : messages.length;
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 逐則顯示 Mo 的回覆（「思考中」節奏）；資料已經存好了，關掉也不會遺失
  useEffect(() => {
    if (shown >= messages.length) return;
    const next = messages[shown];
    const delay = next.role === 'user' ? 0 : 300 + Math.min(700, textLength(next) * 6);
    const t = setTimeout(() => setShown((s) => s + 1), delay);
    return () => clearTimeout(t);
  }, [shown, messages]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown]);

  const visible = messages.slice(0, shown);
  const thinking = shown < messages.length;

  const submit = (text: string) => {
    if (!text.trim()) return;
    setShown(messages.length); // 送出時跳過還沒播完的動畫
    onSend(text);
  };

  return (
    <div className="chat">
      <div className="messages" ref={scrollRef}>
        <div className="messages-inner">
          {visible.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="msg user">
                <div className="bubble">
                  <MessageBlocks blocks={m.blocks} />
                </div>
              </div>
            ) : (
              <div key={m.id} className="msg mo">
                <div className="avatar">
                  <Logo size={16} />
                </div>
                <div className="body">
                  <MessageBlocks blocks={m.blocks} />
                </div>
              </div>
            ),
          )}
          {thinking && (
            <button type="button" className="msg mo thinking" onClick={() => setShown(messages.length)} title="點一下跳過">
              <div className="avatar">
                <Logo size={16} />
              </div>
              <div className="dots" aria-label="思考中">
                <span />
                <span />
                <span />
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="composer-wrap">
        {!thinking && suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((s) => (
              <button type="button" key={s} className="chip" onClick={() => submit(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button type="button" className="notice-x" onClick={onClearNotice} aria-label="關閉">
              ×
            </button>
          </div>
        )}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            submit(draft);
            setDraft('');
          }}
        >
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (notice) onClearNotice();
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text');
              if (pasted.length > 40 || /\n/.test(pasted)) {
                e.preventDefault();
                onSend(pasted); // 交給安全檢查產生提示；內容不會被保存
              }
            }}
            placeholder="輸入訊息…"
            aria-label="輸入訊息"
            maxLength={60}
            autoComplete="off"
          />
          <button type="submit" className="send" disabled={!draft.trim()} aria-label="送出">
            ↑
          </button>
        </form>
        <div className="disclaimer">Moyu 是遊戲，不是真的 AI 助理。請不要輸入任何工作資料。</div>
      </div>
    </div>
  );
}
