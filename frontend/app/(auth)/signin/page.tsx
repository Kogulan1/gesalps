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

export default function SignInPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sendingLink, setSendingLink] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Email and password are required", variant: "error" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "error" });
    } else {
      toast({ title: "Welcome back", variant: "success" });
      router.replace("/dashboard");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            <Button
              type="button"
              variant="outline"
              className="w-full btn-secondary rounded-2xl"
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined } as any });
                if (error) toast({ title: "Google sign-in failed", description: error.message, variant: "error" });
              }}
            >
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full btn-secondary rounded-2xl"
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined } as any });
                if (error) toast({ title: "GitHub sign-in failed", description: error.message, variant: "error" });
              }}
            >
              Continue with GitHub
            </Button>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div>
              <label className="text-sm">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-2xl">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 text-sm token-muted space-y-2">
            <div>
              No account? <Link className="underline" href="/signup">Create one</Link>
            </div>
            <div>
              <Link className="underline" href="/forgot-password">Forgot your password?</Link>
            </div>
            <div>
              <button
                className="underline"
                onClick={async () => {
                  if (!email) { toast({ title: "Enter your email above", variant: "error" }); return; }
                  setSendingLink(true);
                  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined;
                  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } as any });
                  setSendingLink(false);
                  if (error) toast({ title: "Magic link failed", description: error.message, variant: "error" });
                  else {
                    toast({ title: "Magic link sent", description: "Check your email to finish sign-in." });
                    setCooldown(30);
                    const timer = setInterval(() => setCooldown((c) => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; }), 1000);
                  }
                }}
                disabled={sendingLink || cooldown > 0}
              >
                {sendingLink ? "Sending link…" : cooldown > 0 ? `Try again in ${cooldown}s` : "Email me a magic link"}
              </button>
            </div>
            <div>
              <button
                className="underline"
                onClick={async () => {
                  if (!email) { toast({ title: "Enter your email above", variant: "error" }); return; }
                  // Resend confirmation if the account isn’t confirmed yet
                  // @ts-ignore – older types may not include resend
                  const { error } = await supabase.auth.resend({ type: "signup", email });
                  if (error) toast({ title: "Resend failed", description: error.message, variant: "error" });
                  else toast({ title: "Confirmation sent", description: "Check your inbox for the verification email." });
                }}
              >
                Resend confirmation email
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
