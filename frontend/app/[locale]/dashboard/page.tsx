"use client";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Content />
    </AuthGuard>
  );
}

function Content() {
  const { user, signOut } = useAuth();
  const [apiStatus, setApiStatus] = useState<string>("Checking…");
  const t = useTranslations('dashboard');
  const tProjects = useTranslations('projects');
  const locale = useLocale();
  const supabase = useMemo(()=>createSupabaseBrowserClient(),[]);
  const [projects,setProjects] = useState<any[]>([]);
  const [name,setName] = useState<string>("");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE;
    if (!base) { setApiStatus("Offline"); return; }
    fetch(`${base}/`, { cache: "no-store" })
      .then((r) => (r.ok ? "Healthy" : `Error ${r.status}`))
      .catch(() => "Offline")
      .then(setApiStatus);
  }, []);

  useEffect(()=>{(async()=>{
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id; if (!uid) return;
    const { data:rows } = await supabase.from('projects').select('*').eq('owner_id', uid).order('created_at', {ascending:false});
    setProjects(rows || []);
  })();},[supabase]);

  async function createProject(){
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id; if (!uid || !name) return;
    const { data:inserted, error } = await supabase.from('projects').insert({ name, owner_id: uid }).select('*');
    if (!error && inserted) setProjects(prev=>[inserted[0], ...prev]);
    setName("");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid md:grid-cols-12 gap-6">
      <aside className="md:col-span-3">
        <nav className="rounded-2xl border bg-white p-4" style={{ borderColor: "var(--ges-border)" }}>
          <ul className="space-y-2 text-sm">
            <li><a className="hover:underline" href="#upload">{t('upload')}</a></li>
            <li><a className="hover:underline" href="#results">{t('recent')}</a></li>
            <li><a className="hover:underline" href="#reports">Reports</a></li>
            <li><Link className="hover:underline" href={`/${locale}/settings`}>Settings</Link></li>
          </ul>
        </nav>
      </aside>
      <main className="md:col-span-9 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t('title')}{user?.email ? `, ${user.email}` : ''}</h1>
            <p className="token-muted">Manage datasets and review reports.</p>
          </div>
          <div className={`rounded-full px-3 py-1 text-sm border`} style={{ borderColor: "var(--ges-border)", background: apiStatus === "Healthy" ? "#ECFDF5" : "#F3F4F6", color: apiStatus === "Healthy" ? "#065F46" : "#374151" }}>
            {t('api')}: {apiStatus}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{tProjects('title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder={tProjects('name')} className="w-56" onKeyDown={(e)=>{ if(e.key==='Enter' && name.trim()) createProject(); }} />
              <Button onClick={createProject} disabled={!name.trim()} className="rounded-2xl">{tProjects('new')}</Button>
              <Link className="underline ml-2" href={`/${locale}/projects`}>View all</Link>
            </div>
            {projects.length>0 && (
              <ul className="list-disc pl-5 text-sm token-muted">
                {projects.slice(0,3).map(p=> (
                  <li key={p.id}><Link className="underline" href={`/${locale}/projects/${p.id}`}>{p.name}</Link></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card id="upload">
          <CardHeader>
            <CardTitle>{t('upload')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-dashed p-8 text-center token-muted" style={{ borderColor: "var(--ges-border)" }}>
              Drag & drop CSV here (coming soon)
            </div>
          </CardContent>
        </Card>

        <Card id="results">
          <CardHeader>
            <CardTitle>{t('recent')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="token-muted">No jobs yet.</div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Link href="#docs" className="underline">Docs</Link>
          <Button onClick={() => signOut()} className="rounded-2xl">Sign out</Button>
        </div>
      </main>
    </div>
  );
}
