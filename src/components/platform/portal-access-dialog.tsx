'use client';
import { useEffect, useState } from 'react';
import { useGet, useAction, useL, PORTAL_THEME, apiErrorMessage, type PortalKey } from '@/lib/platform';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

const ORDER: PortalKey[] = ['company', 'riyasa', 'qudah', 'tasks'];

/** Which portals a user may open. Roles decide what they can do inside; this decides where. */
export function PortalAccessDialog({ user, onClose }: { user: { id: string; full_name: string } | null; onClose: () => void }) {
  const L = useL();
  const { push } = useToast();
  const q = useGet<{ portals: PortalKey[]; implicit: boolean }>(user ? `/users/${user.id}/portals` : null);
  const save = useAction('put', ['/users/', '/me/portals']);
  const [sel, setSel] = useState<PortalKey[]>([]);
  useEffect(() => { if (q.data) setSel(q.data.portals); }, [q.data]);
  const toggle = (k: PortalKey) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const submit = async () => {
    if (!user) return;
    try { await save.mutateAsync({ url: `/users/${user.id}/portals`, body: { portals: sel } }); push(L('حُدّثت صلاحية البوابات', 'Portal access saved')); onClose(); }
    catch (e) { push(apiErrorMessage(e), 'error'); }
  };
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={L(`البوابات — ${user?.full_name ?? ''}`, `Portals — ${user?.full_name ?? ''}`)} className="max-w-sm">
        <p className="text-xs text-muted-foreground mb-3">{L('الدور يحدد ماذا يفعل الموظف، والبوابات تحدد أين. بوابة الشركة تمنح الإشراف على كل المشاريع.', 'Role = what; portals = where. The company portal oversees every project.')}</p>
        {q.data?.implicit && <p className="text-sm rounded-md bg-muted px-3 py-2 mb-3">{L('مالك النظام يملك كل البوابات دائماً.', 'The system owner always has every portal.')}</p>}
        <fieldset disabled={q.data?.implicit} className="space-y-2">
          <legend className="sr-only">{L('البوابات', 'Portals')}</legend>
          {ORDER.map((k) => (
            <label key={k} className="flex items-center gap-3 rounded-lg border border-input px-3 py-2.5 text-sm cursor-pointer has-[:checked]:border-bronze has-[:checked]:bg-bronze/5">
              <input type="checkbox" checked={sel.includes(k)} onChange={() => toggle(k)} />
              <span className={`h-2.5 w-2.5 rounded-full ${PORTAL_THEME[k].dot}`} aria-hidden />
              {PORTAL_THEME[k].label}
            </label>
          ))}
        </fieldset>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose}>{L('إلغاء', 'Cancel')}</Button>
          {!q.data?.implicit && <Button onClick={submit} disabled={save.isPending || q.isLoading}>{L('حفظ', 'Save')}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
