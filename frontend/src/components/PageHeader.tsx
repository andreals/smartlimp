import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  /** Sem separador inferior / menos margem — layouts densos (ex.: comanda). */
  dense?: boolean;
}

export default function PageHeader({ title, subtitle, actions, icon, dense }: Props) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${
        dense ? 'mb-3 gap-2' : 'mb-8 gap-4 border-b border-slate-200/80 pb-6'
      }`}
    >
      <div className="min-w-0 flex items-center gap-3">
        {icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            {icon}
          </span>
        )}
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h1 className="leading-tight">{title}</h1>
          {subtitle && (
            <p className="max-w-2xl text-sm leading-snug text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
