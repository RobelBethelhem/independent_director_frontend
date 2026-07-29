import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';

/** Uppercase divider heading for a sub-section within a step. */
export function SectionBlock({
  title,
  children,
  first,
  required,
  dataTour,
}: {
  title: string;
  children: ReactNode;
  first?: boolean;
  required?: boolean;
  dataTour?: string;
}) {
  return (
    <div className="section-block" data-tour={dataTour} style={first ? { marginTop: 0 } : undefined}>
      <div className="sb-h">
        {title}
        {required && <span className="req" style={{ marginLeft: 3 }}>*</span>}
      </div>
      {children}
    </div>
  );
}

interface EntryListProps<T> {
  items: T[];
  onChange: (next: T[]) => void;
  blank: () => T;
  addLabel: string;
  min?: number;
  render: (item: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
}

/**
 * Repeatable entry cards with add/remove. Mirrors the prototype's EntryList:
 * a min count is enforced (the delete icon hides once at the minimum).
 */
export function EntryList<T>({ items, onChange, blank, addLabel, min = 0, render }: EntryListProps<T>) {
  const update = (index: number, patch: Partial<T>) => {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div>
      {items.map((it, i) => (
        <div key={i} className="entry">
          {items.length > min && (
            <button
              className="iconbtn entry-del"
              style={{ width: 30, height: 30 }}
              onClick={() => remove(i)}
              title="Remove"
              type="button"
            >
              <Trash2 size={15} />
            </button>
          )}
          {render(it, i, (patch) => update(i, patch))}
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => onChange([...items, blank()])}>
        <Plus size={15} /> {addLabel}
      </button>
    </div>
  );
}

/** Multi-select pill toggles (areas of expertise). */
export function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="chipset">
      {options.map((o) => (
        <div
          key={o}
          className={`chip-toggle${value.includes(o) ? ' on' : ''}`}
          onClick={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])}
        >
          {o}
        </div>
      ))}
    </div>
  );
}

/** Yes/No toggle for a declaration item. */
export function YesNo({ value, onChange }: { value?: 'yes' | 'no'; onChange: (v: 'yes' | 'no') => void }) {
  return (
    <div className="yesno">
      <button type="button" className={`yes${value === 'yes' ? ' on' : ''}`} onClick={() => onChange('yes')}>
        Yes
      </button>
      <button type="button" className={`no${value === 'no' ? ' on' : ''}`} onClick={() => onChange('no')}>
        No
      </button>
    </div>
  );
}
