import { useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CALIBERS, CATEGORY_NAMES } from '@perround/shared';

// "5.56", "556", ".223 rem" and "223" should all find what people mean
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function CaliberSearch({ compact = false, autoFocus = false }: { compact?: boolean; autoFocus?: boolean }) {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = squash(text);
    if (!q) return [];
    const scored = CALIBERS.map((c) => {
      const n = squash(c.name);
      const s = squash(c.slug);
      const score = n.startsWith(q) || s.startsWith(q) ? 0 : n.includes(q) || s.includes(q) ? 1 : -1;
      return { c, score: score === -1 ? -1 : score * 10 + (c.popular ? 0 : 1) };
    })
      .filter((m) => m.score >= 0)
      .sort((a, b) => a.score - b.score);
    return scored.slice(0, 8).map((m) => m.c);
  }, [text]);

  const go = (slug: string) => {
    setText('');
    setOpen(false);
    input.current?.blur();
    navigate(`/ammo/${slug}`);
  };

  return (
    <div className={`csearch${compact ? ' csearch-compact' : ''}`}>
      <label htmlFor={`${listId}-input`} className="visually-hidden">
        Find a caliber
      </label>
      <input
        id={`${listId}-input`}
        ref={input}
        type="search"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={compact ? 'Find a caliber' : 'Find a caliber, like 9mm or 5.56'}
        value={text}
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && matches[active]) {
            e.preventDefault();
            go(matches[active].slug);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && text && (
        <ul id={listId} role="listbox" className="csearch-list">
          {matches.length ? (
            matches.map((c, i) => (
              <li
                key={c.slug}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'active' : undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(c.slug);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span>{c.name}</span>
                <small>{CATEGORY_NAMES[c.category]}</small>
              </li>
            ))
          ) : (
            <li className="csearch-none">No caliber by that name yet. Try fewer letters, like "308" or "12 ga".</li>
          )}
        </ul>
      )}
    </div>
  );
}
