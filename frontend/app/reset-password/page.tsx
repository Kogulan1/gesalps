"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/Toaster";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { scorePassword } from "@/lib/password";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { toast } = useToast();
  const router = useRouter();
  const search = useSearchParams();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const strength = scorePassword(password);

  // Once the user arrives via the email link, ensure a session exists.
  useEffect(() => {
    let mounted = true;
    const ensureSession = async () => {
      try {
        // Try to exchange the code in the URL hash if present (newer flow).
        if (typeof window !== "undefined" && window.location.hash) {
          // Some versions accept the raw hash string.
          // If unsupported, the call will error and we fall back silently.
          try {
            // @ts-ignore – not all type bundles include this yet
            await supabase.auth.exchangeCodeForSession(window.location.hash);
          } catch (_) {}
        }
      } finally {
        if (!mounted) return;
        setReady(true);
      }
    };
    ensureSession();
    return () => {
      mounted = false;
    };
  }, [supabase, search]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (strength.score < 2) {
      toast({ title: "Password is too weak", description: strength.suggestions[0], variant: "error" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "error" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't update password", description: error.message, variant: "error" });
    } else {
      toast({ title: "Password updated", description: "You can now sign in." , variant: "success"});
      router.replace("/signin");
    }
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
                <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
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
