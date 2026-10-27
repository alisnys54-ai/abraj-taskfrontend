'use client';
import { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import { useAuth } from '@/hooks/use-auth';
import { useGet, useAction, useL, dateAr, todayIso, apiErrorMessage, type Paged } from '@/lib/platform';
import { PageHeader, TableShell, Th, Td, Loading, Field, Pill, Chips } from '@/components/platform/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState, Pagination } from '@/components/shared/states';
import { useToast } from '@/components/ui/toast';

type LType = 'annual' | 'sick' | 'hourly' | 'maternity' | 'unpaid';
type LStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
interface Leave {
  id: string; employee: { id: string; employee_no: string; full_name: string; department: { name: string } }; type: LType; start_date: string;
  days: number | null; hours: number | null; reason: string | null; status: LStatus; requested_by: { id: string; full_name: string } | null;
  decided_by: { full_name: string } | null; decision_note: string | null;
}
const TONE = { pending: 'bronze', approved: 'green', rejected: 'red', cancelled: 'gray' } as const;

export default function LeavesPage() {
  const L = useL();
  const { can, scopeFor } = usePermission();
  const { user } = useAuth();
  const { push } = useToast();
  const [status, setStatus] = useState<'all' | LStatus>('pending');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [rejecting, setRejecting] = useState<Leave | null>(null);
  const [note, setNote] = useState('');
  const { data, isLoading } = useGet<Paged<Leave>>('/hr/leaves', { status: status === 'all' ? undefined : status, page, page_size: 20 });
  const act = useAction('patch', ['/hr/']);
  const T: Record<LType, string> = { annual: L('اعتيادية', 'Annual'), sick: L('مرضية', 'Sick'), hourly: L('زمنية', 'Hourly'), maternity: L('أمومة', 'Maternity'), unpaid: L('بدون راتب', 'Unpaid') };
  const S: Record<LStatus, string> = { pending: L('بانتظار القرار', 'Pending'), approved: L('موافَق عليها', 'Approved'), rejected: L('مرفوضة', 'Rejected'), cancelled: L('ملغاة', 'Cancelled') };
  const canDecide = can('hr-leaves', 'approve');
  const decide = async (l: Leave, decision: 'approved' | 'rejected', n?: string) => {
    try { await act.mutateAsync({ url: `/hr/leaves/${l.id}/decision`, body: { decision, note: n } }); push(decision === 'approved' ? L('تمت الموافقة وسُجّلت أيام الإجازة في الدوام', 'Approved') : L('رُفض الطلب', 'Rejected')); setRejecting(null); setNote(''); }
    catch (e) { push(apiErrorMessage(e), 'error'); }
  };
  const cancel = async (l: Leave) => { try { await act.mutateAsync({ url: `/hr/leaves/${l.id}/cancel` }); push(L('أُلغي الطلب', 'Cancelled')); } catch (e) { push(apiErrorMessage(e), 'error'); } };

  return (
    <>
      <PageHeader title={L('الإجازات', 'Leaves')} subtitle={scopeFor('hr-leaves', 'view') === 'own' ? L('طلباتك فقط', 'Your requests') : undefined}
        actions={can('hr-leaves', 'create') && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />{L('طلب إجازة', 'Request leave')}</Button>} />
      <div className="mb-4"><Chips label={L('الحالة', 'Status')} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[['pending', S.pending], ['approved', S.approved], ['rejected', S.rejected], ['cancelled', S.cancelled], ['all', L('الكل', 'All')]]} /></div>
      {isLoading && <Loading />}
      {data && data.data.length === 0 && <EmptyState title={status === 'pending' ? L('لا توجد طلبات معلّقة', 'Nothing pending') : L('لا توجد طلبات', 'No requests')} />}
      {data && data.data.length > 0 && (
        <TableShell>
          <thead><tr><Th>{L('الموظف', 'Employee')}</Th><Th>{L('النوع', 'Type')}</Th><Th>{L('من', 'From')}</Th><Th>{L('المدة', 'Length')}</Th><Th>{L('السبب', 'Reason')}</Th><Th>{L('الحالة', 'Status')}</Th><Th /></tr></thead>
          <tbody>
            {data.data.map((l) => (
              <tr key={l.id}>
                <Td><div className="font-medium">{l.employee.full_name}</div><div className="text-[11px] text-muted-foreground">{l.employee.department.name}</div></Td>
                <Td>{T[l.type]}</Td>
                <Td className="whitespace-nowrap">{dateAr(l.start_date)}</Td>
                <Td className="whitespace-nowrap">{l.type === 'hourly' ? L(`${l.hours} ساعة`, `${l.hours} h`) : L(`${l.days} يوم`, `${l.days} d`)}</Td>
                <Td className="text-muted-foreground max-w-[220px] truncate" >{l.reason ?? '—'}</Td>
                <Td><Pill tone={TONE[l.status]}>{S[l.status]}</Pill>{l.decided_by && <div className="text-[11px] text-muted-foreground mt-1">{l.decided_by.full_name}{l.decision_note ? ` — ${l.decision_note}` : ''}</div>}</Td>
                <Td className="whitespace-nowrap">
                  {l.status === 'pending' && canDecide && l.requested_by?.id !== user?.id && (
                    <span className="inline-flex gap-1">
                      <Button size="sm" onClick={() => decide(l, 'approved')} disabled={act.isPending}><Check className="h-3.5 w-3.5" />{L('موافقة', 'Approve')}</Button>
                      <Button size="sm" variant="secondary" onClick={() => setRejecting(l)}><X className="h-3.5 w-3.5" />{L('رفض', 'Reject')}</Button>
                    </span>
                  )}
                  {l.status === 'pending' && l.requested_by?.id === user?.id && <Button size="sm" variant="ghost" onClick={() => cancel(l)}>{L('إلغاء الطلب', 'Withdraw')}</Button>}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
      {data && data.meta.total_pages > 1 && <Pagination page={page} totalPages={data.meta.total_pages} onChange={setPage} />}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent title={L(`رفض إجازة ${rejecting?.employee.full_name ?? ''}`, 'Reject leave')}>
          <form onSubmit={(e) => { e.preventDefault(); if (rejecting) decide(rejecting, 'rejected', note); }} className="space-y-3">
            <Field label={L('سبب الرفض (يصل للموظف) *', 'Reason (sent to employee) *')} htmlFor="rj-note"><Input id="rj-note" required value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setRejecting(null)}>{L('رجوع', 'Back')}</Button><Button type="submit" variant="destructive" disabled={act.isPending}>{L('تأكيد الرفض', 'Reject')}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
      <NewLeave open={creating} onClose={() => setCreating(false)} canForOthers={scopeFor('hr-leaves', 'create') !== 'own'} T={T} />
    </>
  );
}

function NewLeave({ open, onClose, canForOthers, T }: { open: boolean; onClose: () => void; canForOthers: boolean; T: Record<LType, string> }) {
  const L = useL();
  const { push } = useToast();
  const create = useAction('post', ['/hr/']);
  const [forWho, setForWho] = useState('');
  const [type, setType] = useState<LType>('annual');
  const [start, setStart] = useState(todayIso());
  const [len, setLen] = useState('1');
  const [reason, setReason] = useState('');
  const emps = useGet<Paged<{ id: string; full_name: string; employee_no: string }>>(open && canForOthers ? '/hr/employees' : null, { page_size: 100, status: 'active' });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { employee_id: forWho || undefined, type, start_date: start, reason: reason || undefined, ...(type === 'hourly' ? { hours: Number(len) } : { days: Number(len) }) };
    try { await create.mutateAsync({ url: '/hr/leaves', body }); push(L('أُرسل الطلب لمديرك', 'Request sent')); onClose(); setReason(''); }
    catch (err) { push(apiErrorMessage(err), 'error'); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={L('طلب إجازة', 'Request leave')} className="max-w-md">
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          {canForOthers && (
            <div className="col-span-2"><Field label={L('الموظف', 'Employee')} htmlFor="lv-emp" hint={L('اتركه فارغاً لتقديم الطلب لنفسك', 'Leave empty for yourself')}>
              <Select id="lv-emp" value={forWho} onChange={(e) => setForWho(e.target.value)}>
                <option value="">{L('أنا', 'Myself')}</option>
                {emps.data?.data.map((x) => <option key={x.id} value={x.id}>{x.full_name} — {x.employee_no}</option>)}
              </Select>
            </Field></div>
          )}
          <Field label={L('النوع', 'Type')} htmlFor="lv-type"><Select id="lv-type" value={type} onChange={(e) => { setType(e.target.value as LType); setLen(e.target.value === 'hourly' ? '2' : '1'); }}>{(Object.keys(T) as LType[]).map((k) => <option key={k} value={k}>{T[k]}</option>)}</Select></Field>
          <Field label={L('تاريخ البدء', 'Start')} htmlFor="lv-start"><Input id="lv-start" type="date" required value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label={type === 'hourly' ? L('عدد الساعات', 'Hours') : L('عدد الأيام', 'Days')} htmlFor="lv-len"><Input id="lv-len" type="number" dir="ltr" required min={0.5} max={type === 'hourly' ? 8 : 60} step={0.5} value={len} onChange={(e) => setLen(e.target.value)} /></Field>
          <div className="col-span-2"><Field label={L('السبب', 'Reason')} htmlFor="lv-reason"><Input id="lv-reason" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field></div>
          <div className="col-span-2 flex justify-end gap-2 mt-1"><Button type="button" variant="secondary" onClick={onClose}>{L('إلغاء', 'Cancel')}</Button><Button type="submit" disabled={create.isPending}>{L('إرسال الطلب', 'Submit')}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
