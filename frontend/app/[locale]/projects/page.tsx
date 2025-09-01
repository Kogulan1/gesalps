"use client";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function ProjectsPage() {
  const t = useTranslations('projects');
  const locale = useLocale();
  const supabase = useMemo(()=>createSupabaseBrowserClient(),[]);
  const [items,setItems] = useState<any[]>([]);
  const [name,setName] = useState("");
  const [loading,setLoading]=useState(false);

  useEffect(()=>{(async()=>{
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;
    const { data:rows } = await supabase.from('projects').select('*').eq('owner_id', userId).order('created_at', {ascending:false});
    setItems(rows || []);
  })();},[supabase]);

  async function createProject(){
    setLoading(true);
    const { data:user } = await supabase.auth.getUser();
    const uid = user.user?.id!;
    const { data, error } = await supabase.from('projects').insert({ name, owner_id: uid }).select('*');
    setLoading(false);
    if (!error && data) setItems(prev=>[data[0],...prev]);
    setName("");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <div className="flex gap-2">
          <Input placeholder={t('name')} value={name} onChange={e=>setName(e.target.value)} className="w-56"/>
          <Button disabled={!name||loading} onClick={createProject} className="rounded-2xl">{t('new')}</Button>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {items.map(p=> (
          <Card key={p.id}>
            <CardHeader><CardTitle>{p.name}</CardTitle></CardHeader>
            <CardContent>
              <Link className="underline" href={`/${locale}/projects/${p.id}`}>Open</Link>
            </CardContent>
          </Card>
        ))}
        {items.length===0 && (
          <div className="token-muted">No projects yet.</div>
        )}
      </div>
    </div>
  );
}

