'use client';
import { useParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { RequireAuthLite } from '@/components/platform/require-auth-lite';
import { useTask, useTaskAttachments, useTaskChecklists, useTaskHistory } from '@/hooks/use-tasks';
import { useAuth } from '@/hooks/use-auth';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { dateAr } from '@/lib/platform';

const API = process.env.NEXT_PUBLIC_API_URL;

/** A4 task report — details, checklist, proof photos, activity — printed from inside the system. */
export default function TaskPrintPage() {
  return <RequireAuthLite><Sheet /></RequireAuthLite>;
}

function Sheet() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: task } = useTask(id);
  const { data: files } = useTaskAttachments(id);
  const { data: checklists } = useTaskChecklists(id);
  const { data: history } = useTaskHistory(id);
  if (!task) return <div className="p-10"><Skeleton className="h-96 max-w-3xl mx-auto" /></div>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = (files ?? []) as any[];
  const proofs = all.filter((a) => a.kind === 'proof' || (a.mime_type ?? '').startsWith('image/'));
  const others = all.filter((a) => !proofs.includes(a));
  const row = (k: string, v: React.ReactNode) => <tr><th className="w-36 bg-muted/60 px-3 py-1.5 text-start font-medium border border-input">{k}</th><td className="px-3 py-1.5 border border-input">{v}</td></tr>;

  return (
    <div className="min-h-screen bg-muted py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end gap-2 px-4">
        <Button variant="secondary" onClick={() => window.close()}>إغلاق</Button>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" />طباعة</Button>
      </div>
      <article className="print-sheet mx-auto max-w-[210mm] bg-white p-[14mm] text-[13px] shadow print:shadow-none" aria-label={`تقرير المهمة ${task.code}`}>
        <header className="flex items-center justify-between border-b-2 border-primary pb-3 mb-4">
          <div><div className="text-lg font-bold text-primary">شركة أبراج الياسر</div><div className="text-xs text-muted-foreground">تقرير مهمة — نظام المهام</div></div>
          <img src="/logo-icon.png" alt="" className="h-12" />
        </header>
        <h1 className="text-xl font-bold mb-1">{task.title}</h1>
        <p className="text-xs text-muted-foreground mb-4" dir="ltr" style={{ textAlign: 'right' }}>{task.code}</p>
        <table className="w-full border-collapse mb-4">
          <tbody>
            {row('الحالة', <StatusBadge name={task.status.name} />)}
            {row('الأولوية', <PriorityBadge name={task.priority.name} />)}
            {row('القسم', task.department?.name ?? '—')}
            {row('المكلَّف', task.assignee?.full_name ?? '—')}
            {row('المنشئ', task.creator?.full_name ?? '—')}
            {row('تاريخ الاستحقاق', dateAr(task.due_date))}
          </tbody>
        </table>
        {task.description && <><h2 className="font-semibold mb-1">الوصف</h2><p className="mb-4 whitespace-pre-line leading-7">{task.description}</p></>}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {checklists?.checklists?.map((c: any) => (
          <section key={c.id} className="mb-4"><h2 className="font-semibold mb-1">{c.title} — {checklists.progress_percent}%</h2>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <ul className="space-y-0.5">{c.items.map((it: any) => <li key={it.id}>{it.is_done ? '☑' : '☐'} {it.text}</li>)}</ul>
          </section>
        ))}
        {proofs.length > 0 && (
          <section className="mb-4 break-inside-avoid">
            <h2 className="font-semibold mb-2">صور وإثباتات الإنجاز ({proofs.length})</h2>
            <div className="grid grid-cols-2 gap-3">
              {proofs.map((a) => (
                <figure key={a.id} className="border border-input rounded p-1 break-inside-avoid">
                  <img src={`${API}/attachments/${a.id}/file`} alt={a.file_name} className="w-full max-h-[80mm] object-contain" />
                  <figcaption className="text-[11px] text-muted-foreground mt-1">{a.kind === 'proof' ? 'إثبات إنجاز' : 'صورة'} · {dateAr(a.created_at)}{a.note ? ` — ${a.note}` : ''}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
        {others.length > 0 && <section className="mb-4"><h2 className="font-semibold mb-1">مرفقات أخرى</h2><ul>{others.map((a) => <li key={a.id}>📎 {a.file_name}</li>)}</ul></section>}
        {history?.data?.length > 0 && (
          <section className="mb-4">
            <h2 className="font-semibold mb-1">سجل النشاط</h2>
            <table className="w-full border-collapse text-[12px]"><tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {history.data.slice(0, 15).map((h: any) => <tr key={h.id}><td className="border border-input px-2 py-1 whitespace-nowrap">{dateAr(h.created_at)}</td><td className="border border-input px-2 py-1">{h.actor?.full_name ?? '—'}</td><td className="border border-input px-2 py-1">{h.action.replace(/_/g, ' ')}{h.new_value ? `: ${h.new_value}` : ''}</td></tr>)}
            </tbody></table>
          </section>
        )}
        <footer className="mt-10 grid grid-cols-3 gap-6 text-center text-xs">
          <div className="border-t pt-1">المنفّذ</div><div className="border-t pt-1">المراجع</div><div className="border-t pt-1">مدير القسم</div>
        </footer>
        <p className="mt-6 text-[10px] text-muted-foreground">طُبع بواسطة {user?.full_name} · {dateAr(new Date().toISOString())}</p>
      </article>
    </div>
  );
}
