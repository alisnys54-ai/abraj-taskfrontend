'use client';
import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { api, apiErrorMessage } from './api-client';
import { useLocale } from './i18n/locale-context';

export type PortalKey = 'company' | 'riyasa' | 'qudah' | 'tasks';
export interface PortalCard { key: PortalKey; name: string; description: string; granted: boolean }
export interface Paged<T> { data: T[]; meta: { page: number; page_size: number; total: number; total_pages: number } }

/** Bilingual string helper for the platform pages: L('الموظفون', 'Employees'). */
export function useL() {
  const { locale } = useLocale();
  return (ar: string, en: string) => (locale === 'ar' ? ar : en);
}

export function usePortals() {
  return useQuery({ queryKey: ['me-portals'], queryFn: async () => (await api.get<PortalCard[]>('/me/portals')).data, staleTime: 60_000 });
}

/** GET with query params, cached under [url, params]. */
export function useGet<T>(url: string | null, params: Record<string, unknown> = {}, opts: { enabled?: boolean } = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null));
  return useQuery({
    queryKey: [url, clean] as QueryKey,
    queryFn: async () => (await api.get<T>(url!, { params: clean })).data,
    enabled: !!url && opts.enabled !== false,
  });
}

/** Mutation that invalidates every cached GET whose URL starts with one of `prefixes`. */
export function useAction<TBody = unknown, TRes = unknown>(method: 'post' | 'patch' | 'put' | 'delete', prefixes: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ url, body }: { url: string; body?: TBody }) => (await api.request<TRes>({ method, url, data: body })).data,
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === 'string' && prefixes.some((p) => (q.queryKey[0] as string).startsWith(p)) });
    },
  });
}

export { apiErrorMessage };

export function errorCode(e: unknown): string | undefined {
  return (e as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error?.code;
}

/** 110865000 → "110,865,000 د.ع" */
export function money(n: number | null | undefined, currency = 'IQD') {
  if (n === null || n === undefined) return '—';
  return `${Math.round(n).toLocaleString('en-US')} ${currency === 'USD' ? '$' : 'د.ع'}`;
}

export function todayIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

export const AR_MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
export function dateAr(iso?: string | null) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${AR_MONTHS[m - 1]} ${y}`;
}

export const PORTAL_THEME: Record<PortalKey, { label: string; tint: string; dot: string }> = {
  company: { label: 'بوابة الشركة', tint: 'bg-bronze/15 text-bronze-dark border-bronze/40', dot: 'bg-bronze' },
  riyasa: { label: 'مجمع الرئاسة', tint: 'bg-success/10 text-success border-success/30', dot: 'bg-success' },
  qudah: { label: 'مجمع القضاة', tint: 'bg-secondary/10 text-secondary border-secondary/30', dot: 'bg-secondary' },
  tasks: { label: 'نظام المهام', tint: 'bg-primary/10 text-primary border-primary/30', dot: 'bg-primary' },
};
