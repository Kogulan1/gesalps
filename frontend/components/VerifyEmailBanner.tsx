"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Button } from "./ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { useToast } from "./toast/Toaster";

export default function VerifyEmailBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();
  const [sending, setSending] = useState(false);

  if (!user) return null;
  const verified = Boolean((user as any).email_confirmed_at || (user as any).confirmed_at);
  if (verified) return null;

  const email = user.email;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
      <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-between gap-4 text-sm">
        <div>
          Verify your email to secure your account. We sent a link to {email}.
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={sending}
          onClick={async () => {
            if (!email) return;
            setSending(true);
            try {
              // @ts-ignore resend may not be in older types
              const { error } = await supabase.auth.resend({ type: "signup", email });
              if (error) {
                toast({ title: "Couldn't resend", description: error.message, variant: "error" });
              } else {
                toast({ title: "Verification sent", description: "Check your inbox for the link." });
              }
            } finally {
              setSending(false);
            }
          }}
        >
          {sending ? "Sending…" : "Resend email"}
        </Button>
      </div>
    </div>
  );
}

