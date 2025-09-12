"use client";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { Button } from "./ui/button";

export default function Navbar() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur bg-white/70 dark:bg-neutral-950/60 border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">GESALP AI</Link>
          <nav className="hidden md:flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-300">
            <a href="#product" className="hover:text-neutral-900 dark:hover:text-white">Product</a>
            <a href="#pricing" className="hover:text-neutral-900 dark:hover:text-white">Pricing</a>
            <a href="#docs" className="hover:text-neutral-900 dark:hover:text-white">Docs</a>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="outline">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/settings">Settings</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/signin">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
