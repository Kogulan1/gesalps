"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/Toaster";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { scorePassword } from "@/lib/password";
import { useLocale } from "next-intl";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { toast } = useToast();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const strength = scorePassword(password);
  const locale = useLocale();

  useEffect(() => {
    let mounted = true;
    const ensureSession = async () => {
      try {
        if (typeof window !== "undefined" && window.location.hash) {
          try { // @ts-ignore
            await supabase.auth.exchangeCodeForSession(window.location.hash);
          } catch {}
        }
      } finally {
        if (!mounted) return;
        setReady(true);
      }
    };
    ensureSession();
    return () => { mounted = false; };
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (strength.score < 2) { toast({ title: "Password is too weak", description: strength.suggestions[0], variant: "error" }); return; }
    if (password !== confirm) { toast({ title: "Passwords don't match", variant: "error" }); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) toast({ title: "Couldn't update password", description: error.message, variant: "error" });
    else router.replace(`/${locale}/signin`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <div className="text-neutral-600">Preparing reset…</div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-sm">New password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="mt-1 text-xs text-neutral-600">
                  Strength: {(["Very weak","Weak","Fair","Good","Strong"] as const)[strength.score]}
                </div>
              </div>
              <div>
                <label className="text-sm">Confirm password</label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading || strength.score < 2} className="w-full">
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

