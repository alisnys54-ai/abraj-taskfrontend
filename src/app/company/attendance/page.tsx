'use client';
import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import { useGet, useAction, useL, todayIso, dateAr, apiErrorMessage, type Paged } from '@/lib/platform';
import { PageHeader, Kpi, KpiGrid, TableShell, Th, Td, Loading } from '@/components/platform/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, Pagination } from '@/components/shared/states';
import { useToast } from '@/components/ui/toast';

type St = 'present' | 'late' | 'absent' | 'on_leave';
interface Row { employee: { id: string; employee_no: string; full_name: string; department: { name: string }; site: { name: string } | null }; record: { status: St; check_in: string | null; check_out: string | null; note: string | null } | null }
interface Summary { total_employees: number; present: number; late: number; absent: number; on_leave: number; not_recorded: number }
type Draft = { status: St; check_in?: string; check_out?: string };

export default function AttendancePage() {
  const L = useL();
  const { scopeFor } = usePermission();
  const { push } = useToast();
  const [date, setDate] = useState(todayIso());
  const [page, setPage] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const { data, isLoading } = useGet<Paged<Row>>('/hr/attendance', { date, page, page_size: 50 });
  const summary = useGet<Summary>('/hr/attendance/summary', { date });
  const save = useAction('put', ['/hr/attendance']);
  const canRecord = (() => { const s = scopeFor('hr-attendance', 'create'); return s === 'all' || s === 'department'; })();
  useEffect(() => setDrafts({}), [date, page]);

  const S: Record<St, string> = { present: L('حاضر', 'Present'), late: L('متأخر', 'Late'), absent: L('غائب', 'Absent'), on_leave: L('إجازة', 'Leave') };
  const effective = (r: Row): Draft | null => drafts[r.employee.id] ?? (r.record ? { status: r.record.status, check_in: r.record.check_in ?? undefined, check_out: r.record.check_out ?? undefined } : null);
  const dirty = Object.keys(drafts).length;
  const isFuture = date > todayIso();

  const markAll = (st: St) => setDrafts((d) => {
    const next = { ...d };
    data?.data.forEach((r) => { if (!effective(r)) next[r.employee.id] = { status: st, check_in: st === 'present' ? '07:00' : undefined }; });
    return next;
  });

  const submit = async () => {
    try {
      await save.mutateAsync({ url: '/hr/attendance', body: { date, records: Object.entries(drafts).map(([employee_id, d]) => ({ employee_id, ...d })) } });
      push(L(`حُفظ دوام ${dirty} موظف`, `Saved ${dirty} records`)); setDrafts({});
    } catch (e) { push(apiErrorMessage(e), 'error'); }
  };

  const s = summary.data;
  const unrecordedOnPage = useMemo(() => data?.data.filter((r) => !effective(r)).length ?? 0, [data, drafts]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader title={L('الحضور والدوام', 'Attendance')} subtitle={dateAr(date)}
        actions={<div className="flex items-center gap-2">
          <label htmlFor="att-date" className="text-xs text-muted-foreground">{L('اليوم', 'Day')}</label>
          <Input id="att-date" type="date" value={date} max={todayIso()} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="w-40" />
        </div>} />
      {s && (
        <KpiGrid>
          <Kpi label={L('حاضرون', 'Present')} value={s.present} tone="green" hint={L(`من ${s.total_employees}`, `of ${s.total_employees}`)} />
          <Kpi label={L('متأخرون', 'Late')} value={s.late} tone="bronze" />
          <Kpi label={L('غائبون', 'Absent')} value={s.absent} tone="red" />
          <Kpi label={L('إجازات', 'On leave')} value={s.on_leave} />
          <Kpi label={L('لم يُسجَّل', 'Not recorded')} value={s.not_recorded} tone={s.not_recorded ? 'red' : 'navy'} />
        </KpiGrid>
      )}
      {canRecord && !isFuture && unrecordedOnPage > 0 && (
        <div className="flex flex-wrap items-center gap-2 my-4 rounded-lg border border-input bg-white p-3 text-sm">
          <span>{L(`${unrecordedOnPage} موظف بدون تسجيل في هذه الصفحة —`, `${unrecordedOnPage} unrecorded on this page —`)}</span>
          <Button size="sm" variant="secondary" onClick={() => markAll('present')}>{L('تسجيل الباقين حاضرين', 'Mark rest present')}</Button>
        </div>
      )}
      {isLoading && <Loading />}
      {data && data.data.length === 0 && <EmptyState title={L('لا يوجد موظفون في نطاقك', 'No employees in your scope')} />}
      {data && data.data.length > 0 && (
        <TableShell>
          <thead><tr><Th>{L('الموظف', 'Employee')}</Th><Th>{L('القسم / الموقع', 'Dept / site')}</Th><Th>{L('الحالة', 'Status')}</Th><Th>{L('دخول', 'In')}</Th><Th>{L('خروج', 'Out')}</Th></tr></thead>
          <tbody>
            {data.data.map((r) => {
              const d = effective(r); const id = r.employee.id;
              const upd = (patch: Partial<Draft>) => setDrafts((x) => ({ ...x, [id]: { ...(d ?? { status: 'present' }), ...patch } as Draft }));
              return (
                <tr key={id} className={drafts[id] ? 'bg-bronze/5' : undefined}>
                  <Td><div className="font-medium">{r.employee.full_name}</div><div className="text-[11px] text-muted-foreground" dir="ltr">{r.employee.employee_no}</div></Td>
                  <Td className="text-muted-foreground">{r.employee.department.name}{r.employee.site ? ` · ${r.employee.site.name}` : ''}</Td>
                  <Td>
                    {canRecord && !isFuture ? (
                      <div role="radiogroup" aria-label={`${L('حالة', 'Status of')} ${r.employee.full_name}`} className="flex gap-1">
                        {(Object.keys(S) as St[]).map((k) => (
                          <button key={k} role="radio" aria-checked={d?.status === k} onClick={() => upd({ status: k })}
                            className={`rounded-md px-2 py-1 text-xs border ${d?.status === k ? 'bg-primary text-white border-primary' : 'border-input hover:bg-muted'}`}>{S[k]}</button>
                        ))}
                      </div>
                    ) : <span className="text-xs">{d ? S[d.status] : '—'}</span>}
                  </Td>
                  <Td><Input aria-label={L('وقت الدخول', 'Check-in')} type="time" className="h-8 w-28" dir="ltr" disabled={!canRecord || !d || d.status === 'absent' || d.status === 'on_leave'} value={d?.check_in ?? ''} onChange={(e) => upd({ check_in: e.target.value || undefined })} /></Td>
                  <Td><Input aria-label={L('وقت الخروج', 'Check-out')} type="time" className="h-8 w-28" dir="ltr" disabled={!canRecord || !d || d.status === 'absent' || d.status === 'on_leave'} value={d?.check_out ?? ''} onChange={(e) => upd({ check_out: e.target.value || undefined })} /></Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
      {data && data.meta.total_pages > 1 && <Pagination page={page} totalPages={data.meta.total_pages} onChange={setPage} />}
      {dirty > 0 && (
        <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-3 rounded-xl bg-primary text-white px-4 py-3 shadow-lg">
          <span className="text-sm">{L(`${dirty} تغيير غير محفوظ`, `${dirty} unsaved changes`)}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setDrafts({})}>{L('تراجع', 'Discard')}</Button>
            <Button size="sm" variant="accent" onClick={submit} disabled={save.isPending}><Save className="h-4 w-4" />{L('حفظ الدوام', 'Save')}</Button>
          </div>
        </div>
      )}
    </>
  );
}
