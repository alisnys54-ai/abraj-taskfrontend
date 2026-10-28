'use client';
import { useProject, SitePicker } from '@/components/platform/project-context';
import { useGet, useL, money, AR_MONTHS } from '@/lib/platform';
import { PageHeader, Kpi, KpiGrid, Loading, Bars, TableShell, Th, Td } from '@/components/platform/ui';

interface Summary { units: { available: number; reserved: number; sold: number; under_construction: number; recorded: number }; bookings_this_month: number; overdue_installments: { count: number; amount: number }; collections: { month: string; total: number }[] }

export default function ProjectHome() {
  const { project, site } = useProject();
  const L = useL();
  const sum = useGet<Summary>(site && project.portal ? `/projects/${project.key}/sites/${site.code}/summary` : null);
  const s = sum.data;
  const thisMonth = new Date().toISOString().slice(0, 7);
  return (
    <>
      <PageHeader title={project.name} subtitle={[project.kind, project.governorate].filter(Boolean).join(' · ')} actions={<SitePicker />} />
      {site && (
        <section className="rounded-xl border border-input bg-white p-5 mb-5 grid md:grid-cols-[1fr_220px] gap-5" aria-label={site.name}>
          <div>
            <h2 className="font-semibold text-lg mb-1">{site.name}</h2>
            <p className="text-sm text-muted-foreground mb-3">{site.location}</p>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {site.license && <div><dt className="text-xs text-muted-foreground">{L('الإجازة الاستثمارية', 'License')}</dt><dd>{site.license}</dd></div>}
              {site.authority && <div><dt className="text-xs text-muted-foreground">{L('الجهة', 'Authority')}</dt><dd>{site.authority}</dd></div>}
              {site.cost_label && <div><dt className="text-xs text-muted-foreground">{L('الكلفة', 'Cost')}</dt><dd>{site.cost_label}</dd></div>}
              {site.total_units > 0 && <div><dt className="text-xs text-muted-foreground">{L('عدد الوحدات', 'Units')}</dt><dd>{site.total_units}</dd></div>}
            </dl>
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex justify-between text-sm mb-1"><span>{L('نسبة الإنجاز', 'Progress')}</span><span className="font-bold text-bronze-dark">{site.progress}%</span></div>
            <div className="h-3 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={site.progress} aria-valuemin={0} aria-valuemax={100} aria-label={L('نسبة الإنجاز', 'Progress')}><div className="h-full bg-bronze" style={{ width: `${site.progress}%` }} /></div>
            {site.phase && <p className="text-xs text-muted-foreground mt-2">{site.phase}</p>}
          </div>
        </section>
      )}
      {sum.isLoading && <Loading rows={3} />}
      {s && (
        <>
          <KpiGrid>
            <Kpi label={L('متاحة للبيع', 'Available')} value={s.units.available} tone="green" />
            <Kpi label={L('محجوزة', 'Reserved')} value={s.units.reserved} tone="bronze" />
            <Kpi label={L('مباعة', 'Sold')} value={s.units.sold} />
            <Kpi label={L('حجوزات هذا الشهر', 'Bookings this month')} value={s.bookings_this_month} />
            <Kpi label={L('أقساط متأخرة', 'Overdue installments')} value={s.overdue_installments.count} tone={s.overdue_installments.count ? 'red' : 'navy'} hint={money(s.overdue_installments.amount)} />
          </KpiGrid>
          <section className="rounded-xl border border-input bg-white p-5 mt-5">
            <h2 className="font-semibold mb-3">{L('التحصيل — آخر 6 أشهر', 'Collections — last 6 months')}</h2>
            <Bars label={L('التحصيل الشهري', 'Monthly collections')} format={(v) => money(v)} items={s.collections.map((c) => ({ label: AR_MONTHS[Number(c.month.slice(5)) - 1], value: c.total, highlight: c.month === thisMonth }))} />
          </section>
        </>
      )}
      {site && site.unit_types.length > 0 && (
        <section className="mt-5">
          <h2 className="font-semibold mb-2">{L('نماذج الوحدات', 'Unit types')}</h2>
          <TableShell>
            <thead><tr><Th>{L('النموذج', 'Type')}</Th><Th>{L('المساحة', 'Area')}</Th><Th>{L('السعر', 'Price')}</Th><Th>{L('سعر المتر', 'Per m²')}</Th></tr></thead>
            <tbody>{site.unit_types.map((t) => (
              <tr key={t.id}><Td className="font-medium">{t.code}</Td><Td>{t.area_m2 ? `${t.area_m2} م²` : '—'}</Td><Td>{t.price ? money(t.price) : L('يُحدَّد لاحقاً', 'TBD')}</Td><Td className="text-muted-foreground">{t.price && t.area_m2 ? money(Math.round(t.price / t.area_m2)) : '—'}</Td></tr>
            ))}</tbody>
          </TableShell>
        </section>
      )}
      {!project.portal && <p className="text-sm text-muted-foreground mt-5">{L('هذا المشروع يُدار من بوابة الشركة — لا توجد وحدات للبيع فيه.', 'Managed from the company portal — no units for sale.')}</p>}
    </>
  );
}
