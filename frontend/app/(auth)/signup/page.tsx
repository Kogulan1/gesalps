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

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Email and password are required", variant: "error" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "error" });
      return;
    }
    setLoading(true);
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/signin` : undefined },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "error" });
    } else if (data.session) {
      toast({ title: "Account created", description: "You are now signed in", variant: "success" });
      router.replace("/dashboard");
    } else {
      toast({ title: "Check your email", description: "We sent a confirmation link to finish setup.", variant: "default" });
      router.replace("/signin");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div>
              <label className="text-sm">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <div className="mt-1 text-xs token-muted">
                Strength: {(["Very weak","Weak","Fair","Good","Strong"] as const)[strength.score]}
              </div>
            </div>
            <div>
              <label className="text-sm">Confirm password</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading || strength.score < 2} className="w-full rounded-2xl">
              {loading ? "Creating…" : "Create account"}
            </Button>
            {strength.score < 2 && (
              <div className="text-xs text-red-600">{strength.suggestions[0]}</div>
            )}
          </form>
          <div className="mt-4 text-sm token-muted">
            Have an account? <Link className="underline" href="/signin">Sign in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
