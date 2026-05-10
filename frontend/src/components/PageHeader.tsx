import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Sem separador inferior / menos margem — layouts densos (ex.: comanda). */
  dense?: boolean;
}

export default function PageHeader({ title, subtitle, actions, dense }: Props) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${
        dense ? 'mb-3 gap-2' : 'mb-8 gap-4 border-b border-slate-200/80 pb-6'
      }`}
    >
      <div className="min-w-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h1 className="leading-tight">{title}</h1>
        {subtitle && (
          <p className="max-w-2xl text-sm leading-snug text-slate-500">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
