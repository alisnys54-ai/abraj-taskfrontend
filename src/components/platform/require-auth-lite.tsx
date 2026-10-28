'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

/** Waits for the session before anything fires API calls; PortalGuard does the full check after. */
export function RequireAuthLite({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, user, router]);
  if (loading || !user) return <div className="min-h-screen flex items-center justify-center bg-muted"><Skeleton className="h-8 w-40" /></div>;
  return <>{children}</>;
}
