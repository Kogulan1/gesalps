"use client";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Link from "next/link";

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

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.BACKEND_API_BASE;
    if (!base) { setApiStatus("Offline"); return; }
    fetch(`${base}/`, { cache: "no-store" })
      .then((r) => (r.ok ? "Healthy" : `Error ${r.status}`))
      .catch(() => "Offline")
      .then(setApiStatus);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid md:grid-cols-12 gap-6">
      <aside className="md:col-span-3">
        <nav className="rounded-2xl border bg-white p-4" style={{ borderColor: "var(--ges-border)" }}>
          <ul className="space-y-2 text-sm">
            <li><a className="hover:underline" href="#upload">Upload</a></li>
            <li><a className="hover:underline" href="#results">Results</a></li>
            <li><a className="hover:underline" href="#reports">Reports</a></li>
            <li><Link className="hover:underline" href="/settings">Settings</Link></li>
          </ul>
        </nav>
      </aside>
      <main className="md:col-span-9 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Welcome{user?.email ? `, ${user.email}` : ""}</h1>
            <p className="token-muted">Manage datasets and review reports.</p>
          </div>
          <div className={`rounded-full px-3 py-1 text-sm border`} style={{ borderColor: "var(--ges-border)", background: apiStatus === "Healthy" ? "#ECFDF5" : "#F3F4F6", color: apiStatus === "Healthy" ? "#065F46" : "#374151" }}>
            API {apiStatus}
          </div>
        </div>

        <Card id="upload">
          <CardHeader>
            <CardTitle>Upload dataset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-dashed p-8 text-center token-muted" style={{ borderColor: "var(--ges-border)" }}>
              Drag & drop CSV here (coming soon)
            </div>
          </CardContent>
        </Card>

        <Card id="results" className="">
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="token-muted">No jobs yet.</div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Link href="#docs" className="underline">View documentation</Link>
          <Button onClick={() => signOut()} className="rounded-2xl">Sign out</Button>
        </div>
      </main>
    </div>
  );
}
