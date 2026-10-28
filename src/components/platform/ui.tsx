'use client';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Kpi({ label, value, hint, tone = 'navy' }: { label: string; value: React.ReactNode; hint?: string; tone?: 'navy' | 'bronze' | 'red' | 'green' }) {
  const color = { navy: 'text-primary', bronze: 'text-accent', red: 'text-destructive', green: 'text-success' }[tone];
  return (
    <div className="rounded-xl border border-bronze/35 bg-white p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-2xl font-bold mt-1', color)}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3 mb-5">{children}</div>;
}

export function Chips<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map(([v, t]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}
          className={cn('min-h-[36px] rounded-full border px-3.5 text-xs font-medium', v === value ? 'bg-primary text-white border-primary' : 'bg-white border-input text-muted-foreground hover:text-foreground')}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function TableShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-input bg-white overflow-x-auto"><table className="w-full text-sm">{children}</table></div>;
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th scope="col" className={cn('text-start font-medium text-xs text-muted-foreground px-3 py-2.5 border-b border-input whitespace-nowrap bg-muted/50', className)}>{children}</th>;
}
export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('px-3 py-2.5 border-b border-input/70 align-middle', className)}>{children}</td>;
}

export function Loading({ rows = 5 }: { rows?: number }) {
  return <div className="flex flex-col gap-2">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>;
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium">{label}</label>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: 'bg-success/10 text-success', bronze: 'bg-bronze/20 text-bronze-dark', red: 'bg-destructive/10 text-destructive',
  navy: 'bg-primary/10 text-primary', gray: 'bg-muted text-muted-foreground',
};
export function Pill({ tone = 'gray', children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', TONES[tone])}>{children}</span>;
}

/** Simple accessible bar chart (values labelled, summarised for screen readers). */
export function Bars({ items, format = (v) => String(v), label }: { items: { label: string; value: number; highlight?: boolean }[]; format?: (v: number) => string; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <figure role="img" aria-label={`${label}: ${items.map((i) => `${i.label} ${format(i.value)}`).join('، ')}`} className="m-0">
      <div className="flex items-end gap-3 h-44 border-b border-input">
        {items.map((i) => (
          <div key={i.label} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
            <span className="text-[11px] text-muted-foreground">{format(i.value)}</span>
            <div className={cn('w-full max-w-[44px] rounded-t-md', i.highlight ? 'bg-bronze' : 'bg-primary/80')} style={{ height: `${Math.max(2, (i.value / max) * 85)}%` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-1.5">{items.map((i) => <span key={i.label} className="flex-1 text-center text-[11px] text-muted-foreground">{i.label}</span>)}</div>
    </figure>
  );
}
