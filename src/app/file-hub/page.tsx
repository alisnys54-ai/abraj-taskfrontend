'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Printer, FolderOpen } from 'lucide-react';
import { RequireAuth } from '@/components/layout/require-auth';
import { usePermission } from '@/hooks/use-permission';
import { useGet, useL, dateAr, type Paged } from '@/lib/platform';
import { PageHeader, Kpi, KpiGrid, Loading, Chips, Pill } from '@/components/platform/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, Pagination } from '@/components/shared/states';

type Kind = 'document' | 'photo' | 'proof';
interface HubFile { id: string; file_name: string; kind: Kind; note: string | null; mime_type: string | null; uploader: { full_name: string }; created_at: string; task: { id: string; code: string; title: string; status: string }; department: { id: string; name: string } }
interface Summary { departments: { department_id: string; department: string; document: number; photo: number; proof: number; total: number }[]; totals: { document: number; photo: number; proof: number; total: number } }
const API = process.env.NEXT_PUBLIC_API_URL;

/** Every task file filed by department. General manager: all departments. Department manager: locked to theirs by the API. */
export default function FileHubPage() {
  const L = useL();
  const { scopeFor } = usePermission();
  const scope = scopeFor('files', 'view');
  const [dept, setDept] = useState('');
  const [kind, setKind] = useState<'' | Kind>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const enabled = scope === 'all' || scope === 'department';
  const summary = useGet<Summary>(enabled ? '/file-hub/summary' : null);
  const list = useGet<Paged<HubFile> & { locked_department_id: string | null }>(enabled ? '/file-hub' : null, { department_id: dept, kind, search, page, page_size: 60 });
  const K: Record<Kind, string> = { document: L('مستندات', 'Documents'), photo: L('صور', 'Photos'), proof: L('إثباتات', 'Proofs') };
  const groups = useMemo(() => {
    const m = new Map<string, { name: string; files: HubFile[] }>();
    list.data?.data.forEach((f) => { const g = m.get(f.department.id) ?? { name: f.department.name, files: [] }; g.files.push(f); m.set(f.department.id, g); });
    return [...m.values()];
  }, [list.data]);
  const s = summary.data;

  return (
    <RequireAuth>
      {!enabled ? <EmptyState title={L('مركز الملفات للمدراء', 'The file hub is for managers')} subtitle={L('ملفات مهامك موجودة داخل كل مهمة', 'Your files are inside each task')} /> : (
      <div className="max-w-6xl">
        <div className="no-print">
          <PageHeader title={L('مركز الملفات', 'File hub')} subtitle={scope === 'department' ? L(`ملفات ${s?.departments[0]?.department ?? 'قسمك'} فقط`, 'Your department only') : L('كل ملفات الشركة مرتبة حسب الأقسام', 'All company files by department')}
            actions={<Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />{L('طباعة الفهرس', 'Print index')}</Button>} />
          {s && <KpiGrid>
            <Kpi label={L('كل الملفات', 'All files')} value={s.totals.total} />
            <Kpi label={K.proof} value={s.totals.proof} tone="green" />
            <Kpi label={K.photo} value={s.totals.photo} tone="bronze" />
            <Kpi label={K.document} value={s.totals.document} />
          </KpiGrid>}
          <div className="flex flex-wrap items-center gap-2 my-4">
            <label htmlFor="hub-q" className="sr-only">{L('بحث', 'Search')}</label>
            <Input id="hub-q" className="max-w-xs" placeholder={L('اسم الملف أو المهمة أو الرافع', 'File, task or uploader')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            {scope === 'all' && s && s.departments.length > 1 && (
              <Chips label={L('القسم', 'Department')} value={dept} onChange={(v) => { setDept(v); setPage(1); }} options={[['', L('كل الأقسام', 'All departments')], ...s.departments.map((d) => [d.department_id, `${d.department} (${d.total})`] as [string, string])]} />
            )}
            <Chips label={L('نوع الملف', 'File type')} value={kind} onChange={(v) => { setKind(v); setPage(1); }} options={[['', L('الكل', 'All')], ['proof', K.proof], ['photo', K.photo], ['document', K.document]]} />
          </div>
        </div>
        {list.isLoading && <Loading />}
        {list.data?.data.length === 0 && <EmptyState title={L('لا توجد ملفات مطابقة', 'No matching files')} />}
        <div className="print-sheet">
          <h1 className="hidden print:block text-lg font-bold mb-3">{L('فهرس ملفات المهام', 'Task file index')} — {dateAr(new Date().toISOString())}</h1>
          {groups.map((g) => (
            <section key={g.name} className="mb-6">
              <h2 className="flex items-center gap-2 font-semibold mb-2"><FolderOpen className="h-4 w-4 text-bronze" />{g.name} <span className="text-xs text-muted-foreground font-normal">({g.files.length})</span></h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 print:hidden">
                {g.files.map((f) => {
                  const url = `${API}/attachments/${f.id}/file`; const img = (f.mime_type ?? '').startsWith('image/');
                  return (
                    <div key={f.id} className="flex gap-3 rounded-lg border border-input bg-white p-2.5">
                      <a href={url} target="_blank" rel="noreferrer" className="flex-none">
                        {img ? <img src={url} alt="" loading="lazy" className="h-14 w-14 rounded object-cover border border-input" /> : <span className="flex h-14 w-14 items-center justify-center rounded bg-muted text-xl" aria-hidden>📄</span>}
                      </a>
                      <div className="min-w-0 flex-1 text-xs">
                        <a href={url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium hover:underline">{f.file_name}</a>
                        <Link href={`/tasks/${f.task.id}`} className="block truncate text-accent">{f.task.code} · {f.task.title}</Link>
                        <div className="mt-1 flex items-center gap-1.5 text-muted-foreground"><Pill tone={f.kind === 'proof' ? 'green' : f.kind === 'photo' ? 'bronze' : 'gray'}>{K[f.kind]}</Pill><span className="truncate">{f.uploader.full_name} · {dateAr(f.created_at)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <table className="hidden print:table w-full border-collapse text-[11px]"><tbody>
                {g.files.map((f) => <tr key={f.id}><td className="border px-2 py-1">{f.file_name}</td><td className="border px-2 py-1">{K[f.kind]}</td><td className="border px-2 py-1">{f.task.code} — {f.task.title}</td><td className="border px-2 py-1">{f.uploader.full_name}</td><td className="border px-2 py-1 whitespace-nowrap">{dateAr(f.created_at)}</td></tr>)}
              </tbody></table>
            </section>
          ))}
        </div>
        {list.data && list.data.meta.total_pages > 1 && <div className="no-print"><Pagination page={page} totalPages={list.data.meta.total_pages} onChange={setPage} /></div>}
      </div>)}
    </RequireAuth>
  );
}
