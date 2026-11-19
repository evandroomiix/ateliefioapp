import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-rose-600">
          {eyebrow}
        </p>
        <h1 className="font-display text-[1.7rem] font-semibold leading-tight text-stone-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 max-w-md text-sm leading-snug text-stone-500">{description}</p>
      </div>
      {action ? <div className="shrink-0 pb-0.5">{action}</div> : null}
    </header>
  );
}

export function SectionTitle({
  children,
  description,
}: {
  children: ReactNode;
  description?: string;
}) {
  return (
    <div className="mb-3 mt-6 flex items-end justify-between gap-2">
      <div>
        <h2 className="font-display text-lg font-semibold text-stone-900">{children}</h2>
        {description ? <p className="text-xs text-stone-500">{description}</p> : null}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-3 shadow-sm">
      <div className="mb-1.5 flex items-center gap-1.5 text-stone-400">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="truncate text-lg font-bold text-stone-900">{value}</p>
    </div>
  );
}
