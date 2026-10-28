'use client';
import Link from 'next/link';
import { usePermission } from '@/hooks/use-permission';
import { useGet, useL, todayIso, dateAr, type Paged } from '@/lib/platform';
import { Kpi, KpiGrid, PageHeader, Pill } from '@/components/platform/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Summary { total_employees: number; present: number; late: number; absent: number; on_leave: number; not_recorded: number }
interface Announcement { id: string; title: string; body: string; category: string | null; pinned: boolean; published_at: string; published_by: { full_name: string } | null }
interface Leave { id: string; employee: { full_name: string; department: { name: string } }; type: string; start_date: string; days: number | null; hours: number | null; status: string }

export default function CompanyDashboard() {
  const L = useL();
  const { can } = usePermission();
  const today = todayIso();
  const emp = useGet<Paged<unknown>>(can('hr-employees', 'view') ? '/hr/employees' : null, { page_size: 1 });
  const att = useGet<Summary>(can('hr-attendance', 'view') ? '/hr/attendance/summary' : null, { date: today });
  const leaves = useGet<Paged<Leave>>(can('hr-leaves', 'view') ? '/hr/leaves' : null, { status: 'pending', page_size: 5 });
  const news = useGet<Paged<Announcement>>(can('announcements', 'view') ? '/announcements' : null, { page_size: 3 });
  const equipment = useGet<{ summary: Record<string, number>; meta: { total: number } }>(can('assets', 'view') ? '/assets/equipment' : null, { page_size: 1 });
  const types: Record<string, string> = { annual: L('اعتيادية', 'Annual'), sick: L('مرضية', 'Sick'), hourly: L('زمنية', 'Hourly'), maternity: L('أمومة', 'Maternity'), unpaid: L('بدون راتب', 'Unpaid') };

  return (
    <>
      <PageHeader title={L('لوحة التحكم', 'Dashboard')} subtitle={dateAr(today)} />
      <KpiGrid>
        <Kpi label={L('عدد الموظفين', 'Employees')} value={emp.data?.meta.total ?? '—'} hint={L('ضمن صلاحيتك', 'within your scope')} />
        <Kpi label={L('حاضرون اليوم', 'Present today')} value={att.data ? att.data.present + att.data.late : '—'} hint={att.data ? `${att.data.late} ${L('متأخر', 'late')} · ${att.data.absent} ${L('غائب', 'absent')}` : undefined} tone="green" />
        <Kpi label={L('إجازات بانتظار الموافقة', 'Leaves awaiting approval')} value={leaves.data?.meta.total ?? '—'} tone="bronze" />
        <Kpi label={L('معدات في الصيانة', 'Equipment in maintenance')} value={equipment.data ? (equipment.data.summary.maintenance ?? 0) : '—'} hint={equipment.data ? `${L('من', 'of')} ${equipment.data.meta.total}` : undefined} tone="red" />
      </KpiGrid>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle>{L('إجازات بانتظار قرارك', 'Leaves awaiting a decision')}</CardTitle><Link href="/company/leaves" className="text-xs text-accent font-medium">{L('كل الطلبات', 'All requests')}</Link></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {leaves.data?.data.length === 0 && <p className="text-sm text-muted-foreground">{L('لا توجد طلبات معلّقة', 'No pending requests')}</p>}
            {leaves.data?.data.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5">
                <span className="flex flex-col"><span className="text-sm font-medium">{l.employee.full_name}</span><span className="text-xs text-muted-foreground">{l.employee.department.name} · {types[l.type]} · {dateAr(l.start_date)}</span></span>
                <Pill tone="bronze">{l.days ? `${l.days} ${L('يوم', 'days')}` : `${l.hours} ${L('ساعة', 'h')}`}</Pill>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle>{L('آخر الإعلانات', 'Latest announcements')}</CardTitle><Link href="/company/announcements" className="text-xs text-accent font-medium">{L('الكل', 'All')}</Link></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {news.data?.data.map((a) => (
              <article key={a.id} className="border-b border-input last:border-0 pb-3 last:pb-0">
                <div className="flex items-center gap-2 mb-0.5">{a.pinned && <Pill tone="navy">{L('مثبّت', 'Pinned')}</Pill>}{a.category && <Pill>{a.category}</Pill>}</div>
                <h3 className="text-sm font-bold">{a.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.body}</p>
              </article>
            ))}
            {news.data?.data.length === 0 && <p className="text-sm text-muted-foreground">{L('لا توجد إعلانات', 'No announcements')}</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
