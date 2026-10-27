'use client';
import { useState } from 'react';
import { Factory, Plus } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import { useGet, useAction, useL, dateAr, apiErrorMessage, type Paged } from '@/lib/platform';
import { PageHeader, Kpi, KpiGrid, TableShell, Th, Td, Loading, Field, Pill, Chips } from '@/components/platform/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState, Pagination } from '@/components/shared/states';
import { useToast } from '@/components/ui/toast';

type ESt = 'operational' | 'maintenance' | 'out_of_service';
interface Plant { id: string; name: string; location: string; kind: string; capacity: string | null; is_active: boolean; equipment_count: number }
interface Equip { id: string; code: string; category: string; model: string; plant: { id: string; name: string } | null; site: { id: string; name: string } | null; status: ESt; notes: string | null; updated_at: string }
const TONE = { operational: 'green', maintenance: 'bronze', out_of_service: 'red' } as const;

export default function AssetsPage() {
  const L = useL();
  const { can } = usePermission();
  const { push } = useToast();
  const plants = useGet<Plant[]>('/assets/plants');
  const [status, setStatus] = useState<'all' | ESt>('all');
  const [plantId, setPlantId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const eq = useGet<Paged<Equip> & { summary: Partial<Record<ESt, number>> }>('/assets/equipment', { status: status === 'all' ? undefined : status, plant_id: plantId, search, page, page_size: 25 });
  const patch = useAction('patch', ['/assets']);
  const S: Record<ESt, string> = { operational: L('تعمل', 'Operational'), maintenance: L('صيانة', 'Maintenance'), out_of_service: L('عاطلة', 'Out of service') };
  const canEdit = can('assets', 'edit');
  const sum = eq.data?.summary ?? {};

  return (
    <>
      <PageHeader title={L('المعامل والمعدات', 'Plants & equipment')} actions={can('assets', 'create') && <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" />{L('معدة جديدة', 'New equipment')}</Button>} />
      <h2 className="text-sm font-semibold mb-2">{L('المعامل', 'Plants')}</h2>
      {plants.isLoading && <Loading rows={2} />}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        {plants.data?.map((p) => (
          <button key={p.id} onClick={() => { setPlantId(plantId === p.id ? '' : p.id); setPage(1); }} aria-pressed={plantId === p.id}
            className={`text-start rounded-xl border bg-white p-3 transition ${plantId === p.id ? 'border-bronze ring-2 ring-bronze/30' : 'border-input hover:border-bronze/50'}`}>
            <div className="flex items-center gap-2 mb-1"><Factory className="h-4 w-4 text-bronze" /><span className="font-semibold text-sm">{p.name}</span></div>
            <div className="text-xs text-muted-foreground">{p.kind} · {p.location}</div>
            <div className="text-xs mt-2">{p.capacity ?? '—'} · {L(`${p.equipment_count} معدة`, `${p.equipment_count} units`)}</div>
          </button>
        ))}
      </div>
      <KpiGrid>
        <Kpi label={S.operational} value={sum.operational ?? 0} tone="green" />
        <Kpi label={S.maintenance} value={sum.maintenance ?? 0} tone="bronze" />
        <Kpi label={S.out_of_service} value={sum.out_of_service ?? 0} tone="red" />
      </KpiGrid>
      <div className="flex flex-wrap items-center gap-2 my-4">
        <label htmlFor="eq-q" className="sr-only">{L('بحث', 'Search')}</label>
        <Input id="eq-q" className="max-w-xs" placeholder={L('ابحث بالرمز أو الموديل', 'Search code or model')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Chips label={L('الحالة', 'Status')} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[['all', L('الكل', 'All')], ['operational', S.operational], ['maintenance', S.maintenance], ['out_of_service', S.out_of_service]]} />
      </div>
      {eq.isLoading && <Loading />}
      {eq.data?.data.length === 0 && <EmptyState title={L('لا توجد معدات مطابقة', 'No matching equipment')} />}
      {eq.data && eq.data.data.length > 0 && (
        <TableShell>
          <thead><tr><Th>{L('الرمز', 'Code')}</Th><Th>{L('الصنف', 'Category')}</Th><Th>{L('الموديل', 'Model')}</Th><Th>{L('المكان', 'Location')}</Th><Th>{L('الحالة', 'Status')}</Th><Th>{L('آخر تحديث', 'Updated')}</Th></tr></thead>
          <tbody>{eq.data.data.map((e) => (
            <tr key={e.id}>
              <Td className="font-medium" ><span dir="ltr">{e.code}</span></Td><Td>{e.category}</Td><Td className="text-muted-foreground" ><span dir="ltr">{e.model}</span></Td>
              <Td>{e.plant?.name ?? e.site?.name ?? '—'}</Td>
              <Td>{canEdit ? (
                <Select aria-label={`${L('حالة', 'Status')} ${e.code}`} value={e.status} className="h-8 w-32" onChange={async (ev) => { try { await patch.mutateAsync({ url: `/assets/equipment/${e.id}`, body: { status: ev.target.value } }); push(L('حُدّثت الحالة', 'Updated')); } catch (er) { push(apiErrorMessage(er), 'error'); } }}>
                  {(Object.keys(S) as ESt[]).map((k) => <option key={k} value={k}>{S[k]}</option>)}
                </Select>) : <Pill tone={TONE[e.status]}>{S[e.status]}</Pill>}</Td>
              <Td className="text-muted-foreground whitespace-nowrap">{dateAr(e.updated_at)}</Td>
            </tr>))}
          </tbody>
        </TableShell>
      )}
      {eq.data && eq.data.meta.total_pages > 1 && <Pagination page={page} totalPages={eq.data.meta.total_pages} onChange={setPage} />}
      <AddEquipment open={adding} onClose={() => setAdding(false)} plants={plants.data ?? []} />
    </>
  );
}

function AddEquipment({ open, onClose, plants }: { open: boolean; onClose: () => void; plants: Plant[] }) {
  const L = useL();
  const { push } = useToast();
  const create = useAction('post', ['/assets']);
  const [f, setF] = useState({ code: '', category: '', model: '', plant_id: '', notes: '' });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await create.mutateAsync({ url: '/assets/equipment', body: { ...f, plant_id: f.plant_id || undefined, notes: f.notes || undefined } }); push(L('أُضيفت المعدة', 'Added')); setF({ code: '', category: '', model: '', plant_id: '', notes: '' }); onClose(); }
    catch (err) { push(apiErrorMessage(err), 'error'); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={L('إضافة معدة', 'Add equipment')} className="max-w-md">
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label={L('الرمز *', 'Code *')} htmlFor="eq-c"><Input id="eq-c" dir="ltr" required maxLength={30} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
          <Field label={L('الصنف *', 'Category *')} htmlFor="eq-k"><Input id="eq-k" required maxLength={40} placeholder={L('خباطة، مضخة، رافعة…', 'Mixer, pump…')} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></Field>
          <div className="col-span-2"><Field label={L('الموديل *', 'Model *')} htmlFor="eq-m"><Input id="eq-m" dir="ltr" required maxLength={80} value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} /></Field></div>
          <div className="col-span-2"><Field label={L('المعمل', 'Plant')} htmlFor="eq-p"><Select id="eq-p" value={f.plant_id} onChange={(e) => setF({ ...f, plant_id: e.target.value })}><option value="">{L('بدون', 'None')}</option>{plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field></div>
          <div className="col-span-2 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{L('إلغاء', 'Cancel')}</Button><Button type="submit" disabled={create.isPending}>{L('إضافة', 'Add')}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
