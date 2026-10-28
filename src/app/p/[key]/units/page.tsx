'use client';
import { useMemo, useState } from 'react';
import { useProject, SitePicker } from '@/components/platform/project-context';
import { usePermission } from '@/hooks/use-permission';
import { useGet, useAction, useL, money, apiErrorMessage, type Paged } from '@/lib/platform';
import { PageHeader, Loading, Chips, Pill } from '@/components/platform/ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/states';
import { useToast } from '@/components/ui/toast';
import { BookingForm } from '../bookings/booking-form';

type USt = 'available' | 'reserved' | 'sold' | 'under_construction';
export interface Unit { id: string; site: { code: string; name: string }; block: string | null; number: string; status: USt; type: { code: string; area_m2: number | null; price: number | null }; active_booking: { id: string; status: string; client_name: string } | null }
const CELL: Record<USt, string> = {
  available: 'bg-success/10 border-success/40 text-success hover:bg-success/20',
  reserved: 'bg-bronze/20 border-bronze/50 text-bronze-dark',
  sold: 'bg-primary text-white border-primary',
  under_construction: 'bg-muted border-input text-muted-foreground',
};

export default function UnitsPage() {
  const { project, site } = useProject();
  const L = useL();
  const { can } = usePermission();
  const { push } = useToast();
  const [status, setStatus] = useState<'all' | USt>('all');
  const [type, setType] = useState('');
  const [sel, setSel] = useState<Unit | null>(null);
  const [booking, setBooking] = useState(false);
  const { data, isLoading } = useGet<Paged<Unit>>(site ? `/projects/${project.key}/units` : null, { site_code: site?.code, status: status === 'all' ? undefined : status, type_code: type, page_size: 600 });
  const patch = useAction('patch', [`/projects/${project.key}`]);
  const S: Record<USt, string> = { available: L('متاحة', 'Available'), reserved: L('محجوزة', 'Reserved'), sold: L('مباعة', 'Sold'), under_construction: L('قيد الإنشاء', 'Under construction') };
  const blocks = useMemo(() => {
    const m = new Map<string, Unit[]>();
    data?.data.forEach((u) => { const k = u.block ?? '—'; m.set(k, [...(m.get(k) ?? []), u]); });
    return [...m.entries()];
  }, [data]);

  const toggle = async (u: Unit) => {
    try { await patch.mutateAsync({ url: `/projects/${project.key}/units/${u.id}`, body: { status: u.status === 'available' ? 'under_construction' : 'available' } }); push(L('حُدّثت حالة الوحدة', 'Updated')); setSel(null); }
    catch (e) { push(apiErrorMessage(e), 'error'); }
  };

  return (
    <>
      <PageHeader title={L('الوحدات السكنية', 'Units')} subtitle={site?.name} actions={<SitePicker />} />
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Chips label={L('الحالة', 'Status')} value={status} onChange={setStatus} options={[['all', L('الكل', 'All')], ['available', S.available], ['reserved', S.reserved], ['sold', S.sold], ['under_construction', S.under_construction]]} />
        {site && site.unit_types.length > 1 && <Chips label={L('النموذج', 'Type')} value={type} onChange={setType} options={[['', L('كل النماذج', 'All types')], ...site.unit_types.map((t) => [t.code, `${L('نموذج', 'Type')} ${t.code}`] as [string, string])]} />}
      </div>
      <div className="flex flex-wrap gap-3 text-xs mb-4" aria-hidden>
        {(Object.keys(S) as USt[]).map((k) => <span key={k} className="flex items-center gap-1"><span className={`h-3 w-3 rounded border ${CELL[k]}`} />{S[k]}</span>)}
      </div>
      {isLoading && <Loading />}
      {data?.data.length === 0 && <EmptyState title={L('لا توجد وحدات مطابقة', 'No matching units')} subtitle={L('قد لا تكون الوحدات مسجّلة لهذا الموقع بعد', 'Units may not be recorded yet')} />}
      {blocks.map(([block, units]) => (
        <section key={block} className="mb-5">
          <h2 className="text-sm font-semibold mb-2">{L('بلوك', 'Block')} {block} <span className="text-muted-foreground font-normal">({units.length})</span></h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5">
            {units.map((u) => (
              <button key={u.id} onClick={() => setSel(u)} className={`rounded-md border px-1 py-2 text-xs font-medium ${CELL[u.status]}`}
                aria-label={`${L('وحدة', 'Unit')} ${u.number} — ${S[u.status]} — ${L('نموذج', 'type')} ${u.type.code}`}>
                <div dir="ltr">{u.number}</div><div className="text-[10px] opacity-70">{u.type.code}</div>
              </button>
            ))}
          </div>
        </section>
      ))}
      {data && data.meta.total > data.data.length && <p className="text-xs text-muted-foreground">{L(`يظهر ${data.data.length} من ${data.meta.total} — استخدم الفلاتر`, 'Use filters to narrow')}</p>}

      <Dialog open={!!sel && !booking} onOpenChange={(o) => !o && setSel(null)}>
        {sel && (
          <DialogContent title={`${L('الوحدة', 'Unit')} ${sel.number}`} className="max-w-sm">
            <dl className="grid grid-cols-2 gap-y-2 text-sm mb-4">
              <dt className="text-muted-foreground">{L('الحالة', 'Status')}</dt><dd><Pill tone={sel.status === 'available' ? 'green' : sel.status === 'sold' ? 'navy' : sel.status === 'reserved' ? 'bronze' : 'gray'}>{S[sel.status]}</Pill></dd>
              <dt className="text-muted-foreground">{L('البلوك', 'Block')}</dt><dd>{sel.block ?? '—'}</dd>
              <dt className="text-muted-foreground">{L('النموذج', 'Type')}</dt><dd>{sel.type.code}{sel.type.area_m2 ? ` · ${sel.type.area_m2} م²` : ''}</dd>
              <dt className="text-muted-foreground">{L('السعر', 'Price')}</dt><dd>{sel.type.price ? money(sel.type.price) : '—'}</dd>
              {sel.active_booking && <><dt className="text-muted-foreground">{L('الزبون', 'Client')}</dt><dd>{sel.active_booking.client_name}</dd></>}
            </dl>
            <div className="flex flex-wrap justify-end gap-2">
              {can('re-units', 'edit') && (sel.status === 'available' || sel.status === 'under_construction') && <Button variant="secondary" size="sm" onClick={() => toggle(sel)} disabled={patch.isPending}>{sel.status === 'available' ? L('إرجاع لقيد الإنشاء', 'Mark under construction') : L('طرح للبيع', 'Release for sale')}</Button>}
              {can('re-bookings', 'create') && sel.status === 'available' && <Button size="sm" onClick={() => setBooking(true)}>{L('حجز الوحدة', 'Book unit')}</Button>}
            </div>
          </DialogContent>
        )}
      </Dialog>
      <Dialog open={booking} onOpenChange={(o) => { if (!o) { setBooking(false); setSel(null); } }}>
        {sel && <DialogContent title={`${L('حجز الوحدة', 'Book unit')} ${sel.number}`} className="max-w-lg"><BookingForm unit={sel} onDone={() => { setBooking(false); setSel(null); }} /></DialogContent>}
      </Dialog>
    </>
  );
}
