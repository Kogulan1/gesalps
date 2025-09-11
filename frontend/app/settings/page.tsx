"use client";

import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { useToast } from "@/components/toast/Toaster";
import { scorePassword } from "@/lib/password";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <Content />
    </AuthGuard>
  );
}

function Content() {
  const { user } = useAuth();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { toast } = useToast();
  const locale = (() => {
    try { return (typeof document !== 'undefined' && (document.cookie.split('; ').find(c=>c.startsWith('ges.locale='))?.split('=')[1])) || 'en'; } catch { return 'en'; }
  })();

  const [email, setEmail] = useState(user?.email ?? "");
  const [savingEmail, setSavingEmail] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const strength = scorePassword(password);

  const [signingOutAll, setSigningOutAll] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Account settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm">Email</label>
            <div className="flex gap-2 mt-1">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button
                onClick={async () => {
                  setSavingEmail(true);
                  const { error } = await supabase.auth.updateUser({ email });
                  setSavingEmail(false);
                  if (error) toast({ title: "Couldn't update email", description: error.message, variant: "error" });
                  else toast({ title: "Check your inbox", description: "We sent a confirmation link to verify your new email." });
                }}
                disabled={savingEmail || !email}
              >
                {savingEmail ? "Saving…" : "Update"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <Button
            onClick={async () => {
              if (password !== confirm) { toast({ title: "Passwords don't match", variant: "error" }); return; }
              if (strength.score < 2) { toast({ title: "Password too weak", description: "Improve strength before saving.", variant: "error" }); return; }
              setSavingPassword(true);
              const { error } = await supabase.auth.updateUser({ password });
              setSavingPassword(false);
              if (error) toast({ title: "Couldn't update password", description: error.message, variant: "error" });
              else toast({ title: "Password updated", variant: "success" });
              setPassword(""); setConfirm("");
            }}
            disabled={savingPassword || !password}
          >
            {savingPassword ? "Saving…" : "Update password"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            Sign out from this and all other devices.
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const { error } = await supabase.auth.signOut();
                if (error) toast({ title: "Sign out failed", description: error.message, variant: "error" });
                else window.location.href = `/${locale}/signin`;
              }}
            >
              Sign out
            </Button>
            <Button
              variant="destructive"
              disabled={signingOutAll}
              onClick={async () => {
                setSigningOutAll(true);
                const { error } = await supabase.auth.signOut({ scope: "global" as any });
                setSigningOutAll(false);
                if (error) toast({ title: "Failed to sign out everywhere", description: error.message, variant: "error" });
                else window.location.href = `/${locale}/signin`;
              }}
            >
              {signingOutAll ? "Signing out…" : "Sign out everywhere"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            Account deletion requires a server action with a service role. Contact support.
          </div>
          <Button disabled variant="destructive">Delete account (contact support)</Button>
        </CardContent>
      </Card>
    </div>
  );
}
