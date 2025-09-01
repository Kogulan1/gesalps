"use client";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/branding/Logo";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { useLocale, useTranslations } from "next-intl";

export default function Navbar() {
  const { user } = useAuth();
  const tNav = useTranslations('nav');
  const locale = useLocale();
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur bg-white/90 border-b" style={{ borderColor: "var(--ges-border)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo variant="full" size={32} href={`/${locale}`} />
          <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: "var(--ges-muted)" }}>
            <a href="#product" className="hover:text-black">{tNav('product')}</a>
            <a href="#pricing" className="hover:text-black">{tNav('pricing')}</a>
            <a href="#docs" className="hover:text-black">{tNav('docs')}</a>
            <Link href={`/${locale}/projects`} className="hover:text-black">{tNav('projects', { fallback: 'Projects' })}</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          {user ? (
            <Button asChild variant="outline" className="btn-secondary rounded-2xl">
              <Link href={`/${locale}/dashboard`}>{tNav('dashboard')}</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild className="rounded-2xl">
                <Link href={`/${locale}/signin`}>{tNav('signin')}</Link>
              </Button>
              <Button asChild className="btn-primary rounded-2xl">
                <Link href={`/${locale}/signup`}>{tNav('getStarted')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
