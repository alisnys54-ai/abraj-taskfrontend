'use client';
import { use } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Home, FileSignature, Banknote, HardHat, Wrench, ListChecks } from 'lucide-react';
import { PortalGuard } from '@/components/platform/portal-guard';
import { PortalShell } from '@/components/platform/portal-shell';
import { ProjectProvider, useProject } from '@/components/platform/project-context';
import { RequireAuthLite } from '@/components/platform/require-auth-lite';
import { usePermission } from '@/hooks/use-permission';
import { Skeleton } from '@/components/ui/skeleton';
import { useL } from '@/lib/platform';

export default function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const L = useL();
  return (
    <RequireAuthLite>
      <ProjectProvider projectKey={key}
        fallback={<div className="min-h-screen flex items-center justify-center bg-muted"><Skeleton className="h-8 w-40" /></div>}
        error={<div className="min-h-screen flex flex-col gap-3 items-center justify-center bg-muted p-6 text-center"><p className="font-semibold">{L('المشروع غير موجود أو لا تملك صلاحيته', 'Project not found or not permitted')}</p><Link className="text-accent underline" href="/portals">{L('العودة إلى البوابات', 'Back to portals')}</Link></div>}>
        <Shell>{children}</Shell>
      </ProjectProvider>
    </RequireAuthLite>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { project, base } = useProject();
  const { can } = usePermission();
  const L = useL();
  const portal = project.portal ?? 'company';
  const nav = [
    { href: base, label: L('لوحة المشروع', 'Overview'), icon: LayoutDashboard, exact: true },
    { href: `${base}/units`, label: L('الوحدات السكنية', 'Units'), icon: Home, show: can('re-units', 'view') },
    { href: `${base}/bookings`, label: L('الحجوزات والعقود', 'Bookings'), icon: FileSignature, show: can('re-bookings', 'view') },
    { href: `${base}/installments`, label: L('الأقساط والتحصيل', 'Installments'), icon: Banknote, show: can('re-installments', 'view') },
    { href: `${base}/reports`, label: L('تقارير الموقع اليومية', 'Site reports'), icon: HardHat, show: can('re-site-reports', 'view') },
    { href: `${base}/tickets`, label: L('طلبات الصيانة', 'Maintenance'), icon: Wrench, show: can('re-tickets', 'view') },
    { href: '/dashboard', label: L('نظام المهام', 'Tasks'), icon: ListChecks },
  ];
  return (
    <PortalGuard portal={portal} alsoAllow={['company']}>
      <PortalShell portal={portal} title={project.name} nav={nav}>{children}</PortalShell>
    </PortalGuard>
  );
}
