import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { COUNTRIES_FULL, countryCode } from '../lib/countries';

interface Props {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  invalid?: boolean;
}

/** Searchable country combobox with real SVG flags (flag-icons). Stores the
 *  country *name* (matches the backend's free-text country/nationality fields). */
export function CountrySelect({ value, onChange, placeholder = 'Select country', invalid }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedCode = countryCode(value);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES_FULL;
    return COUNTRIES_FULL.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Focus the search box when opening; reset filter.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  function choose(name: string) {
    onChange(name);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) choose(results[active].name);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // Keep the highlighted option in view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <div className={`combo${open ? ' open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`inp combo-control${invalid ? ' err' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value ? (
          <span className="combo-value">
            {selectedCode && <span className={`fi fi-${selectedCode}`} />}
            {value}
          </span>
        ) : (
          <span className="combo-placeholder">{placeholder}</span>
        )}
        <ChevronDown size={16} className="combo-chev" />
      </button>

      {open && (
        <div className="combo-panel">
          <div className="combo-search">
            <Search size={15} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search countries…"
            />
          </div>
          <div className="combo-list" ref={listRef} role="listbox">
            {results.length === 0 && <div className="combo-empty">No match</div>}
            {results.map((c, i) => (
              <button
                key={c.code}
                type="button"
                data-i={i}
                className={`combo-opt${i === active ? ' active' : ''}${c.name === value ? ' selected' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(c.name)}
              >
                <span className={`fi fi-${c.code}`} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
