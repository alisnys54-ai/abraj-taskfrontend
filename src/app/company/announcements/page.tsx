'use client';
import { useState } from 'react';
import { Pin, Trash2, Megaphone } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import { useAuth } from '@/hooks/use-auth';
import { useGet, useAction, useL, dateAr, apiErrorMessage, type Paged } from '@/lib/platform';
import { PageHeader, Loading, Field, Pill } from '@/components/platform/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState, Pagination } from '@/components/shared/states';
import { useToast } from '@/components/ui/toast';

interface Ann { id: string; title: string; body: string; category: string | null; audience: 'all' | 'department'; department: { name: string } | null; pinned: boolean; published_by: { id: string; full_name: string } | null; published_at: string }

export default function AnnouncementsPage() {
  const L = useL();
  const { can, scopeFor } = usePermission();
  const { user } = useAuth();
  const { push } = useToast();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGet<Paged<Ann>>('/announcements', { page, page_size: 20 });
  const create = useAction('post', ['/announcements']);
  const del = useAction('delete', ['/announcements']);
  const companyWide = scopeFor('announcements', 'create') === 'all';
  const [form, setForm] = useState({ title: '', body: '', category: '', audience: companyWide ? 'all' : 'department', pinned: false });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ url: '/announcements', body: { ...form, category: form.category || undefined } });
      push(L('نُشر التعميم ووصل إشعار للمعنيين', 'Published')); setForm((f) => ({ ...f, title: '', body: '', category: '' }));
    } catch (err) { push(apiErrorMessage(err), 'error'); }
  };

  return (
    <>
      <PageHeader title={L('التعاميم', 'Announcements')} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-3">
          {isLoading && <Loading />}
          {data?.data.length === 0 && <EmptyState title={L('لا توجد تعاميم', 'No announcements')} />}
          {data?.data.map((a) => (
            <article key={a.id} className="rounded-xl border border-input bg-white p-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {a.pinned && <Pin className="h-3.5 w-3.5 text-bronze" aria-label={L('مثبّت', 'Pinned')} />}
                <h2 className="font-semibold">{a.title}</h2>
                {a.category && <Pill tone="navy">{a.category}</Pill>}
                <Pill tone={a.audience === 'all' ? 'bronze' : 'gray'}>{a.audience === 'all' ? L('الجميع', 'Everyone') : a.department?.name ?? L('قسم', 'Dept')}</Pill>
                {(a.published_by?.id === user?.id || companyWide) && can('announcements', 'delete') && (
                  <Button size="sm" variant="ghost" className="ms-auto" aria-label={L('حذف التعميم', 'Delete')} onClick={async () => { try { await del.mutateAsync({ url: `/announcements/${a.id}` }); push(L('حُذف', 'Deleted')); } catch (e) { push(apiErrorMessage(e), 'error'); } }}><Trash2 className="h-3.5 w-3.5" /></Button>
                )}
              </div>
              <p className="text-sm whitespace-pre-line leading-7">{a.body}</p>
              <p className="text-[11px] text-muted-foreground mt-2">{a.published_by?.full_name ?? '—'} · {dateAr(a.published_at)}</p>
            </article>
          ))}
          {data && data.meta.total_pages > 1 && <Pagination page={page} totalPages={data.meta.total_pages} onChange={setPage} />}
        </div>
        {can('announcements', 'create') && (
          <form onSubmit={submit} className="rounded-xl border border-input bg-white p-4 space-y-3 lg:sticky lg:top-4">
            <h2 className="font-semibold flex items-center gap-2"><Megaphone className="h-4 w-4 text-bronze" />{L('تعميم جديد', 'New announcement')}</h2>
            <Field label={L('العنوان *', 'Title *')} htmlFor="an-t"><Input id="an-t" required maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label={L('النص *', 'Body *')} htmlFor="an-b"><textarea id="an-b" required maxLength={5000} rows={5} className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
            <Field label={L('التصنيف', 'Category')} htmlFor="an-c"><Input id="an-c" maxLength={40} placeholder={L('إداري، سلامة، رواتب…', 'Admin, safety…')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
            <Field label={L('الجمهور', 'Audience')} htmlFor="an-a">
              <Select id="an-a" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                {companyWide && <option value="all">{L('كل الشركة', 'Whole company')}</option>}
                <option value="department">{L('قسمي فقط', 'My department')}</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />{L('تثبيت في الأعلى', 'Pin to top')}</label>
            <Button type="submit" className="w-full" disabled={create.isPending}>{L('نشر', 'Publish')}</Button>
          </form>
        )}
      </div>
    </>
  );
}
