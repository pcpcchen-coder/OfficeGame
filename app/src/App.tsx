import { useCallback, useEffect, useMemo, useState } from 'react';
import { FAKE_CHATS } from './bosskey/fakeChats';
import { BossScreen } from './components/BossScreen';
import { ChatView } from './components/ChatView';
import { ModelPicker } from './components/ModelPicker';
import { SettingsDialog } from './components/SettingsDialog';
import { Sidebar, type SidebarItem } from './components/Sidebar';
import { taipeiDayIndex } from './engine/date';
import { createConversation, findCurrent, sendInput, type Outcome } from './engine/session';
import { clearSave, emptySave, loadSave, writeSave, type Conversation, type SaveData, type Settings } from './engine/storage';
import { emptyProfile, type GameId, type PlayerInput, type StepContext } from './engine/types';
import { currentStreak } from './games/daily/daily';
import { useBossKey } from './hooks/useBossKey';

const NORMAL_ICON = `${import.meta.env.BASE_URL}favicon.svg`;
const BOSS_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='4' y='3' width='16' height='18' rx='2' fill='%2394a3b8'/%3E%3Cpath d='M8 8h8M8 12h8M8 16h5' stroke='white' stroke-width='1.6'/%3E%3C/svg%3E";

function ctxOf(save: SaveData): StepContext {
  return { profile: save.profile, now: new Date() };
}

function upsert(list: Conversation[], conv: Conversation): Conversation[] {
  const i = list.findIndex((c) => c.id === conv.id);
  if (i === -1) return [conv, ...list];
  const next = [...list];
  next[i] = conv;
  return next;
}

/** 開啟（或建立）某個遊戲目前這一局的對話 */
function openGame(save: SaveData, gameId: GameId, forceNew = false): { save: SaveData; freshId: string | null } {
  const ctx = ctxOf(save);
  // Mo 的主對話回到最近一段；「新對話」才另開。每日題目永遠回到今天那一局。
  const existing =
    gameId === 'mo-assistant'
      ? forceNew
        ? undefined
        : [...save.conversations].sort((a, b) => b.createdAt - a.createdAt).find((c) => c.gameId === gameId)
      : findCurrent(gameId, ctx, save.conversations);
  if (existing) return { save: { ...save, activeId: existing.id }, freshId: null };
  const out = createConversation(gameId, ctx, save.conversations);
  return applyOutcome(save, out, out.conversation.id);
}

/** 套用一次遊戲結果：更新對話、存檔、處理後續動作 */
function applyOutcome(save: SaveData, out: Outcome, freshId: string | null = null): { save: SaveData; freshId: string | null } {
  let next: SaveData = {
    ...save,
    conversations: upsert(save.conversations, out.conversation),
    activeId: out.conversation.id,
    profile: out.profile ?? save.profile,
  };
  if (out.action?.type === 'open-game') {
    return openGame(next, out.action.gameId);
  }
  if (out.action?.type === 'restart-tutorial') {
    next = { ...next, profile: { ...next.profile, tutorialDone: false } };
    const created = createConversation('mo-assistant', ctxOf(next), next.conversations);
    return applyOutcome(next, created, created.conversation.id);
  }
  return { save: next, freshId };
}

function initialState(): { save: SaveData; freshId: string | null } {
  const save = loadSave();
  if (save.conversations.length > 0) return { save, freshId: null };
  return openGame(save, 'mo-assistant');
}

function groupLabel(createdAt: number, today: number): string {
  const d = taipeiDayIndex(new Date(createdAt));
  if (d === today) return '今天';
  if (d === today - 1) return '昨天';
  if (today - d < 7) return '過去 7 天';
  return '更早';
}

export default function App() {
  const [{ save, freshId }, setAll] = useState(initialState);
  const [boss, setBoss] = useState(false);
  const [notice, setNotice] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => writeSave(save), [save]);

  const active = save.conversations.find((c) => c.id === save.activeId) ?? save.conversations[0];
  // 每分鐘檢查一次是否過了台灣午夜，開著不關也會換到新的一天
  const [today, setToday] = useState(() => taipeiDayIndex(new Date()));
  useEffect(() => {
    const t = setInterval(() => setToday(taipeiDayIndex(new Date())), 60_000);
    return () => clearInterval(t);
  }, []);

  const bossChat = useMemo(() => {
    const picked = FAKE_CHATS.find((c) => c.id === save.settings.bossChat);
    return picked ?? FAKE_CHATS[((today % FAKE_CHATS.length) + FAKE_CHATS.length) % FAKE_CHATS.length];
  }, [save.settings.bossChat, today]);

  // 分頁標題與圖示：平常顯示無害的對話標題，老闆鍵時換成偽裝對話
  useEffect(() => {
    document.title = boss ? `${bossChat.title}` : active ? active.title : '新對話';
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = boss ? BOSS_ICON : NORMAL_ICON;
  }, [boss, bossChat, active]);

  const dispatch = useCallback(
    (input: PlayerInput) => {
      if (!active) return;
      const res = sendInput(active, input, ctxOf(save));
      if (!res.ok) {
        setNotice(res.notice);
        return;
      }
      setNotice('');
      setAll(applyOutcome(save, res));
    },
    [active, save],
  );

  const toggleBoss = useCallback(() => {
    setSidebarOpen(false);
    if (boss) {
      setBoss(false);
      dispatch({ type: 'event', name: 'bosskey-released' });
    } else {
      setBoss(true);
    }
  }, [boss, dispatch]);

  useBossKey({
    onToggle: toggleBoss,
    paused: settingsOpen,
    autoHideOnBlur: save.settings.autoHideOnBlur,
    onBlurHide: () => setBoss(true),
  });

  const pickGame = (gameId: GameId) => {
    setNotice('');
    setSidebarOpen(false);
    if (active?.gameId === gameId) return;
    setAll(openGame(save, gameId));
  };

  const newChat = () => {
    setNotice('');
    setSidebarOpen(false);
    setAll(openGame(save, active?.gameId ?? 'mo-assistant', true));
  };

  const updateSettings = (settings: Settings) => setAll({ save: { ...save, settings }, freshId });

  const reset = () => {
    clearSave();
    const fresh = { ...emptySave(), settings: save.settings, profile: emptyProfile() };
    setAll(openGame(fresh, 'mo-assistant'));
    setSettingsOpen(false);
  };

  const items: SidebarItem[] = [...save.conversations]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((c) => ({ id: c.id, title: c.title, group: groupLabel(c.createdAt, today) }));

  if (boss) return <BossScreen chat={bossChat} onExit={toggleBoss} />;

  return (
    <div className="app">
      <Sidebar
        items={items}
        activeId={active?.id ?? null}
        open={sidebarOpen}
        onSelect={(id) => {
          setNotice('');
          setSidebarOpen(false);
          setAll({ save: { ...save, activeId: id }, freshId: null });
        }}
        onNew={newChat}
        onSettings={() => setSettingsOpen(true)}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)} aria-label="開啟側欄">
            ☰
          </button>
          <ModelPicker current={active?.gameId ?? 'mo-assistant'} onPick={pickGame} />
          <div className="spacer" />
          <button type="button" className="icon-btn" onClick={toggleBoss} aria-label="收合" title="收合（Esc）">
            ⌄
          </button>
        </header>
        {active && (
          <ChatView
            key={active.id}
            messages={active.messages}
            suggestions={active.suggestions}
            animate={save.settings.animate}
            playFromStart={active.id === freshId}
            notice={notice}
            onSend={(text) => dispatch({ type: 'text', text })}
            onClearNotice={() => setNotice('')}
          />
        )}
      </main>
      {settingsOpen && (
        <SettingsDialog
          settings={save.settings}
          stats={save.profile.daily}
          streak={currentStreak(save.profile.daily, today)}
          onChange={updateSettings}
          onReset={reset}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
