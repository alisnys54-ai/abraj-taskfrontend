'use client';
import Link from 'next/link';
import { MapPin, ArrowLeft } from 'lucide-react';
import { useGet, useL } from '@/lib/platform';
import { PageHeader, Loading, Pill } from '@/components/platform/ui';
import { EmptyState } from '@/components/shared/states';

export interface ProjectSite { id: string; code: string; name: string; location: string; license: string | null; cost_label: string | null; authority: string | null; progress: number; phase: string | null; total_units: number }
export interface Project { id: string; key: string; name: string; kind: string; portal: string | null; governorate: string | null; description: string | null; sites: ProjectSite[] }

export default function ProjectsPage() {
  const L = useL();
  const { data, isLoading } = useGet<Project[]>('/projects');
  return (
    <>
      <PageHeader title={L('المشاريع والاستثمارات', 'Projects & investments')} subtitle={L('كل مشاريع الشركة ومواقعها ونسب الإنجاز', 'Every project, site and progress')} />
      {isLoading && <Loading />}
      {data?.length === 0 && <EmptyState title={L('لا توجد مشاريع', 'No projects')} />}
      <div className="grid md:grid-cols-2 gap-4">
        {data?.map((p) => (
          <article key={p.id} className="rounded-xl border border-input bg-white p-5 flex flex-col">
            <div className="flex items-start gap-2 mb-1">
              <h2 className="font-semibold text-lg flex-1">{p.name}</h2>
              <Pill tone={p.portal ? 'bronze' : 'navy'}>{p.kind}</Pill>
            </div>
            {p.governorate && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><MapPin className="h-3 w-3" />{p.governorate}</p>}
            {p.description && <p className="text-sm text-muted-foreground mb-3 leading-6">{p.description}</p>}
            <ul className="space-y-3 mb-4">
              {p.sites.map((s) => (
                <li key={s.id}>
                  <div className="flex justify-between text-sm mb-1"><span className="font-medium">{s.name}</span><span className="text-muted-foreground">{s.progress}%{s.phase ? ` · ${s.phase}` : ''}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={s.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${L('إنجاز', 'Progress')} ${s.name}`}><div className="h-full bg-bronze" style={{ width: `${s.progress}%` }} /></div>
                  <div className="text-[11px] text-muted-foreground mt-1">{s.location}{s.total_units ? ` · ${L(`${s.total_units} وحدة`, `${s.total_units} units`)}` : ''}{s.cost_label ? ` · ${s.cost_label}` : ''}</div>
                </li>
              ))}
            </ul>
            <Link href={`/p/${p.key}`} className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline self-start">
              {p.portal ? L('فتح بوابة المشروع', 'Open project portal') : L('تفاصيل المشروع', 'Project details')}<ArrowLeft className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
