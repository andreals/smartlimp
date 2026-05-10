import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

export type AutocompleteOption = { value: string; label: string };

type Props = {
  id?: string;
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

type MenuRect = { top: number; left: number; width: number; maxHeight: number };

export default function AutocompleteSelect({
  id: idProp,
  options,
  value,
  onChange,
  placeholder = '',
  className = '',
  disabled = false,
}: Props) {
  const genId = useId();
  const id = idProp ?? genId;
  const listId = `${id}-list`;

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickingRef = useRef(false);

  const selectedLabel = useMemo(() => {
    const o = options.find((x) => x.value === value);
    return o?.label ?? '';
  }, [options, value]);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState(selectedLabel);
  const [highlight, setHighlight] = useState(0);
  const [menuRect, setMenuRect] = useState<MenuRect | null>(null);

  useEffect(() => {
    setText(selectedLabel);
  }, [selectedLabel]);

  const filtered = useMemo(() => {
    const q = normalize(text);
    if (!q) return options;
    const sel = options.find((o) => o.value === value);
    if (sel && text === sel.label) return options;
    return options.filter((o) => normalize(o.label).includes(q));
  }, [options, text, value]);

  useEffect(() => {
    setHighlight(0);
  }, [filtered, open]);

  const updateMenuRect = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const r = input.getBoundingClientRect();
    const gap = 4;
    const top = r.bottom + gap;
    const viewportH = window.innerHeight;
    const maxHeight = Math.max(120, Math.min(240, viewportH - top - 12));
    setMenuRect({ top, left: r.left, width: r.width, maxHeight });
  }, []);

  const showList = open && !disabled && filtered.length > 0;

  useLayoutEffect(() => {
    if (!showList) {
      setMenuRect(null);
      return;
    }
    updateMenuRect();
    const onReposition = () => updateMenuRect();
    window.addEventListener('resize', onReposition);
    document.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      document.removeEventListener('scroll', onReposition, true);
    };
  }, [showList, updateMenuRect, text, filtered.length]);

  const commitText = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        onChange('');
        setText('');
        return;
      }
      const exact = options.find((o) => normalize(o.label) === normalize(trimmed));
      if (exact) {
        onChange(exact.value);
        setText(exact.label);
        return;
      }
      const matches = options.filter((o) => normalize(o.label).includes(normalize(trimmed)));
      if (matches.length === 1) {
        onChange(matches[0].value);
        setText(matches[0].label);
        return;
      }
      setText(selectedLabel);
    },
    [options, onChange, selectedLabel],
  );

  const pick = (opt: AutocompleteOption) => {
    pickingRef.current = true;
    onChange(opt.value);
    setText(opt.label);
    setOpen(false);
    inputRef.current?.blur();
    requestAnimationFrame(() => {
      pickingRef.current = false;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setHighlight((h) => Math.min(h + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && filtered[highlight]) pick(filtered[highlight]);
      else setOpen(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setText(selectedLabel);
    }
  };

  const listEl =
    showList && menuRect && typeof document !== 'undefined'
      ? createPortal(
          <ul
            id={listId}
            role="listbox"
            style={{
              position: 'fixed',
              top: menuRect.top,
              left: menuRect.left,
              width: menuRect.width,
              maxHeight: menuRect.maxHeight,
              zIndex: 100000,
            }}
            className="overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5"
          >
            {filtered.map((opt, i) => (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  className={`flex w-full px-3.5 py-2.5 text-left text-sm ${
                    i === highlight ? 'bg-brand-50 text-brand-900' : 'text-slate-800 hover:bg-slate-50'
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(opt)}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={placeholder}
          className="input mt-1 w-full cursor-text pr-10"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            requestAnimationFrame(() => {
              if (pickingRef.current) return;
              if (containerRef.current?.contains(document.activeElement)) return;
              setOpen(false);
              commitText(inputRef.current?.value ?? '');
            });
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          className="absolute right-0 top-1/2 mt-0.5 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-50"
          aria-label="Abrir lista"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (disabled) return;
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {listEl}
    </div>
  );
}
