'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, ScanLine, Upload, RotateCw, RefreshCcw } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api-client';
import { useL } from '@/lib/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

type Mode = 'camera' | 'scan' | 'file';
type Filter = 'original' | 'document' | 'gray';
const MAX = 1800;

/**
 * Proof-of-completion capture without any outside app: live camera, a
 * document "scanner" (frame guide + contrast filter), or a file from the
 * device. Edits happen on a canvas; the result uploads as kind=proof.
 */
export function ProofCapture({ taskId, open, onClose, onSaved, submitLabel }: {
  taskId: string; open: boolean; onClose: () => void; onSaved: (submitAfter: boolean) => void; submitLabel?: string;
}) {
  const L = useL();
  const { push } = useToast();
  const [mode, setMode] = useState<Mode | null>(null);
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [filter, setFilter] = useState<Filter>('original');
  const [rotation, setRotation] = useState(0);
  const [preview, setPreview] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [camError, setCamError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stop = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  const reset = () => { stop(); setMode(null); setSource(null); setPreview(''); setFilter('original'); setRotation(0); setCamError(''); };
  useEffect(() => { if (!open) { reset(); setNote(''); } return stop; }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCamera = async (m: Mode) => {
    reset(); setMode(m);
    if (!navigator.mediaDevices?.getUserMedia) { setCamError(L('المتصفح لا يدعم الكاميرا — استخدم «من الجهاز»', 'Camera not supported — use “From device”')); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false });
      streamRef.current = s;
      if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}); }
    } catch { setCamError(L('لم يُسمح بالوصول للكاميرا. اسمح بها من إعدادات المتصفح أو ارفع صورة من الجهاز.', 'Camera permission denied.')); }
  };
  useEffect(() => { if (videoRef.current && streamRef.current && !videoRef.current.srcObject) videoRef.current.srcObject = streamRef.current; });

  const toCanvas = (img: CanvasImageSource, w: number, h: number) => {
    const k = Math.min(1, MAX / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); return c;
  };
  const capture = () => {
    const v = videoRef.current; if (!v || !v.videoWidth) return;
    const c = toCanvas(v, v.videoWidth, v.videoHeight); stop();
    setSource(c); setFilter(mode === 'scan' ? 'document' : 'original');
  };
  const fromFile = (f: File) => {
    const url = URL.createObjectURL(f); const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); setSource(toCanvas(img, img.naturalWidth, img.naturalHeight)); setMode((m) => m ?? 'file'); };
    img.onerror = () => { URL.revokeObjectURL(url); push(L('تعذّر فتح الصورة', 'Could not open image'), 'error'); };
    img.src = url;
  };

  // Re-render preview whenever the source, filter or rotation changes.
  useEffect(() => {
    if (!source) return;
    const turn = rotation % 180 !== 0;
    const c = document.createElement('canvas'); c.width = turn ? source.height : source.width; c.height = turn ? source.width : source.height;
    const ctx = c.getContext('2d')!;
    ctx.translate(c.width / 2, c.height / 2); ctx.rotate((rotation * Math.PI) / 180); ctx.drawImage(source, -source.width / 2, -source.height / 2);
    if (filter !== 'original') {
      const d = ctx.getImageData(0, 0, c.width, c.height); const p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        let y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
        if (filter === 'document') y = y > 150 ? 255 : Math.max(0, (y - 40) * 1.6); // paper → white, ink → dark
        p[i] = p[i + 1] = p[i + 2] = y;
      }
      ctx.putImageData(d, 0, 0);
    }
    setPreview(c.toDataURL('image/jpeg', 0.82));
  }, [source, filter, rotation]);

  const save = async (submitAfter: boolean) => {
    if (!preview) return;
    setSaving(true);
    try {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      await api.post(`/tasks/${taskId}/attachments/base64`, { file_name: `proof-${stamp}.jpg`, mime_type: 'image/jpeg', data_base64: preview, kind: 'proof', note: note.trim() || undefined });
      push(L('حُفظ إثبات الإنجاز', 'Proof saved'));
      onSaved(submitAfter);
    } catch (e) { push(apiErrorMessage(e), 'error'); } finally { setSaving(false); }
  };

  const tab = (m: Mode, icon: React.ReactNode, label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} aria-pressed={mode === m}
      className={`flex flex-1 flex-col items-center gap-1 rounded-lg border p-3 text-sm ${mode === m ? 'border-bronze bg-bronze/10 text-bronze-dark' : 'border-input hover:bg-muted'}`}>{icon}{label}</button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent title={L('إثبات الإنجاز', 'Proof of completion')} className="max-w-xl">
        <section aria-label={L('إثبات الإنجاز', 'Proof of completion')} className="space-y-3">
          <p className="text-xs text-muted-foreground">{L('صوّر العمل المنجز أو امسح المستند (وصل، محضر استلام…) ليراجعه مديرك.', 'Photograph the finished work or scan the document for your manager.')}</p>
          <div className="flex gap-2">
            {tab('camera', <Camera className="h-5 w-5" />, L('الكاميرا', 'Camera'), () => startCamera('camera'))}
            {tab('scan', <ScanLine className="h-5 w-5" />, L('مسح مستند', 'Scan document'), () => startCamera('scan'))}
            {tab('file', <Upload className="h-5 w-5" />, L('من الجهاز', 'From device'), () => { stop(); setMode('file'); fileRef.current?.click(); })}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) fromFile(f); e.currentTarget.value = ''; }} />
          {camError && <p className="rounded-md bg-destructive/10 text-destructive text-sm px-3 py-2">{camError}</p>}
          {(mode === 'camera' || mode === 'scan') && !source && !camError && (
            <div className="relative overflow-hidden rounded-lg bg-black aspect-[4/3]">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              {mode === 'scan' && <div className="pointer-events-none absolute inset-[8%_12%] rounded-md border-2 border-dashed border-white/80"><span className="absolute -top-6 inset-x-0 text-center text-xs text-white">{L('ضع الورقة داخل الإطار', 'Fit the page inside the frame')}</span></div>}
              <Button type="button" onClick={capture} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full" variant="accent"><Camera className="h-4 w-4" />{L('التقاط', 'Capture')}</Button>
            </div>
          )}
          {preview && (
            <>
              <img src={preview} alt={L('معاينة الإثبات', 'Proof preview')} className="max-h-[45vh] w-full rounded-lg border border-input object-contain bg-muted" />
              <div className="flex flex-wrap items-center gap-2">
                <div role="group" aria-label={L('الفلتر', 'Filter')} className="flex gap-1">
                  {([['original', L('أصلي', 'Original')], ['document', L('مستند', 'Document')], ['gray', L('رمادي', 'Gray')]] as [Filter, string][]).map(([k, lbl]) => (
                    <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={`rounded-md border px-2.5 py-1 text-xs ${filter === k ? 'bg-primary text-white border-primary' : 'border-input hover:bg-muted'}`}>{lbl}</button>
                  ))}
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => setRotation((r) => (r + 90) % 360)}><RotateCw className="h-3.5 w-3.5" />{L('تدوير', 'Rotate')}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => (mode === 'file' ? fileRef.current?.click() : startCamera(mode ?? 'camera'))}><RefreshCcw className="h-3.5 w-3.5" />{L('إعادة الالتقاط', 'Retake')}</Button>
              </div>
              <label htmlFor="pf-note" className="sr-only">{L('ملاحظة', 'Note')}</label>
              <Input id="pf-note" maxLength={300} placeholder={L('ملاحظة للمراجع (اختياري)', 'Note for the reviewer (optional)')} value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" disabled={saving} onClick={() => save(false)}>{L('حفظ الإثبات', 'Save proof')}</Button>
                {submitLabel && <Button type="button" disabled={saving} onClick={() => save(true)}>{submitLabel}</Button>}
              </div>
            </>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
