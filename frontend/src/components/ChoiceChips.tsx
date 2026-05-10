import type { ReactNode } from 'react';

interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface Props<T extends string> {
  legend: string;
  name: string;
  value: T;
  options: ReadonlyArray<ChoiceOption<T>>;
  onChange: (value: T) => void;
}

export default function ChoiceChips<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: Props<T>) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-2 text-sm font-medium text-slate-600">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                checked
                  ? 'border-brand-500 bg-brand-50 text-brand-800 ring-1 ring-brand-300/60'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.icon && (
                <span
                  aria-hidden
                  className={`grid h-5 w-5 place-items-center rounded-md ${
                    checked ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {option.icon}
                </span>
              )}
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
