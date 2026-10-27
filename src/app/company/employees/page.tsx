'use client';
import { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import { useDepartments } from '@/hooks/use-resources';
import { useGet, useAction, useL, money, apiErrorMessage, type Paged } from '@/lib/platform';
import { PageHeader, TableShell, Th, Td, Loading, Field, Pill, Chips } from '@/components/platform/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState, Pagination } from '@/components/shared/states';
import { useToast } from '@/components/ui/toast';

export interface Employee {
  id: string; employee_no: string; full_name: string; department: { id: string; name: string }; position: { id: string; title: string } | null;
  site: { id: string; code: string; name: string } | null; work_location: string | null; phone: string | null; national_id: string | null;
  hire_date: string | null; base_salary: number | null; status: 'active' | 'on_leave' | 'suspended' | 'terminated'; user_id: string | null;
}

const STATUS_TONE = { active: 'green', on_leave: 'bronze', suspended: 'red', terminated: 'gray' } as const;

export default function EmployeesPage() {
  const L = useL();
  const { can, scopeFor } = usePermission();
  const { push } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | Employee['status']>('all');
  const [departmentId, setDepartmentId] = useState('');
  const [editing, setEditing] = useState<Employee | 'new' | null>(null);
  const { data, isLoading } = useGet<Paged<Employee>>('/hr/employees', { page, page_size: 20, search, status: status === 'all' ? undefined : status, department_id: departmentId });
  const depts = useDepartments({ page_size: 100 });
  const statusL: Record<Employee['status'], string> = { active: L('على رأس العمل', 'Active'), on_leave: L('إجازة', 'On leave'), suspended: L('موقوف', 'Suspended'), terminated: L('منتهية خدمته', 'Terminated') };
  const canCreate = can('hr-employees', 'create');

  return (
    <>
      <PageHeader
        title={L('الموظفون', 'Employees')}
        subtitle={scopeFor('hr-employees', 'view') === 'department' ? L('موظفو قسمك فقط', 'Your department only') : undefined}
        actions={canCreate && <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" />{L('موظف جديد', 'New employee')}</Button>}
      />
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <label htmlFor="emp-q" className="sr-only">{L('بحث', 'Search')}</label>
        <Input id="emp-q" placeholder={L('ابحث بالاسم أو الرقم الوظيفي أو الهاتف', 'Search by name, number or phone')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        {scopeFor('hr-employees', 'view') === 'all' && (
          <>
            <label htmlFor="emp-dept" className="sr-only">{L('القسم', 'Department')}</label>
            <Select id="emp-dept" value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }} className="max-w-[220px]">
              <option value="">{L('كل الأقسام', 'All departments')}</option>
              {depts.data?.data.map((d: { id: string; name: string }) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </>
        )}
        <Chips label={L('الحالة', 'Status')} value={status} onChange={(v) => { setStatus(v); setPage(1); }}
          options={[['all', L('الكل', 'All')], ['active', statusL.active], ['on_leave', statusL.on_leave], ['suspended', statusL.suspended], ['terminated', statusL.terminated]]} />
      </div>
      {isLoading && <Loading />}
      {data && data.data.length === 0 && <EmptyState title={L('لا يوجد موظفون مطابقون', 'No matching employees')} />}
      {data && data.data.length > 0 && (
        <TableShell>
          <thead><tr><Th>{L('الموظف', 'Employee')}</Th><Th>{L('الرقم', 'No.')}</Th><Th>{L('القسم', 'Department')}</Th><Th>{L('موقع العمل', 'Location')}</Th><Th>{L('الهاتف', 'Phone')}</Th><Th>{L('الراتب', 'Salary')}</Th><Th>{L('الحالة', 'Status')}</Th>{can('hr-employees', 'edit') && <Th />}</tr></thead>
          <tbody>
            {data.data.map((e) => (
              <tr key={e.id} className="hover:bg-muted/40">
                <Td className="font-medium">{e.full_name}</Td>
                <Td><span dir="ltr" className="text-muted-foreground">{e.employee_no}</span></Td>
                <Td>{e.department.name}</Td>
                <Td className="text-muted-foreground">{e.site?.name ?? e.work_location ?? '—'}</Td>
                <Td><span dir="ltr">{e.phone ?? '—'}</span></Td>
                <Td className="whitespace-nowrap">{money(e.base_salary)}</Td>
                <Td><Pill tone={STATUS_TONE[e.status]}>{statusL[e.status]}</Pill></Td>
                {can('hr-employees', 'edit') && <Td><Button variant="ghost" size="sm" onClick={() => setEditing(e)} aria-label={`${L('تعديل', 'Edit')} ${e.full_name}`}><Pencil className="h-3.5 w-3.5" /></Button></Td>}
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
      {data && data.meta.total_pages > 1 && <Pagination page={page} totalPages={data.meta.total_pages} onChange={setPage} />}
      {data && <p className="text-xs text-muted-foreground mt-3">{L(`يظهر ${data.data.length} من ${data.meta.total} موظفاً`, `Showing ${data.data.length} of ${data.meta.total}`)}</p>}
      <EmployeeDialog employee={editing} onClose={() => setEditing(null)} onSaved={(msg) => { setEditing(null); push(msg); }} onError={(m) => push(m, 'error')} />
    </>
  );
}

function EmployeeDialog({ employee, onClose, onSaved, onError }: { employee: Employee | 'new' | null; onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }) {
  const L = useL();
  const isNew = employee === 'new';
  const e = employee && employee !== 'new' ? employee : null;
  const depts = useDepartments({ page_size: 100 });
  const create = useAction('post', ['/hr/']);
  const update = useAction('patch', ['/hr/']);
  const [form, setForm] = useState<Record<string, string>>({});
  const v = (k: string, fallback = '') => form[k] ?? fallback;
  const set = (k: string) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: ev.target.value }));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const body: Record<string, unknown> = {
      full_name: v('full_name', e?.full_name), department_id: v('department_id', e?.department.id), phone: v('phone', e?.phone ?? '') || undefined,
      work_location: v('work_location', e?.work_location ?? '') || undefined, national_id: v('national_id', e?.national_id ?? '') || undefined,
      hire_date: v('hire_date', e?.hire_date ?? '') || undefined, base_salary: Number(v('base_salary', String(e?.base_salary ?? 0))),
    };
    if (!isNew) body.status = v('status', e?.status);
    try {
      if (isNew) {
        const res = await create.mutateAsync({ url: '/hr/employees', body }) as { employee_no: string };
        onSaved(L(`أُضيف الموظف برقم ${res.employee_no}`, `Added as ${res.employee_no}`));
      } else {
        await update.mutateAsync({ url: `/hr/employees/${e!.id}`, body });
        onSaved(L('حُفظت التعديلات', 'Saved'));
      }
      setForm({});
    } catch (err) { onError(apiErrorMessage(err)); }
  };

  return (
    <Dialog open={!!employee} onOpenChange={(o) => { if (!o) { setForm({}); onClose(); } }}>
      <DialogContent title={isNew ? L('إضافة موظف جديد', 'New employee') : `${L('تعديل', 'Edit')} — ${e?.full_name ?? ''}`} className="max-w-lg">
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><Field label={L('الاسم الثلاثي واللقب *', 'Full name *')} htmlFor="f-name"><Input id="f-name" required value={v('full_name', e?.full_name)} onChange={set('full_name')} /></Field></div>
          <Field label={L('القسم *', 'Department *')} htmlFor="f-dept">
            <Select id="f-dept" required value={v('department_id', e?.department.id ?? '')} onChange={set('department_id')}>
              <option value="" disabled>{L('اختر القسم', 'Choose')}</option>
              {depts.data?.data.map((d: { id: string; name: string }) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label={L('موقع العمل', 'Work location')} htmlFor="f-loc"><Input id="f-loc" value={v('work_location', e?.work_location ?? '')} onChange={set('work_location')} /></Field>
          <Field label={L('الهاتف', 'Phone')} htmlFor="f-phone" hint="07XXXXXXXXX"><Input id="f-phone" dir="ltr" inputMode="tel" pattern="07[0-9]{9}" value={v('phone', e?.phone ?? '')} onChange={set('phone')} /></Field>
          <Field label={L('رقم الهوية', 'National ID')} htmlFor="f-nid"><Input id="f-nid" dir="ltr" value={v('national_id', e?.national_id ?? '')} onChange={set('national_id')} /></Field>
          <Field label={L('تاريخ التعيين', 'Hire date')} htmlFor="f-hire"><Input id="f-hire" type="date" value={v('hire_date', e?.hire_date ?? '')} onChange={set('hire_date')} /></Field>
          <Field label={L('الراتب الأساسي (د.ع)', 'Base salary (IQD)')} htmlFor="f-sal"><Input id="f-sal" type="number" min={0} step={1000} dir="ltr" value={v('base_salary', String(e?.base_salary ?? ''))} onChange={set('base_salary')} /></Field>
          {!isNew && (
            <Field label={L('الحالة', 'Status')} htmlFor="f-st">
              <Select id="f-st" value={v('status', e?.status)} onChange={set('status')}>
                <option value="active">{L('على رأس العمل', 'Active')}</option><option value="on_leave">{L('إجازة', 'On leave')}</option>
                <option value="suspended">{L('موقوف', 'Suspended')}</option><option value="terminated">{L('منتهية خدمته', 'Terminated')}</option>
              </Select>
            </Field>
          )}
          <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={onClose}>{L('إلغاء', 'Cancel')}</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>{isNew ? L('حفظ الموظف', 'Save') : L('حفظ التعديلات', 'Save changes')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
