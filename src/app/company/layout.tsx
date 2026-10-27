'use client';
import { LayoutDashboard, Users, Clock, CalendarDays, Wallet, Megaphone, Truck, Building2, ListChecks } from 'lucide-react';
import { PortalGuard } from '@/components/platform/portal-guard';
import { PortalShell } from '@/components/platform/portal-shell';
import { usePermission } from '@/hooks/use-permission';
import { useL } from '@/lib/platform';

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { can } = usePermission();
  const L = useL();
  const nav = [
    { href: '/company', label: L('لوحة التحكم', 'Dashboard'), icon: LayoutDashboard },
    { href: '/company/employees', label: L('الموظفون', 'Employees'), icon: Users, show: can('hr-employees', 'view') },
    { href: '/company/attendance', label: L('الحضور والانصراف', 'Attendance'), icon: Clock, show: can('hr-attendance', 'view') },
    { href: '/company/leaves', label: L('الإجازات', 'Leaves'), icon: CalendarDays, show: can('hr-leaves', 'view') },
    { href: '/company/payroll', label: L('الرواتب', 'Payroll'), icon: Wallet, show: can('payroll', 'view') },
    { href: '/company/announcements', label: L('الإعلانات الداخلية', 'Announcements'), icon: Megaphone, show: can('announcements', 'view') },
    { href: '/company/assets', label: L('المعامل والمعدات', 'Plants & equipment'), icon: Truck, show: can('assets', 'view') },
    { href: '/company/projects', label: L('المشاريع والاستثمارات', 'Projects & investments'), icon: Building2, show: can('re-projects', 'view') },
    { href: '/dashboard', label: L('نظام المهام', 'Tasks'), icon: ListChecks },
  ];
  return (
    <PortalGuard portal="company">
      <PortalShell portal="company" title={L('بوابة الشركة — أبراج الياسر', 'Company portal')} nav={nav}>{children}</PortalShell>
    </PortalGuard>
  );
}
