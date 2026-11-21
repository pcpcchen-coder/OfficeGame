import { useEffect } from 'react';
import { FAKE_CHATS } from '../bosskey/fakeChats';
import type { Settings } from '../engine/storage';
import type { DailyStats, LifeStats, RogueStats } from '../engine/types';
import { ENDING_ORDER } from '../games/life/events';

interface Props {
  settings: Settings;
  stats: DailyStats;
  rogue: RogueStats;
  life: LifeStats;
  streak: number;
  onChange: (s: Settings) => void;
  onReset: () => void;
  onClose: () => void;
}

export function SettingsDialog({ settings, stats, rogue, life, streak, onChange, onReset, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const max = Math.max(1, ...stats.distribution);

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2 id="settings-title">設定</h2>
          <button type="button" className="notice-x" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </div>

        <section>
          <h3>老闆鍵</h3>
          <p className="hint">按 <kbd>Esc</kbd> 或連按兩下 <kbd>Shift</kbd> 切換。偽裝畫面裡輸入 <code>/mo</code> 也可以回來。</p>
          <label className="row">
            <span>偽裝畫面</span>
            <select value={settings.bossChat} onChange={(e) => onChange({ ...settings, bossChat: e.target.value })}>
              <option value="auto">每天輪替</option>
              {FAKE_CHATS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="row">
            <span>離開視窗時自動切換</span>
            <input
              type="checkbox"
              checked={settings.autoHideOnBlur}
              onChange={(e) => onChange({ ...settings, autoHideOnBlur: e.target.checked })}
            />
          </label>
        </section>

        <section>
          <h3>顯示</h3>
          <label className="row">
            <span>Mo 回覆前的「思考中」動畫</span>
            <input type="checkbox" checked={settings.animate} onChange={(e) => onChange({ ...settings, animate: e.target.checked })} />
          </label>
        </section>

        <section>
          <h3>每日提示詞成績</h3>
          <div className="stats">
            <div>
              <b>{stats.played}</b>
              <span>已玩</span>
            </div>
            <div>
              <b>{stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}%</b>
              <span>答對率</span>
            </div>
            <div>
              <b>{streak}</b>
              <span>連續答對</span>
            </div>
            <div>
              <b>{stats.maxStreak}</b>
              <span>最高連續</span>
            </div>
          </div>
          <div className="dist">
            {stats.distribution.map((n, i) => (
              <div key={i} className="dist-row">
                <span>{i + 1}</span>
                <div className="dist-bar" style={{ width: `${Math.max(6, (n / max) * 100)}%` }}>
                  {n}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3>Bug 地城成績</h3>
          <div className="stats">
            <div>
              <b>{rogue.runs}</b>
              <span>總局數</span>
            </div>
            <div>
              <b>{rogue.wins}</b>
              <span>準時下班</span>
            </div>
            <div>
              <b>{rogue.bestDepth}</b>
              <span>最深樓層</span>
            </div>
            <div>
              <b>{rogue.runs ? Math.round((rogue.wins / rogue.runs) * 100) : 0}%</b>
              <span>通關率</span>
            </div>
          </div>
        </section>

        <section>
          <h3>建議回覆人生</h3>
          <div className="stats">
            <div>
              <b>{life.runs}</b>
              <span>投過履歷</span>
            </div>
            <div>
              <b>{life.bestDays}</b>
              <span>最長天數</span>
            </div>
            <div>
              <b>
                {life.endings.length}/{ENDING_ORDER.length}
              </b>
              <span>結局收集</span>
            </div>
          </div>
        </section>

        <section>
          <h3>資料</h3>
          <p className="hint">所有進度只存在這台裝置的瀏覽器裡，不會上傳。</p>
          <button
            type="button"
            className="danger"
            onClick={() => {
              if (window.confirm('確定要清除所有進度嗎？這個動作無法復原。')) onReset();
            }}
          >
            清除所有進度
          </button>
        </section>
      </div>
    </div>
  );
}
