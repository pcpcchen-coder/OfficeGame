import { useState } from 'react';
import type { Block } from '../engine/types';

function CopyButton({ text, label = '複製' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪貼簿不可用時不做事
    }
  };
  return (
    <button type="button" className="copy-btn" onClick={copy}>
      {copied ? '已複製' : label}
    </button>
  );
}

export function MessageBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'text':
            return (
              <p key={i} className={b.tone ? `tone-${b.tone}` : undefined}>
                {b.text}
              </p>
            );
          case 'heading':
            return <h3 key={i}>{b.text}</h3>;
          case 'list': {
            const items = b.items.map((it, j) => (
              <li key={j} className={[it.redacted ? 'redacted' : '', it.fresh ? 'fresh' : ''].join(' ').trim() || undefined}>
                {it.redacted ? (
                  <span className="redacted-bar" aria-label="（被遮住的內容）">
                    {'█'.repeat(Math.max(8, Math.min(22, it.text.length)))}
                  </span>
                ) : (
                  it.text
                )}
              </li>
            ));
            return b.ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>;
          }
          case 'code':
            return (
              <div key={i} className="code-block">
                <div className="code-head">
                  <span>{b.lang ?? 'text'}</span>
                  <CopyButton text={b.text} />
                </div>
                <pre>
                  <code>{b.text}</code>
                </pre>
              </div>
            );
          case 'table':
            return (
              <div key={i} className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {b.headers.map((h, j) => (
                        <th key={j} className={b.align?.[j] === 'left' ? 'col-text' : undefined}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) => (
                          <td key={k} className={b.align?.[k] === 'left' ? 'col-text' : undefined}>
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'share':
            return (
              <div key={i} className="code-block share">
                <div className="code-head">
                  <span>log</span>
                  <CopyButton text={b.text} label="複製成績" />
                </div>
                <pre>
                  <code>{b.text}</code>
                </pre>
              </div>
            );
        }
      })}
    </>
  );
}
