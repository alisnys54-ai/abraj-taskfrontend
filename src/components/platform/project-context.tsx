'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useGet } from '@/lib/platform';

export interface UnitType { id: string; code: string; area_m2: number | null; price: number | null; currency: string }
export interface Site { id: string; code: string; name: string; location: string; license: string | null; cost_label: string | null; authority: string | null; progress: number; phase: string | null; total_units: number; unit_types: UnitType[] }
export interface ProjectDetail { id: string; key: string; name: string; kind: string; portal: 'riyasa' | 'qudah' | null; governorate: string | null; description: string | null; sites: Site[] }

interface Ctx { project: ProjectDetail; site: Site | null; setSiteCode: (c: string) => void; base: string }
const ProjectCtx = createContext<Ctx | null>(null);

/** Loads the project once for the whole portal and remembers which site the user is looking at. */
export function ProjectProvider({ projectKey, children, fallback, error }: { projectKey: string; children: React.ReactNode; fallback: React.ReactNode; error: React.ReactNode }) {
  const q = useGet<ProjectDetail>(`/projects/${projectKey}`);
  const storeKey = `abraj.site.${projectKey}`;
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => { try { setCode(localStorage.getItem(storeKey)); } catch { /* storage unavailable */ } }, [storeKey]);
  if (q.isLoading) return <>{fallback}</>;
  if (q.isError || !q.data) return <>{error}</>;
  const site = q.data.sites.find((s) => s.code === code) ?? q.data.sites[0] ?? null;
  const setSiteCode = (c: string) => { setCode(c); try { localStorage.setItem(storeKey, c); } catch { /* ignore */ } };
  return <ProjectCtx.Provider value={{ project: q.data, site, setSiteCode, base: `/p/${projectKey}` }}>{children}</ProjectCtx.Provider>;
}

export function useProject() {
  const c = useContext(ProjectCtx);
  if (!c) throw new Error('useProject outside ProjectProvider');
  return c;
}

/** Site switcher shown at the top of every project page (hidden when the project has one site). */
export function SitePicker() {
  const { project, site, setSiteCode } = useProject();
  if (project.sites.length < 2) return null;
  return (
    <div role="tablist" aria-label="الموقع" className="inline-flex flex-wrap gap-1 rounded-lg border border-input bg-white p-1">
      {project.sites.map((s) => (
        <button key={s.code} role="tab" aria-selected={site?.code === s.code} onClick={() => setSiteCode(s.code)}
          className={`rounded-md px-3 py-1.5 text-sm ${site?.code === s.code ? 'bg-primary text-white' : 'hover:bg-muted'}`}>{s.name}</button>
      ))}
    </div>
  );
}
