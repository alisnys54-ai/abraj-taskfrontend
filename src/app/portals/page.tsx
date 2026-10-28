'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Home, Landmark, ListChecks, Lock, LogOut, ChevronLeft, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { usePortals, useL, type PortalKey } from '@/lib/platform';

const META: Record<PortalKey, { href: string; icon: LucideIcon; ring: string }> = {
  company: { href: '/company', icon: Building2, ring: 'border-bronze/50 bg-bronze/10 text-bronze-light' },
  riyasa: { href: '/p/riyasa', icon: Home, ring: 'border-emerald-300/50 bg-emerald-300/10 text-emerald-200' },
  qudah: { href: '/p/qudah', icon: Landmark, ring: 'border-sky-300/50 bg-sky-300/10 text-sky-200' },
  tasks: { href: '/dashboard', icon: ListChecks, ring: 'border-white/30 bg-white/10 text-white' },
};

export default function PortalsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const portals = usePortals();
  const L = useL();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.must_change_password) router.replace('/change-password');
  }, [loading, user, router]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? L('صباح الخير', 'Good morning') : L('مساء الخير', 'Good evening');

  return (
    <div className="min-h-screen bg-primary text-white">
      <header className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <img src="/logo-icon.png" alt={L('شعار أبراج الياسر', 'Abraj Al Yasir logo')} className="h-12 w-auto" />
          <span className="flex flex-col leading-tight">
            <span className="font-bold">{L('أبراج الياسر', 'Abraj Al Yasir')}</span>
            <span className="text-[11px] tracking-[2px] text-bronze-light" dir="ltr">ABRAJ AL YASIR</span>
          </span>
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 ps-1 pe-3 py-1">
              <Avatar name={user.full_name} size={32} />
              <span className="flex flex-col leading-tight"><span className="text-sm font-medium">{user.full_name}</span><span className="text-[11px] text-white/60">{user.role?.name}</span></span>
            </span>
            <button onClick={logout} className="inline-flex items-center gap-1.5 h-10 rounded-md border border-white/20 px-3 text-sm text-white/80 hover:bg-white/10"><LogOut className="h-4 w-4" />{L('خروج', 'Sign out')}</button>
          </div>
        )}
      </header>
      <main className="max-w-6xl mx-auto px-5 pb-14">
        <p className="text-bronze-light text-sm font-medium">{greet}</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1 mb-2">{L('اختر البوابة التي تريد العمل عليها', 'Choose the portal you want to work in')}</h1>
        <p className="text-white/60 text-sm mb-8">{L('تظهر لك البوابات حسب صلاحياتك، وكل بوابة مستقلة ببياناتها.', 'Portals appear according to your access; each keeps its own data.')}</p>
        {(loading || portals.isLoading) && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 bg-white/10" />)}</div>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {portals.data?.map((p) => {
            const m = META[p.key];
            const Icon = m.icon;
            const body = (
              <>
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl border ${m.ring}`}><Icon className="h-6 w-6" /></span>
                <span className="text-lg font-bold leading-snug">{p.name}</span>
                <span className="text-sm text-white/60 flex-1">{p.description}</span>
                {p.granted
                  ? <span className="inline-flex items-center justify-center gap-1 h-11 rounded-lg bg-bronze text-primary font-bold">{L('دخول', 'Enter')}<ChevronLeft className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" /></span>
                  : <span className="inline-flex items-center justify-center gap-1.5 h-11 rounded-lg border border-dashed border-white/30 text-white/70 text-sm"><Lock className="h-4 w-4" />{L('غير مصرّح — اطلب الصلاحية', 'Not authorised — request access')}</span>}
              </>
            );
            return p.granted
              ? <Link key={p.key} href={m.href} className="group flex flex-col gap-3 rounded-2xl border border-white/15 bg-secondary/60 p-5 hover:border-bronze/60 hover:-translate-y-1 transition">{body}</Link>
              : <div key={p.key} aria-disabled="true" className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 opacity-70">{body}</div>;
          })}
        </div>
      </main>
    </div>
  );
}
