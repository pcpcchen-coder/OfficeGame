import { useEffect, useRef, useState } from 'react';
import type { GameId } from '../engine/types';
import { daysUntilRelease, isReleased, MODEL_MENU } from '../games/registry';

interface Props {
  current: GameId;
  onPick: (id: GameId) => void;
  now: Date;
  preview: boolean;
}

/** 看起來是在換模型，其實是在換遊戲 */
export function ModelPicker({ current, onPick, now, preview }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentName = MODEL_MENU.find((m) => m.id === current)?.modelName ?? current;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="model-picker" ref={ref}>
      <button type="button" className="model-button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        {currentName} <span className="chev" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="model-menu" role="listbox">
          {MODEL_MENU.map((m) => {
            const released = m.available && isReleased(m, now, preview);
            const release = m.releaseDate;
            const days = daysUntilRelease(m, now);
            return (
            <li key={m.id}>
              <button
                type="button"
                role="option"
                aria-selected={m.id === current}
                disabled={!released}
                className={m.id === current ? 'selected' : undefined}
                onClick={() => {
                  setOpen(false);
                  if (released) onPick(m.id);
                }}
              >
                <span className="model-name">{m.modelName}</span>
                <span className="model-desc">
                  {m.description}
                  {!released && release ? `（${release.slice(5).replace('-', '/')} 上線 · 還有 ${days} 天）` : ''}
                  {released && release && preview && days > 0 ? '（預覽）' : ''}
                </span>
                {m.id === current && <span className="check" aria-hidden="true">✓</span>}
              </button>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
