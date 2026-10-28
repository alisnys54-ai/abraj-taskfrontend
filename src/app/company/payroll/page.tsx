'use client';
import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import { useAuth } from '@/hooks/use-auth';
import { useGet, useAction, useL, money, AR_MONTHS, apiErrorMessage, type Paged } from '@/lib/platform';
import { PageHeader, Kpi, KpiGrid, TableShell, Th, Td, Loading, Pill } from '@/components/platform/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState, Pagination } from '@/components/shared/states';
import { useToast } from '@/components/ui/toast';

type PStatus = 'draft' | 'review' | 'approved' | 'paid';
interface Period { id: string; year: number; month: number; status: PStatus; created_by: { id: string; full_name: string } | null; approved_by: { full_name: string } | null; entries_total: number; visible_entries: number; totals: { base_salary: number; allowances: number; deductions: number; advances: number; net_pay: number } }
interface Entry { id: string; employee: { full_name: string; employee_no: string; department: { name: string } }; base_salary: number; allowances: number; deductions: number; advances: number; net_pay: number }
const TONE = { draft: 'gray', review: 'bronze', approved: 'navy', paid: 'green' } as const;

export default function PayrollPage() {
  const L = useL();
  const { scopeFor } = usePermission();
  const { user } = useAuth();
  const { push } = useToast();
  const periods = useGet<Period[]>('/payroll/periods');
  const [sel, setSel] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { if (!sel && periods.data?.length) setSel(periods.data[0].id); }, [periods.data, sel]);
  const period = periods.data?.find((p) => p.id === sel);
  const entries = useGet<Paged<Entry>>(sel ? `/payroll/periods/${sel}/entries` : null, { page, page_size: 50 });
  const post = useAction('post', ['/payroll']);
  const patch = useAction('patch', ['/payroll']);
  // Mirrors the API: open = create, edit/submit = edit, approve = approve, mark paid = manage — all company-wide.
  const canOpen = scopeFor('payroll', 'create') === 'all';
  const canWrite = scopeFor('payroll', 'edit') === 'all';
  const canApprove = scopeFor('payroll', 'approve') === 'all';
  const canPay = scopeFor('payroll', 'manage') === 'all';
  const S: Record<PStatus, string> = { draft: L('مسودة', 'Draft'), review: L('قيد المراجعة', 'In review'), approved: L('معتمدة', 'Approved'), paid: L('مصروفة', 'Paid') };
  const now = new Date();
  const [ny, setNy] = useState(now.getFullYear());
  const [nm, setNm] = useState(now.getMonth() + 1);

  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); push(ok); } catch (e) { push(apiErrorMessage(e), 'error'); } };
  const editable = canWrite && period?.status === 'draft';

  return (
    <>
      <PageHeader title={L('الرواتب', 'Payroll')} actions={
        <div className="flex flex-wrap items-center gap-2 no-print">
          {periods.data && periods.data.length > 0 && (
            <><label htmlFor="pr-sel" className="sr-only">{L('الشهر', 'Month')}</label>
            <Select id="pr-sel" value={sel} onChange={(e) => { setSel(e.target.value); setPage(1); }} className="w-44">
              {periods.data.map((p) => <option key={p.id} value={p.id}>{AR_MONTHS[p.month - 1]} {p.year} — {S[p.status]}</option>)}
            </Select></>
          )}
          {period && <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />{L('طباعة الكشف', 'Print')}</Button>}
        </div>} />
      {canOpen && (
        <form className="no-print flex flex-wrap items-end gap-2 mb-4 rounded-lg border border-input bg-white p-3" onSubmit={(e) => { e.preventDefault(); run(async () => { const p = await post.mutateAsync({ url: '/payroll/periods', body: { year: ny, month: nm } }) as Period; setSel(p.id); }, L('فُتح الشهر كمسودة لكل الموظفين الفعّالين', 'Period opened')); }}>
          <span className="text-sm font-medium me-2">{L('فتح شهر جديد', 'Open a month')}</span>
          <label htmlFor="pr-m" className="sr-only">{L('الشهر', 'Month')}</label>
          <Select id="pr-m" value={nm} onChange={(e) => setNm(Number(e.target.value))} className="w-36">{AR_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</Select>
          <label htmlFor="pr-y" className="sr-only">{L('السنة', 'Year')}</label>
          <Input id="pr-y" type="number" dir="ltr" className="w-24" value={ny} onChange={(e) => setNy(Number(e.target.value))} />
          <Button type="submit" size="sm" disabled={post.isPending}>{L('فتح', 'Open')}</Button>
        </form>
      )}
      {periods.isLoading && <Loading />}
      {periods.data?.length === 0 && <EmptyState title={L('لم يُفتح أي شهر رواتب بعد', 'No payroll periods yet')} />}
      {period && (
        <div className="print-sheet">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h2 className="text-lg font-semibold">{L('كشف رواتب', 'Payroll')} {AR_MONTHS[period.month - 1]} {period.year}</h2>
            <Pill tone={TONE[period.status]}>{S[period.status]}</Pill>
            {period.visible_entries < period.entries_total && <span className="text-xs text-muted-foreground">{L(`تظهر ${period.visible_entries} من ${period.entries_total} حسب نطاقك`, 'Scoped view')}</span>}
            <span className="ms-auto flex gap-2 no-print">
              {canWrite && period.status === 'draft' && <Button size="sm" onClick={() => run(() => post.mutateAsync({ url: `/payroll/periods/${period.id}/submit` }), L('أُرسل للاعتماد', 'Submitted'))}>{L('إرسال للاعتماد', 'Submit')}</Button>}
              {canApprove && period.status === 'review' && (period.created_by?.id === user?.id
                ? <span className="text-xs text-muted-foreground self-center">{L('يعتمده شخص غير منشئ الكشف', 'Needs a different approver')}</span>
                : <Button size="sm" onClick={() => run(() => post.mutateAsync({ url: `/payroll/periods/${period.id}/approve` }), L('اعتُمد الكشف', 'Approved'))}>{L('اعتماد', 'Approve')}</Button>)}
              {canPay && period.status === 'approved' && <Button size="sm" variant="accent" onClick={() => run(() => post.mutateAsync({ url: `/payroll/periods/${period.id}/mark-paid` }), L('سُجّل الصرف', 'Marked paid'))}>{L('تأشير كمصروف', 'Mark paid')}</Button>}
            </span>
          </div>
          <KpiGrid>
            <Kpi label={L('الرواتب الأساسية', 'Base')} value={money(period.totals.base_salary)} />
            <Kpi label={L('المخصصات', 'Allowances')} value={money(period.totals.allowances)} tone="green" />
            <Kpi label={L('الاستقطاعات + السلف', 'Deductions')} value={money(period.totals.deductions + period.totals.advances)} tone="red" />
            <Kpi label={L('الصافي', 'Net')} value={money(period.totals.net_pay)} tone="bronze" hint={L(`${period.visible_entries} موظف`, `${period.visible_entries} staff`)} />
          </KpiGrid>
          {entries.isLoading && <Loading />}
          {entries.data && (
            <div className="mt-4"><TableShell>
              <thead><tr><Th>{L('الموظف', 'Employee')}</Th><Th>{L('القسم', 'Dept')}</Th><Th>{L('الأساسي', 'Base')}</Th><Th>{L('مخصصات', 'Allow.')}</Th><Th>{L('استقطاع', 'Deduct.')}</Th><Th>{L('سلفة', 'Advance')}</Th><Th>{L('الصافي', 'Net')}</Th></tr></thead>
              <tbody>{entries.data.data.map((e) => <EntryRow key={e.id} e={e} editable={!!editable} onSave={(body) => run(() => patch.mutateAsync({ url: `/payroll/entries/${e.id}`, body }), L('حُفظ', 'Saved'))} />)}</tbody>
            </TableShell></div>
          )}
          {entries.data && entries.data.meta.total_pages > 1 && <div className="no-print"><Pagination page={page} totalPages={entries.data.meta.total_pages} onChange={setPage} /></div>}
          {period.approved_by && <p className="text-xs text-muted-foreground mt-3">{L('اعتمده', 'Approved by')}: {period.approved_by.full_name}</p>}
        </div>
      )}
    </>
  );
}

function EntryRow({ e, editable, onSave }: { e: Entry; editable: boolean; onSave: (b: Record<string, number>) => void }) {
  const L = useL();
  const [v, setV] = useState({ allowances: e.allowances, deductions: e.deductions, advances: e.advances });
  useEffect(() => setV({ allowances: e.allowances, deductions: e.deductions, advances: e.advances }), [e]);
  const changed = v.allowances !== e.allowances || v.deductions !== e.deductions || v.advances !== e.advances;
  const cell = (k: keyof typeof v) => editable
    ? <Input aria-label={`${k} — ${e.employee.full_name}`} type="number" min={0} step={1000} dir="ltr" className="h-8 w-28" value={v[k]} onChange={(ev) => setV((x) => ({ ...x, [k]: Number(ev.target.value) }))} onBlur={() => changed && onSave(v)} />
    : money(e[k]);
  return (
    <tr>
      <Td><div className="font-medium">{e.employee.full_name}</div><div className="text-[11px] text-muted-foreground" dir="ltr">{e.employee.employee_no}</div></Td>
      <Td className="text-muted-foreground">{e.employee.department.name}</Td>
      <Td className="whitespace-nowrap">{money(e.base_salary)}</Td>
      <Td>{cell('allowances')}</Td><Td>{cell('deductions')}</Td><Td>{cell('advances')}</Td>
      <Td className="font-semibold whitespace-nowrap">{money(e.base_salary + v.allowances - v.deductions - v.advances)}{changed && <span className="sr-only">{L('غير محفوظ', 'unsaved')}</span>}</Td>
    </tr>
  );
}
