import { useEffect, useId, useRef } from 'react';
import { brDateToIso, isoToBrDate, maskDateBR } from '@/lib/format';

function CalendarGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.5 3v3M16.5 3v3M4.5 8.25h15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="15.5"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 12.5h.01M12 12.5h.01M16 12.5h.01M8 16h.01M12 16h.01M16 16h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}

/**
 * Campo de data em dd/mm/aaaa + seletor nativo.
 * O type="date" fica invisível sobre o botão do calendário (evita bugs de showPicker/sr-only).
 */
export default function DateField({ id, label, value, onChange, required }: Props) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const pickerId = useId();
  const iso = brDateToIso(value);

  useEffect(() => {
    const el = pickerRef.current;
    if (!el) return;
    const next = iso || '';
    if (el.value !== next) el.value = next;
  }, [iso, value]);

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <div className="relative mt-1">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className="input w-full pr-[3.25rem]"
          placeholder="dd/mm/aaaa"
          value={value}
          onChange={(e) => onChange(maskDateBR(e.target.value))}
          required={required}
        />

        {/* Área do calendário: input nativo por cima (clique real no control) + arte por baixo */}
        <div className="absolute right-1.5 top-1/2 z-10 h-9 w-9 -translate-y-1/2">
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50 text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.04]"
            aria-hidden
          >
            <CalendarGlyph className="h-[1.05rem] w-[1.05rem]" />
          </span>
          <input
            id={pickerId}
            ref={pickerRef}
            type="date"
            lang="pt-BR"
            className="relative z-10 h-9 w-9 cursor-pointer opacity-0"
            aria-label={`Calendário para ${label}`}
            onChange={(e) => {
              const br = isoToBrDate(e.target.value);
              if (br) onChange(br);
            }}
          />
        </div>
      </div>
    </div>
  );
}
