import { useState } from 'react';
import type { FakeChat } from '../bosskey/fakeChats';
import { WORK_TITLES } from '../engine/titles';
import { Logo } from './Logo';
import { MessageBlocks } from './MessageBlocks';
import { Sidebar } from './Sidebar';

interface Props {
  chat: FakeChat;
  onExit: () => void;
}

const EXIT_CODE = '/mo';

/** 老闆鍵畫面：一段完整、可信的工作對話。輸入 /mo 或再按一次 Esc 回到遊戲。 */
export function BossScreen({ chat, onExit }: Props) {
  const [draft, setDraft] = useState('');
  const items = [
    { id: 'fake-current', title: chat.title, group: '今天' },
    ...WORK_TITLES.slice(0, 3).map((t, i) => ({ id: `fake-${i}`, title: t, group: '今天' })),
    ...WORK_TITLES.slice(3, 7).map((t, i) => ({ id: `fake-old-${i}`, title: t, group: '過去 7 天' })),
  ];

  return (
    <div className="app boss">
      <Sidebar items={items} activeId="fake-current" open={false} onSelect={() => {}} onNew={() => {}} onSettings={() => {}} onClose={() => {}} />
      <main className="main">
        <header className="topbar">
          <div className="model-picker">
            <span className="model-button static">mo-assistant <span className="chev" aria-hidden="true">▾</span></span>
          </div>
          <div className="spacer" />
          {/* 和平常同一個位置、同一個圖示，看不出差別；手機上用它切回來 */}
          <button type="button" className="icon-btn" onClick={onExit} aria-label="收合" title="收合（Esc）">
            ⌄
          </button>
        </header>
        <div className="chat">
          <div className="messages">
            <div className="messages-inner">
              <div className="msg user">
                <div className="bubble">
                  <p>{chat.question}</p>
                </div>
              </div>
              <div className="msg mo">
                <div className="avatar">
                  <Logo size={16} />
                </div>
                <div className="body">
                  <MessageBlocks blocks={chat.answer} />
                </div>
              </div>
            </div>
          </div>
          <div className="composer-wrap">
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim() === EXIT_CODE) onExit();
                setDraft('');
              }}
            >
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="輸入訊息…" aria-label="輸入訊息" autoComplete="off" />
              <button type="submit" className="send" disabled={!draft.trim()} aria-label="送出">
                ↑
              </button>
            </form>
            <div className="disclaimer">Moyu 是遊戲，不是真的 AI 助理。請不要輸入任何工作資料。</div>
          </div>
        </div>
      </main>
    </div>
  );
}
