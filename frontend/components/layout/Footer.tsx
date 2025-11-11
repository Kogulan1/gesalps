"use client";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function Footer() {
  const tNav = useTranslations('nav');
  const tFooter = useTranslations('footer');
  const locale = useLocale();
  return (
    <footer className="border-t" style={{ borderColor: "var(--ges-border)" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 text-sm" style={{ color: "var(--ges-fg)" }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="text-lg font-semibold">GESALP AI</div>
            <p className="token-muted mt-2">Synthetic data for clinical trials.</p>
          </div>
          <div>
            <div className="font-medium mb-2">Product</div>
            <ul className="space-y-1 token-muted">
              <li><a href="#product">{tNav('product')}</a></li>
              <li><a href="#pricing">{tNav('pricing')}</a></li>
              <li><Link id="docs" href={`/${locale}/docs`}>{tNav('docs')}</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">Company</div>
            <ul className="space-y-1 token-muted">
              <li><Link href={`/${locale}/contact`}>Contact</Link></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-2">Legal</div>
            <ul className="space-y-1 token-muted">
              <li><Link href={`/${locale}/privacy`}>{tFooter('privacy')}</Link></li>
              <li><Link href={`/${locale}/terms`}>{tFooter('terms')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4 token-muted">
          <div>© {new Date().getFullYear()} GESALP AI</div>
          <Link href={`/${locale}/privacy`}>{tFooter('privacy')}</Link>
          <Link href={`/${locale}/terms`}>{tFooter('terms')}</Link>
          <Link href={`/${locale}/contact`}>{tFooter('contact')}</Link>
        </div>
      </div>
    </footer>
  );
}
