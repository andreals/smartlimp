export type TipoServico = 'lavar' | 'passar' | 'lavarpassar' | 'tingir';

function IconLavar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <circle cx="12" cy="13" r="3.25" />
      <path strokeLinecap="round" d="M8 7.5h8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 13h.01M12 13h.01M14 13h.01" />
    </svg>
  );
}

/** Ferro de passar: corpo + sola (leitura clara em tamanho pequeno). */
function IconPassar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="7" y="5.5" width="10" height="8.5" rx="2" />
      <rect x="3.75" y="15" width="16.5" height="3.5" rx="1.2" />
    </svg>
  );
}

function IconLavarPassar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden>
      <rect x="4.5" y="5" width="15" height="14" rx="2" />
      <circle cx="12" cy="12" r="2.75" />
      <path strokeLinecap="round" d="M8 7h8" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 4.5l1 1M19 3.5l-1 1M18 5.5h2.5M18 3v2.5"
        className="opacity-90"
      />
    </svg>
  );
}

function IconTingir({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16c2-4 5.5-6 8-9s4-4 4-6c0-1.5-1-2.5-2.5-2.5S11 2 11 4c0 3 3 5 5 8s3.5 5.5 2.5 7.5H4z"
      />
      <circle cx="16" cy="8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="13" cy="10" r="0.9" fill="currentColor" stroke="none" opacity="0.7" />
      <circle cx="15.5" cy="11.5" r="0.75" fill="currentColor" stroke="none" opacity="0.55" />
    </svg>
  );
}

const OPTIONS: {
  value: TipoServico;
  label: string;
  hint: string;
  Icon: typeof IconLavar;
}[] = [
  { value: 'lavar', label: 'Lavar', hint: 'Só lavagem', Icon: IconLavar },
  { value: 'passar', label: 'Passar', hint: 'Passadoria', Icon: IconPassar },
  { value: 'lavarpassar', label: 'Lavar e passar', hint: 'Serviço completo', Icon: IconLavarPassar },
  { value: 'tingir', label: 'Tingir', hint: 'Coloração', Icon: IconTingir },
];

interface Props {
  name: string;
  value: TipoServico | '';
  onChange: (v: TipoServico | '') => void;
  legend?: string;
}

export default function TipoServicoRadios({ name, value, onChange, legend = 'Tipo de serviço' }: Props) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1.5 text-sm font-medium text-slate-600">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {OPTIONS.map(({ value: v, label, hint, Icon }) => {
          const checked = value === v;
          return (
            <label
              key={v}
              className={`relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition ${
                checked
                  ? 'border-brand-500 bg-gradient-to-b from-brand-50/90 to-white shadow-sm shadow-brand-500/10 ring-1 ring-brand-500/25'
                  : 'border-slate-200/90 bg-white/80 hover:border-slate-300 hover:bg-slate-50/80'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={v}
                checked={checked}
                onChange={() => onChange(v)}
                className="sr-only"
              />
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  checked ? 'bg-brand-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 px-0.5">
                <div className={`text-xs font-semibold leading-tight ${checked ? 'text-brand-900' : 'text-slate-800'}`}>
                  {label}
                </div>
                <div className="mt-0.5 text-[10px] leading-snug text-slate-500">{hint}</div>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
