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
import { scorePassword } from "@/lib/password";
import { useLocale, useTranslations } from "next-intl";

export default function SignUpPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const strength = scorePassword(password);
  const t = useTranslations('auth');
  const locale = useLocale();

  useEffect(() => { if (user) router.replace(`/${locale}/dashboard`); }, [user, router, locale]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast({ title: t('auth.email'), description: t('auth.password') }); return; }
    if (password !== confirm) { toast({ title: t('auth.confirm'), variant: 'error' }); return; }
    setLoading(true);
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/${locale}/signin` : undefined },
    });
    setLoading(false);
    if (error) toast({ title: 'Sign up failed', description: error.message, variant: 'error' });
    else if (data.session) router.replace(`/${locale}/dashboard`);
    else router.replace(`/${locale}/signin`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader><CardTitle>{t('signup.title')}</CardTitle></CardHeader>
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
            <div>
              <label className="text-sm">{t('confirm')}</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading || strength.score < 2} className="w-full rounded-2xl">
              {loading ? '…' : t('signup.title')}
            </Button>
          </form>
          <div className="mt-4 text-sm token-muted">
            <Link className="underline" href={`/${locale}/signin`}>{t('toSignin')}</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
