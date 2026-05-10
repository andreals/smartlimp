import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
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
