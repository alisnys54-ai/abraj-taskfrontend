'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortals, useL, type PortalKey } from '@/lib/platform';

/**
 * Auth + portal gate for platform pages. The API enforces both on every
 * request (PortalAccessGuard); this only spares the user a page of 403s.
 */
export function PortalGuard({ portal, alsoAllow = [], children }: { portal: PortalKey; alsoAllow?: PortalKey[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const portals = usePortals();
  const L = useL();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.must_change_password && pathname !== '/change-password') router.replace('/change-password');
  }, [loading, user, pathname, router]);

  if (loading || !user || portals.isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-muted"><Skeleton className="h-8 w-40" /></div>;
  }
  const card = portals.data?.find((p) => p.key === portal);
  const granted = !!card?.granted || alsoAllow.some((k) => portals.data?.find((p) => p.key === k)?.granted);
  if (!granted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-6">
        <div className="max-w-md w-full rounded-xl border border-input bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Lock className="h-5 w-5" /></div>
          <h1 className="text-lg font-bold mb-1">{L('لا تملك صلاحية هذه البوابة', 'You do not have access to this portal')}</h1>
          <p className="text-sm text-muted-foreground mb-5">{card?.name}. {L('اطلب الصلاحية من مدير النظام.', 'Ask a system administrator for access.')}</p>
          <Link href="/portals" className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white">{L('العودة إلى البوابات', 'Back to portals')}</Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
