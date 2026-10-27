'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftRight, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { PORTAL_THEME, type PortalKey, useL } from '@/lib/platform';

export interface PortalNavItem { href: string; label: string; icon: LucideIcon; show?: boolean; exact?: boolean }

/** Navy sidebar + bronze accents; one shell for every portal, fed its own menu. */
export function PortalShell({ portal, title, nav, children }: { portal: PortalKey; title: string; nav: PortalNavItem[]; children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const L = useL();
  const theme = PORTAL_THEME[portal];
  const items = nav.filter((n) => n.show !== false);

  const side = (
    <>
      <div className="flex items-center justify-between gap-2.5 px-4 py-4 border-b border-white/10">
        <Link href="/portals" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <img src="/logo-icon.png" alt={L('أبراج الياسر', 'Abraj Al Yasir')} className="h-10 w-auto" />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-white">{L('أبراج الياسر', 'Abraj Al Yasir')}</span>
            <span className="text-[10px] tracking-[2px] text-bronze-light" dir="ltr">ABRAJ AL YASIR</span>
          </span>
        </Link>
        <button className="lg:hidden text-white/70" onClick={() => setOpen(false)} aria-label={L('إغلاق القائمة', 'Close menu')}><X className="h-5 w-5" /></button>
      </div>
      <div className="mx-3 mt-3 rounded-lg border border-bronze/30 bg-bronze/10 px-3 py-2">
        <div className="text-[10px] text-white/60">{L('البوابة الحالية', 'Current portal')}</div>
        <div className="text-sm font-medium text-bronze-light">{title}</div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5" aria-label={title}>
        {items.map((n) => {
          const active = pathname === n.href || (!n.exact && n.href.split('/').length > 2 && pathname.startsWith(n.href + '/'));
          return (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}
              className={cn('flex items-center gap-2.5 rounded-md px-3 min-h-[40px] text-sm text-white/70 hover:bg-white/10 hover:text-white', active && 'bg-bronze/20 text-bronze-light font-medium')}>
              <n.icon className="h-4 w-4 flex-none" />{n.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10 flex flex-col gap-1">
        <Link href="/portals" className="flex items-center gap-2.5 rounded-md px-3 min-h-[40px] text-sm text-white/70 hover:bg-white/10 hover:text-white"><ArrowLeftRight className="h-4 w-4" />{L('تبديل البوابة', 'Switch portal')}</Link>
        <button onClick={logout} className="flex items-center gap-2.5 rounded-md px-3 min-h-[40px] text-sm text-white/70 hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" />{L('تسجيل الخروج', 'Sign out')}</button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-muted">
      <aside className="hidden lg:flex w-64 flex-none bg-primary flex-col no-print">{side}</aside>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex no-print">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative z-50 w-72 max-w-[85vw] bg-primary flex flex-col">{side}</aside>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 flex-none bg-white border-b border-input flex items-center gap-3 px-4 lg:px-6 no-print">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label={L('فتح القائمة', 'Open menu')}><Menu className="h-5 w-5" /></button>
          <span className={cn('hidden sm:inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium', theme.tint)}>
            <span className={cn('h-2 w-2 rounded-full', theme.dot)} />{title}
          </span>
          <div className="flex-1" />
          <Link href="/portals" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeftRight className="h-3.5 w-3.5" />{L('تبديل البوابة', 'Switch portal')}</Link>
          <Link href="/profile" className="flex items-center gap-2">
            <Avatar name={user?.full_name ?? '?'} size={32} />
            <span className="hidden md:flex flex-col leading-tight">
              <span className="text-xs font-medium">{user?.full_name}</span>
              <span className="text-[10px] text-muted-foreground">{user?.role?.name}</span>
            </span>
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
