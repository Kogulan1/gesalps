"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/components/toast/Toaster";
import { useAuth } from "@/components/AuthProvider";
import { useLocale, useTranslations } from "next-intl";

export default function SignInPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const t = useTranslations('auth');
  const locale = useLocale();

  useEffect(() => {
    if (user) router.replace(`/${locale}/dashboard`);
  }, [user, router, locale]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast({ title: t('auth.email'), description: t('auth.password') }); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "error" });
    } else {
      router.replace(`/${locale}/dashboard`);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{t('signin.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm">{t('email')}</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">{t('password')}</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-2xl">
              {loading ? "…" : t('signin.title')}
            </Button>
          </form>
          <div className="mt-4 text-sm token-muted space-y-2">
            <div>
              <Link className="underline" href={`/${locale}/signup`}>{t('toSignup')}</Link>
            </div>
            <div>
              <Link className="underline" href={`/${locale}/forgot-password`}>{t('forgot')}</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
