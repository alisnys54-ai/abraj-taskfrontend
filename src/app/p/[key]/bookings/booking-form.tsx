'use client';
import { useState } from 'react';
import { useProject } from '@/components/platform/project-context';
import { useAction, useL, money, todayIso, apiErrorMessage } from '@/lib/platform';
import { Field } from '@/components/platform/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

/** Books one available unit: client (matched by phone), price, optional deposit, installment plan. */
export function BookingForm({ unit, onDone }: { unit: { id: string; number: string; type: { price: number | null } }; onDone: () => void }) {
  const { project } = useProject();
  const L = useL();
  const { push } = useToast();
  const create = useAction('post', [`/projects/${project.key}`]);
  const nextMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 1); return d.toISOString().slice(0, 10); })();
  const [f, setF] = useState({ name: '', phone: '', national_id: '', price: String(unit.type.price ?? ''), deposit: '', count: '24', first: nextMonth, interval: '1' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const price = Number(f.price) || 0, deposit = Number(f.deposit) || 0, count = Number(f.count) || 0;
  const per = count > 0 ? Math.floor((price - deposit) / count) : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ url: `/projects/${project.key}/bookings`, body: {
        unit_id: unit.id, client: { full_name: f.name.trim(), phone: f.phone, national_id: f.national_id || undefined },
        price, deposit_amount: deposit || undefined,
        installment_plan: count > 0 ? { count, first_due_date: f.first, interval_months: Number(f.interval) } : undefined,
      } });
      push(deposit ? L(`بيعت الوحدة ${unit.number} وأُنشئ ${count} قسط`, 'Sold') : L(`حُجزت الوحدة ${unit.number} بانتظار المقدمة`, 'Reserved'));
      onDone();
    } catch (err) { push(apiErrorMessage(err), 'error'); }
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><Field label={L('اسم الزبون *', 'Client name *')} htmlFor="bk-n"><Input id="bk-n" required maxLength={160} value={f.name} onChange={set('name')} /></Field></div>
      <Field label={L('الهاتف *', 'Phone *')} htmlFor="bk-p" hint={L('إن كان مسجلاً يُربط بنفس الزبون', 'Existing clients are matched by phone')}><Input id="bk-p" required dir="ltr" inputMode="tel" pattern="07[0-9]{9}" placeholder="07XXXXXXXXX" value={f.phone} onChange={set('phone')} /></Field>
      <Field label={L('رقم الهوية', 'National ID')} htmlFor="bk-id"><Input id="bk-id" dir="ltr" maxLength={30} value={f.national_id} onChange={set('national_id')} /></Field>
      <Field label={L('السعر (د.ع) *', 'Price (IQD) *')} htmlFor="bk-pr"><Input id="bk-pr" required type="number" min={0} step={1000} dir="ltr" value={f.price} onChange={set('price')} /></Field>
      <Field label={L('المقدمة المدفوعة', 'Deposit paid')} htmlFor="bk-d" hint={L('فارغ = حجز بانتظار المقدمة', 'Empty = reserve only')}><Input id="bk-d" type="number" min={0} step={1000} dir="ltr" value={f.deposit} onChange={set('deposit')} /></Field>
      <Field label={L('عدد الأقساط', 'Installments')} htmlFor="bk-c"><Input id="bk-c" type="number" min={0} max={120} dir="ltr" value={f.count} onChange={set('count')} /></Field>
      <Field label={L('كل (شهر)', 'Every (months)')} htmlFor="bk-i"><Input id="bk-i" type="number" min={1} max={12} dir="ltr" value={f.interval} onChange={set('interval')} /></Field>
      <div className="col-span-2"><Field label={L('تاريخ أول قسط', 'First due date')} htmlFor="bk-f"><Input id="bk-f" type="date" min={todayIso()} value={f.first} onChange={set('first')} /></Field></div>
      {count > 0 && price > deposit && <p className="col-span-2 rounded-md bg-muted px-3 py-2 text-sm">{L(`المتبقي ${money(price - deposit)} على ${count} قسط ≈ ${money(per)} للقسط`, `${count} × ≈${money(per)}`)}</p>}
      <div className="col-span-2 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onDone}>{L('إلغاء', 'Cancel')}</Button><Button type="submit" disabled={create.isPending}>{deposit ? L('تثبيت البيع', 'Confirm sale') : L('حجز', 'Reserve')}</Button></div>
    </form>
  );
}
