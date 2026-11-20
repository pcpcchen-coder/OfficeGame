import { Logo } from './Logo';

export interface SidebarItem {
  id: string;
  title: string;
  group: string;
}

interface Props {
  items: SidebarItem[];
  activeId: string | null;
  open: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSettings: () => void;
  onClose: () => void;
}

export function Sidebar({ items, activeId, open, onSelect, onNew, onSettings, onClose }: Props) {
  const groups: Array<{ name: string; items: SidebarItem[] }> = [];
  for (const it of items) {
    const g = groups.find((x) => x.name === it.group);
    if (g) g.items.push(it);
    else groups.push({ name: it.group, items: [it] });
  }

  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <Logo />
          <span className="brand-name">Moyu</span>
          <span className="brand-badge" title="這是遊戲">🎮</span>
        </div>
        <button type="button" className="new-chat" onClick={onNew}>
          <span aria-hidden="true">＋</span> 新對話
        </button>
        <nav className="history" aria-label="對話紀錄">
          {groups.map((g) => (
            <div key={g.name} className="history-group">
              <div className="history-label">{g.name}</div>
              {g.items.map((it) => (
                <button
                  type="button"
                  key={it.id}
                  className={`history-item ${it.id === activeId ? 'active' : ''}`}
                  onClick={() => onSelect(it.id)}
                >
                  {it.title}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button type="button" className="foot-item" disabled title="第 2 階段開放">
            📁 工作區 <span className="soon">即將推出</span>
          </button>
          <button type="button" className="foot-item" onClick={onSettings}>
            ⚙ 設定
          </button>
        </div>
      </aside>
    </>
  );
}
