const iconAvulso = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <path d="M5 4h14v16H5z" />
    <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
  </svg>
);
const iconFixo = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
  </svg>
);

const clienteTipoOptions = [
  { value: 'avulso' as const, label: 'Avulso', icon: iconAvulso },
  { value: 'fixo' as const, label: 'Fixo', icon: iconFixo },
];

/** Mesmo visual da listagem em Clientes (cadastro). */
export default function ClienteTipoBadge({ tipo }: { tipo: string }) {
  const opt = clienteTipoOptions.find((o) => o.value === tipo);
  if (!opt) {
    return <span className="text-sm capitalize text-slate-600">{tipo || '—'}</span>;
  }
  return (
    <div className="inline-flex max-w-full items-center gap-2.5">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200/80"
        aria-hidden
      >
        <span className="[&>svg]:h-4 [&>svg]:w-4">{opt.icon}</span>
      </span>
      <span className="min-w-0 text-sm font-medium text-slate-800">{opt.label}</span>
    </div>
  );
}
