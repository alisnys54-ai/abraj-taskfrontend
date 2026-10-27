'use client';
import { useState } from 'react';
import { Printer } from 'lucide-react';
import { useProject, SitePicker } from '@/components/platform/project-context';
import { usePermission } from '@/hooks/use-permission';
import { useGet, useAction, useL, money, dateAr, todayIso, apiErrorMessage, type Paged } from '@/lib/platform';
import { PageHeader, TableShell, Th, Td, Loading, Chips, Pill, Field } from '@/components/platform/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState, Pagination } from '@/components/shared/states';
import { useToast } from '@/components/ui/toast';

type ISt = 'due' | 'overdue' | 'paid';
interface Inst { id: string; seq: number; due_date: string; amount: number; status: ISt; paid_amount: number | null; paid_at: string | null; receipt_no: string | null; recorded_by: { full_name: string } | null; client: { full_name: string; phone: string }; unit: { number: string; site: { name: string } } }
const TONE = { due: 'navy', overdue: 'red', paid: 'green' } as const;

export default function InstallmentsPage() {
  const { project, site } = useProject();
  const L = useL();
  const { can } = usePermission();
  const { push } = useToast();
  const [status, setStatus] = useState<'all' | ISt>('overdue');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<Inst | null>(null);
  const [receipt, setReceipt] = useState('');
  const [paidAt, setPaidAt] = useState(todayIso());
  const [printing, setPrinting] = useState<Inst | null>(null);
  const { data, isLoading } = useGet<Paged<Inst>>(`/projects/${project.key}/installments`, { site_code: site?.code, status: status === 'all' ? undefined : status, search, page, page_size: 25 });
  const pay = useAction('post', [`/projects/${project.key}`]);
  const S: Record<ISt, string> = { due: L('مستحق', 'Due'), overdue: L('متأخر', 'Overdue'), paid: L('مدفوع', 'Paid') };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!paying) return;
    try {
      await pay.mutateAsync({ url: `/projects/${project.key}/installments/${paying.id}/pay`, body: { amount: paying.amount, receipt_no: receipt.trim(), paid_at: paidAt } });
      push(L(`سُجّل تسديد القسط ${paying.seq} بوصل ${receipt}`, 'Payment recorded'));
      setPrinting({ ...paying, status: 'paid', paid_amount: paying.amount, paid_at: paidAt, receipt_no: receipt.trim() });
      setPaying(null); setReceipt('');
    } catch (err) { push(apiErrorMessage(err), 'error'); }
  };

  return (
    <>
      <div className="no-print">
        <PageHeader title={L('الأقساط والتحصيل', 'Installments')} subtitle={site?.name} actions={<SitePicker />} />
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <label htmlFor="in-q" className="sr-only">{L('بحث', 'Search')}</label>
          <Input id="in-q" className="max-w-xs" placeholder={L('اسم الزبون', 'Client name')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Chips label={L('الحالة', 'Status')} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[['overdue', S.overdue], ['due', S.due], ['paid', S.paid], ['all', L('الكل', 'All')]]} />
        </div>
        {isLoading && <Loading />}
        {data?.data.length === 0 && <EmptyState title={status === 'overdue' ? L('لا توجد أقساط متأخرة', 'Nothing overdue') : L('لا توجد أقساط', 'No installments')} />}
        {data && data.data.length > 0 && (
          <TableShell>
            <thead><tr><Th>{L('الزبون', 'Client')}</Th><Th>{L('الوحدة', 'Unit')}</Th><Th>{L('القسط', '#')}</Th><Th>{L('الاستحقاق', 'Due')}</Th><Th>{L('المبلغ', 'Amount')}</Th><Th>{L('الحالة', 'Status')}</Th><Th /></tr></thead>
            <tbody>{data.data.map((i) => (
              <tr key={i.id}>
                <Td><div className="font-medium">{i.client.full_name}</div><a href={`tel:${i.client.phone}`} className="text-[11px] text-accent" dir="ltr">{i.client.phone}</a></Td>
                <Td><span dir="ltr">{i.unit.number}</span></Td><Td>{i.seq}</Td>
                <Td className="whitespace-nowrap">{dateAr(i.due_date)}</Td>
                <Td className="whitespace-nowrap">{money(i.amount)}</Td>
                <Td><Pill tone={TONE[i.status]}>{S[i.status]}</Pill>{i.receipt_no && <div className="text-[11px] text-muted-foreground mt-1">{L('وصل', 'Receipt')} {i.receipt_no}</div>}</Td>
                <Td className="whitespace-nowrap">
                  {i.status !== 'paid' && can('re-installments', 'edit') && <Button size="sm" onClick={() => { setPaying(i); setReceipt(''); setPaidAt(todayIso()); }}>{L('تسجيل تسديد', 'Record payment')}</Button>}
                  {i.status === 'paid' && <Button size="sm" variant="ghost" onClick={() => setPrinting(i)} aria-label={L('طباعة الوصل', 'Print receipt')}><Printer className="h-3.5 w-3.5" /></Button>}
                </Td>
              </tr>))}
            </tbody>
          </TableShell>
        )}
        {data && data.meta.total_pages > 1 && <Pagination page={page} totalPages={data.meta.total_pages} onChange={setPage} />}
      </div>
      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        {paying && (
          <DialogContent title={L(`تسديد القسط ${paying.seq} — ${paying.client.full_name}`, 'Record payment')} className="max-w-sm">
            <form onSubmit={submit} className="space-y-3">
              <p className="rounded-md bg-muted px-3 py-2 text-sm">{L('المبلغ', 'Amount')}: <b>{money(paying.amount)}</b> <span className="text-xs text-muted-foreground">{L('(القسط يُسدَّد كاملاً)', '(paid in full)')}</span></p>
              <Field label={L('رقم الوصل *', 'Receipt no. *')} htmlFor="py-r"><Input id="py-r" required maxLength={40} dir="ltr" value={receipt} onChange={(e) => setReceipt(e.target.value)} /></Field>
              <Field label={L('تاريخ التسديد', 'Paid on')} htmlFor="py-d"><Input id="py-d" type="date" max={todayIso()} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></Field>
              <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setPaying(null)}>{L('إلغاء', 'Cancel')}</Button><Button type="submit" disabled={pay.isPending}>{L('تسجيل', 'Record')}</Button></div>
            </form>
          </DialogContent>
        )}
      </Dialog>
      {printing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print-backdrop" role="dialog" aria-modal="true" aria-label={L('وصل قبض', 'Receipt')}>
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="print-sheet p-6 text-sm">
              <div className="flex items-center justify-between border-b pb-3 mb-3"><div><div className="font-bold text-primary">{L('شركة أبراج الياسر', 'Abraj Al Yasir')}</div><div className="text-xs text-muted-foreground">{project.name}</div></div><img src="/logo-icon.png" alt="" className="h-10" /></div>
              <h2 className="text-center font-bold text-lg mb-3">{L('وصل قبض', 'Receipt')}</h2>
              <dl className="grid grid-cols-2 gap-y-2">
                <dt className="text-muted-foreground">{L('رقم الوصل', 'Receipt')}</dt><dd dir="ltr" className="text-end">{printing.receipt_no}</dd>
                <dt className="text-muted-foreground">{L('استلمنا من', 'Received from')}</dt><dd>{printing.client.full_name}</dd>
                <dt className="text-muted-foreground">{L('مبلغاً قدره', 'Amount')}</dt><dd className="font-bold">{money(printing.paid_amount ?? printing.amount)}</dd>
                <dt className="text-muted-foreground">{L('عن', 'For')}</dt><dd>{L(`القسط ${printing.seq} — الوحدة ${printing.unit.number}`, `Installment ${printing.seq} — unit ${printing.unit.number}`)}</dd>
                <dt className="text-muted-foreground">{L('التاريخ', 'Date')}</dt><dd>{dateAr(printing.paid_at)}</dd>
              </dl>
              <div className="grid grid-cols-2 gap-6 mt-10 text-xs text-center"><div className="border-t pt-1">{L('توقيع المستلم', 'Cashier')}</div><div className="border-t pt-1">{L('توقيع الزبون', 'Client')}</div></div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t no-print"><Button variant="secondary" onClick={() => setPrinting(null)}>{L('إغلاق', 'Close')}</Button><Button onClick={() => window.print()}><Printer className="h-4 w-4" />{L('طباعة', 'Print')}</Button></div>
          </div>
        </div>
      )}
    </>
  );
}
