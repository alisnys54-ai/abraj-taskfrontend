'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useProject, SitePicker } from '@/components/platform/project-context';
import { usePermission } from '@/hooks/use-permission';
import { useGet, useAction, useL, dateAr, apiErrorMessage, type Paged } from '@/lib/platform';
import { PageHeader, TableShell, Th, Td, Loading, Chips, Pill, Field } from '@/components/platform/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState, Pagination } from '@/components/shared/states';
import { useToast } from '@/components/ui/toast';

type TSt = 'open' | 'in_progress' | 'closed';
type TPr = 'low' | 'medium' | 'high';
interface Ticket { id: string; code: string; site: { name: string }; unit: { number: string } | null; client: { full_name: string; phone: string } | null; title: string; description: string | null; priority: TPr; status: TSt; assignee: { full_name: string } | null; created_by: { full_name: string }; created_at: string }

export default function TicketsPage() {
  const { project, site } = useProject();
  const L = useL();
  const { can } = usePermission();
  const { push } = useToast();
  const [status, setStatus] = useState<'all' | TSt>('open');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: '', description: '', priority: 'medium' as TPr });
  const { data, isLoading } = useGet<Paged<Ticket>>(`/projects/${project.key}/tickets`, { site_code: site?.code, status: status === 'all' ? undefined : status, page, page_size: 20 });
  const create = useAction('post', [`/projects/${project.key}`]);
  const patch = useAction('patch', [`/projects/${project.key}`]);
  const S: Record<TSt, string> = { open: L('مفتوح', 'Open'), in_progress: L('قيد المعالجة', 'In progress'), closed: L('مغلق', 'Closed') };
  const P: Record<TPr, string> = { low: L('منخفضة', 'Low'), medium: L('متوسطة', 'Medium'), high: L('عالية', 'High') };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!site) return;
    try { const t = await create.mutateAsync({ url: `/projects/${project.key}/tickets`, body: { site_code: site.code, ...f, description: f.description || undefined } }) as Ticket; push(L(`فُتح الطلب ${t.code}`, `Opened ${t.code}`)); setAdding(false); setF({ title: '', description: '', priority: 'medium' }); }
    catch (err) { push(apiErrorMessage(err), 'error'); }
  };

  return (
    <>
      <PageHeader title={L('طلبات الصيانة', 'Maintenance')} subtitle={site?.name} actions={<div className="flex gap-2"><SitePicker />{can('re-tickets', 'create') && <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" />{L('طلب جديد', 'New')}</Button>}</div>} />
      <div className="mb-4"><Chips label={L('الحالة', 'Status')} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[['open', S.open], ['in_progress', S.in_progress], ['closed', S.closed], ['all', L('الكل', 'All')]]} /></div>
      {isLoading && <Loading />}
      {data?.data.length === 0 && <EmptyState title={L('لا توجد طلبات', 'No tickets')} />}
      {data && data.data.length > 0 && (
        <TableShell>
          <thead><tr><Th>{L('الرمز', 'Code')}</Th><Th>{L('الطلب', 'Ticket')}</Th><Th>{L('الأولوية', 'Priority')}</Th><Th>{L('فتحه', 'By')}</Th><Th>{L('التاريخ', 'Date')}</Th><Th>{L('الحالة', 'Status')}</Th></tr></thead>
          <tbody>{data.data.map((t) => (
            <tr key={t.id}>
              <Td className="text-muted-foreground"><span dir="ltr">{t.code}</span></Td>
              <Td><div className="font-medium">{t.title}</div>{t.unit && <div className="text-[11px] text-muted-foreground">{L('وحدة', 'Unit')} {t.unit.number}{t.client ? ` · ${t.client.full_name}` : ''}</div>}</Td>
              <Td><Pill tone={t.priority === 'high' ? 'red' : t.priority === 'medium' ? 'bronze' : 'gray'}>{P[t.priority]}</Pill></Td>
              <Td className="text-muted-foreground">{t.created_by.full_name}</Td>
              <Td className="whitespace-nowrap">{dateAr(t.created_at)}</Td>
              <Td>{can('re-tickets', 'edit') ? (
                <Select aria-label={`${L('حالة', 'Status')} ${t.code}`} className="h-8 w-36" value={t.status} onChange={async (e) => { try { await patch.mutateAsync({ url: `/projects/${project.key}/tickets/${t.id}`, body: { status: e.target.value } }); push(L('حُدّث الطلب', 'Updated')); } catch (er) { push(apiErrorMessage(er), 'error'); } }}>
                  {(Object.keys(S) as TSt[]).map((k) => <option key={k} value={k}>{S[k]}</option>)}
                </Select>) : <Pill tone={t.status === 'closed' ? 'green' : 'navy'}>{S[t.status]}</Pill>}</Td>
            </tr>))}
          </tbody>
        </TableShell>
      )}
      {data && data.meta.total_pages > 1 && <Pagination page={page} totalPages={data.meta.total_pages} onChange={setPage} />}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent title={L('طلب صيانة جديد', 'New ticket')} className="max-w-md">
          <form onSubmit={submit} className="space-y-3">
            <Field label={L('العنوان *', 'Title *')} htmlFor="tk-t"><Input id="tk-t" required maxLength={160} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
            <Field label={L('التفاصيل', 'Details')} htmlFor="tk-d"><textarea id="tk-d" rows={3} maxLength={2000} className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <Field label={L('الأولوية', 'Priority')} htmlFor="tk-p"><Select id="tk-p" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as TPr })}>{(Object.keys(P) as TPr[]).map((k) => <option key={k} value={k}>{P[k]}</option>)}</Select></Field>
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setAdding(false)}>{L('إلغاء', 'Cancel')}</Button><Button type="submit" disabled={create.isPending}>{L('فتح الطلب', 'Open ticket')}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
