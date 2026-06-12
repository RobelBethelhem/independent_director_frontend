import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** When true, lets the user enter a custom value not in the list ("Other"). */
  allowCustom?: boolean;
  invalid?: boolean;
}

/** Generic searchable single-select combobox (no flags). Optionally creatable. */
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Select',
  searchPlaceholder = 'Search…',
  allowCustom = false,
  invalid,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [query, options]);

  const trimmed = query.trim();
  const canCreate = allowCustom && trimmed.length > 0 && !options.some((o) => o.toLowerCase() === trimmed.toLowerCase());
  const rowCount = results.length + (canCreate ? 1 : 0);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function choose(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(rowCount - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active < results.length) choose(results[active]);
      else if (canCreate) choose(trimmed);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className={`combo${open ? ' open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`inp combo-control${invalid ? ' err' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value ? <span className="combo-value">{value}</span> : <span className="combo-placeholder">{placeholder}</span>}
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
              placeholder={searchPlaceholder}
            />
          </div>
          <div className="combo-list" ref={listRef} role="listbox">
            {results.length === 0 && !canCreate && <div className="combo-empty">No match</div>}
            {results.map((o, i) => (
              <button
                key={o}
                type="button"
                data-i={i}
                className={`combo-opt${i === active ? ' active' : ''}${o === value ? ' selected' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
              >
                <span>{o}</span>
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                data-i={results.length}
                className={`combo-opt${active === results.length ? ' active' : ''}`}
                onMouseEnter={() => setActive(results.length)}
                onClick={() => choose(trimmed)}
                style={{ color: 'var(--brand)', fontWeight: 600 }}
              >
                <Plus size={14} /> <span>Use “{trimmed}”</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
