import { useState } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { Eye, EyeOff, X } from 'lucide-react';

/** Brand logo — the same transparent PNG used in the prototype. */
export function Logo({ knockout = false, height = 34 }: { knockout?: boolean; height?: number }) {
  return (
    <img
      src="/zemen-logo.png"
      alt="Zemen Bank"
      style={{ height, width: 'auto', display: 'block' }}
      className={knockout ? 'logo-knockout' : 'logo'}
    />
  );
}

const AVATAR_COLORS = ['#ED1D24', '#1A1613', '#2B6CB0', '#1E7F4F', '#B8860B', '#7E0E12', '#C2410C', '#5A4FCF', '#0F766E'];

/** Initials avatar with a deterministic brand-palette color (ports ZB.avatarColor). */
export function Avatar({ seed, initials, size = 34 }: { seed: string; initials: string; size?: number }) {
  let s = 0;
  for (const c of seed) s += c.charCodeAt(0);
  const bg = AVATAR_COLORS[s % AVATAR_COLORS.length];
  return (
    <div className="avatar" style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}>
      {initials.toUpperCase()}
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** Labelled form field wrapper matching the design system's `.field`. */
export function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div className="field">
      <label>
        {label}
        {required && <span className="req">*</span>}
      </label>
      {children}
      {hint && <span className="hint">{hint}</span>}
      {error && <span className="errmsg">{error}</span>}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export function Input({ invalid, className, ...rest }: InputProps) {
  return <input className={`inp${invalid ? ' err' : ''}${className ? ` ${className}` : ''}`} {...rest} />;
}

/** Password field with a show/hide eye toggle, so a mistyped password can be checked. */
export function PasswordInput({ invalid, className, ...rest }: Omit<InputProps, 'type'>) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input
        {...rest}
        type={show ? 'text' : 'password'}
        className={`inp pw-inp${invalid ? ' err' : ''}${className ? ` ${className}` : ''}`}
      />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export function Textarea({ invalid, className, rows = 3, ...rest }: TextareaProps) {
  return (
    <textarea rows={rows} className={`inp${invalid ? ' err' : ''}${className ? ` ${className}` : ''}`} {...rest} />
  );
}

/** Stat card (dashboard metric). */
export function Stat({
  icon,
  value,
  label,
  accent,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className={`card stat${accent ? ' accent' : ''}`}>
      <div className="stat-ic">{icon}</div>
      <div>
        <div className="stat-val">{value}</div>
        <div className="stat-lab">{label}</div>
      </div>
    </div>
  );
}

/** Centered modal dialog with header/body/footer (matches `.modal`). */
export function Modal({
  title,
  width = 520,
  onClose,
  footer,
  children,
}: {
  title: string;
  width?: number;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontSize: 16 }}>{title}</h3>
          <button className="iconbtn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  options: string[];
  placeholder?: string;
};

export function Select({ invalid, className, options, placeholder, value, ...rest }: SelectProps) {
  return (
    <select className={`inp${invalid ? ' err' : ''}${className ? ` ${className}` : ''}`} value={value ?? ''} {...rest}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
