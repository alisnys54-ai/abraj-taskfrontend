'use client';
import { useState } from 'react';
import { useProject, SitePicker } from '@/components/platform/project-context';
import { usePermission } from '@/hooks/use-permission';
import { useGet, useAction, useL, dateAr, todayIso, apiErrorMessage, type Paged } from '@/lib/platform';
import { PageHeader, Loading, Pill, Field } from '@/components/platform/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState, Pagination } from '@/components/shared/states';
import { useToast } from '@/components/ui/toast';

interface Report { id: string; site: { code: string; name: string }; engineer: { full_name: string }; report_date: string; summary: string; workers: number; concrete_m3: number | null; status: 'done' | 'in_progress' }

export default function ReportsPage() {
  const { project, site } = useProject();
  const L = useL();
  const { can } = usePermission();
  const { push } = useToast();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGet<Paged<Report>>(`/projects/${project.key}/site-reports`, { site_code: site?.code, page, page_size: 15 });
  const create = useAction('post', [`/projects/${project.key}`]);
  const [f, setF] = useState({ report_date: todayIso(), summary: '', workers: '', concrete_m3: '', status: 'done' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!site) return;
    try {
      await create.mutateAsync({ url: `/projects/${project.key}/site-reports`, body: { site_code: site.code, report_date: f.report_date, summary: f.summary, workers: Number(f.workers), concrete_m3: f.concrete_m3 ? Number(f.concrete_m3) : undefined, status: f.status } });
      push(L('رُفع التقرير اليومي', 'Report filed')); setF({ ...f, summary: '', workers: '', concrete_m3: '' });
    } catch (err) { push(apiErrorMessage(err), 'error'); }
  };

  return (
    <>
      <PageHeader title={L('تقارير الموقع اليومية', 'Daily site reports')} subtitle={site?.name} actions={<SitePicker />} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-3">
          {isLoading && <Loading />}
          {data?.data.length === 0 && <EmptyState title={L('لا توجد تقارير لهذا الموقع', 'No reports yet')} />}
          {data?.data.map((r) => (
            <article key={r.id} className="rounded-xl border border-input bg-white p-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold">{dateAr(r.report_date)}</span>
                <span className="text-sm text-muted-foreground">· {r.engineer.full_name}</span>
                <Pill tone={r.status === 'done' ? 'green' : 'bronze'}>{r.status === 'done' ? L('منجز', 'Done') : L('مستمر', 'Ongoing')}</Pill>
              </div>
              <p className="text-sm leading-7 whitespace-pre-line">{r.summary}</p>
              <p className="text-xs text-muted-foreground mt-2">{L(`${r.workers} عامل`, `${r.workers} workers`)}{r.concrete_m3 ? ` · ${r.concrete_m3} م³ ${L('صب', 'concrete')}` : ''}</p>
            </article>
          ))}
          {data && data.meta.total_pages > 1 && <Pagination page={page} totalPages={data.meta.total_pages} onChange={setPage} />}
        </div>
        {can('re-site-reports', 'create') && site && (
          <form onSubmit={submit} className="rounded-xl border border-input bg-white p-4 space-y-3 lg:sticky lg:top-4">
            <h2 className="font-semibold">{L('تقرير اليوم', "Today's report")} — {site.name}</h2>
            <Field label={L('التاريخ', 'Date')} htmlFor="sr-d"><Input id="sr-d" type="date" max={todayIso()} value={f.report_date} onChange={(e) => setF({ ...f, report_date: e.target.value })} /></Field>
            <Field label={L('ما أُنجز اليوم *', 'Work done *')} htmlFor="sr-s"><textarea id="sr-s" required maxLength={4000} rows={4} className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={L('عدد العمال *', 'Workers *')} htmlFor="sr-w"><Input id="sr-w" required type="number" min={0} max={5000} dir="ltr" value={f.workers} onChange={(e) => setF({ ...f, workers: e.target.value })} /></Field>
              <Field label={L('صب (م³)', 'Concrete (m³)')} htmlFor="sr-c"><Input id="sr-c" type="number" min={0} step={0.5} dir="ltr" value={f.concrete_m3} onChange={(e) => setF({ ...f, concrete_m3: e.target.value })} /></Field>
            </div>
            <Field label={L('الحالة', 'Status')} htmlFor="sr-st"><Select id="sr-st" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="done">{L('منجز', 'Done')}</option><option value="in_progress">{L('مستمر', 'Ongoing')}</option></Select></Field>
            <Button type="submit" className="w-full" disabled={create.isPending}>{L('رفع التقرير', 'File report')}</Button>
          </form>
        )}
      </div>
    </>
  );
}
