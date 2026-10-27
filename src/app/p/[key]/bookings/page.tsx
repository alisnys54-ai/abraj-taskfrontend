'use client';
import { useState } from 'react';
import { useProject, SitePicker } from '@/components/platform/project-context';
import { usePermission } from '@/hooks/use-permission';
import { useGet, useAction, useL, money, dateAr, apiErrorMessage, type Paged } from '@/lib/platform';
import { PageHeader, TableShell, Th, Td, Loading, Chips, Pill, Field } from '@/components/platform/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState, Pagination } from '@/components/shared/states';
import { useToast } from '@/components/ui/toast';

type BSt = 'pending_deposit' | 'confirmed' | 'cancelled';
interface Booking { id: string; unit: { number: string; block: string | null; type_code: string; site: { name: string } }; client: { full_name: string; phone: string }; sales_rep: { full_name: string }; booking_date: string; price: number; deposit_amount: number | null; status: BSt; cancel_reason: string | null; installments: { count: number; paid: number; overdue: number; collected: number } }
const TONE = { pending_deposit: 'bronze', confirmed: 'green', cancelled: 'gray' } as const;

export default function BookingsPage() {
  const { project, site } = useProject();
  const L = useL();
  const { can } = usePermission();
  const { push } = useToast();
  const [status, setStatus] = useState<'all' | BSt>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<{ b: Booking; kind: 'confirm' | 'cancel' } | null>(null);
  const [val, setVal] = useState('');
  const { data, isLoading } = useGet<Paged<Booking>>(`/projects/${project.key}/bookings`, { site_code: site?.code, status: status === 'all' ? undefined : status, search, page, page_size: 20 });
  const patch = useAction('patch', [`/projects/${project.key}`]);
  const S: Record<BSt, string> = { pending_deposit: L('بانتظار المقدمة', 'Awaiting deposit'), confirmed: L('مؤكَّد', 'Confirmed'), cancelled: L('ملغى', 'Cancelled') };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!action) return;
    try {
      await patch.mutateAsync({ url: `/projects/${project.key}/bookings/${action.b.id}/${action.kind}`, body: action.kind === 'confirm' ? { deposit_amount: Number(val) } : { reason: val } });
      push(action.kind === 'confirm' ? L('تأكد الحجز وصارت الوحدة مباعة', 'Confirmed') : L('أُلغي الحجز وعادت الوحدة متاحة', 'Cancelled')); setAction(null); setVal('');
    } catch (err) { push(apiErrorMessage(err), 'error'); }
  };

  return (
    <>
      <PageHeader title={L('الحجوزات والعقود', 'Bookings')} subtitle={site?.name} actions={<SitePicker />} />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label htmlFor="bk-q" className="sr-only">{L('بحث', 'Search')}</label>
        <Input id="bk-q" className="max-w-xs" placeholder={L('اسم الزبون أو هاتفه أو رقم الوحدة', 'Client, phone or unit')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Chips label={L('الحالة', 'Status')} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[['all', L('الكل', 'All')], ['pending_deposit', S.pending_deposit], ['confirmed', S.confirmed], ['cancelled', S.cancelled]]} />
      </div>
      {isLoading && <Loading />}
      {data?.data.length === 0 && <EmptyState title={L('لا توجد حجوزات', 'No bookings')} subtitle={can('re-bookings', 'create') ? L('احجز من صفحة الوحدات', 'Book from the units page') : undefined} />}
      {data && data.data.length > 0 && (
        <TableShell>
          <thead><tr><Th>{L('الوحدة', 'Unit')}</Th><Th>{L('الزبون', 'Client')}</Th><Th>{L('التاريخ', 'Date')}</Th><Th>{L('السعر', 'Price')}</Th><Th>{L('الأقساط', 'Installments')}</Th><Th>{L('المندوب', 'Rep')}</Th><Th>{L('الحالة', 'Status')}</Th><Th /></tr></thead>
          <tbody>{data.data.map((b) => (
            <tr key={b.id}>
              <Td className="font-medium"><span dir="ltr">{b.unit.number}</span> <span className="text-[11px] text-muted-foreground">{b.unit.type_code}</span></Td>
              <Td><div>{b.client.full_name}</div><div className="text-[11px] text-muted-foreground" dir="ltr">{b.client.phone}</div></Td>
              <Td className="whitespace-nowrap">{dateAr(b.booking_date)}</Td>
              <Td className="whitespace-nowrap">{money(b.price)}</Td>
              <Td className="whitespace-nowrap text-xs">{b.installments.count ? <>{b.installments.paid}/{b.installments.count}{b.installments.overdue > 0 && <span className="text-destructive"> · {L(`${b.installments.overdue} متأخر`, `${b.installments.overdue} late`)}</span>}</> : '—'}</Td>
              <Td className="text-muted-foreground">{b.sales_rep.full_name}</Td>
              <Td><Pill tone={TONE[b.status]}>{S[b.status]}</Pill>{b.cancel_reason && <div className="text-[11px] text-muted-foreground mt-1 max-w-[160px] truncate" title={b.cancel_reason}>{b.cancel_reason}</div>}</Td>
              <Td className="whitespace-nowrap">
                {b.status === 'pending_deposit' && can('re-bookings', 'edit') && <Button size="sm" onClick={() => { setAction({ b, kind: 'confirm' }); setVal(''); }}>{L('استلام المقدمة', 'Take deposit')}</Button>}
                {b.status !== 'cancelled' && b.installments.paid === 0 && can('re-bookings', 'edit') && <Button size="sm" variant="ghost" onClick={() => { setAction({ b, kind: 'cancel' }); setVal(''); }}>{L('إلغاء', 'Cancel')}</Button>}
              </Td>
            </tr>))}
          </tbody>
        </TableShell>
      )}
      {data && data.meta.total_pages > 1 && <Pagination page={page} totalPages={data.meta.total_pages} onChange={setPage} />}
      <Dialog open={!!action} onOpenChange={(o) => !o && setAction(null)}>
        {action && (
          <DialogContent title={action.kind === 'confirm' ? L(`استلام مقدمة الوحدة ${action.b.unit.number}`, 'Take deposit') : L(`إلغاء حجز ${action.b.client.full_name}`, 'Cancel booking')} className="max-w-sm">
            <form onSubmit={submit} className="space-y-3">
              {action.kind === 'confirm'
                ? <Field label={L('مبلغ المقدمة (د.ع) *', 'Deposit (IQD) *')} htmlFor="ac-v"><Input id="ac-v" required type="number" min={1} step={1000} dir="ltr" value={val} onChange={(e) => setVal(e.target.value)} /></Field>
                : <Field label={L('سبب الإلغاء *', 'Reason *')} htmlFor="ac-v"><Input id="ac-v" required maxLength={300} value={val} onChange={(e) => setVal(e.target.value)} /></Field>}
              <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setAction(null)}>{L('رجوع', 'Back')}</Button><Button type="submit" variant={action.kind === 'cancel' ? 'destructive' : 'default'} disabled={patch.isPending}>{L('تأكيد', 'Confirm')}</Button></div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
