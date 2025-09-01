"use client";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";

const locales = ["en", "de", "fr", "it"] as const;

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('nav');

  const pathWithoutLocale = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (locales.includes(parts[0] as any)) parts.shift();
    return "/" + parts.join("/");
  }, [pathname]);

  function setLocale(next: string) {
    startTransition(() => {
      document.cookie = `ges.locale=${next}; path=/; max-age=31536000`;
      router.push(`/${next}${pathWithoutLocale}`);
    });
  }

  return (
    <div className="relative">
      <button
        aria-label={t('changeLanguage')}
        className="rounded-2xl border px-2 py-1 text-xs token-muted hover:bg-[var(--ges-panel)]"
        onClick={(e) => {
          const menu = (e.currentTarget.nextSibling as HTMLElement)!
          menu.hidden = !menu.hidden;
        }}
      >
        {locale.toUpperCase()} ▾
      </button>
      <div hidden className="absolute right-0 mt-1 rounded-xl border bg-white shadow-sm" style={{borderColor: 'var(--ges-border)'}}>
        {locales.map((l) => (
          <button
            key={l}
            className={`block w-full px-3 py-1 text-left text-xs ${l===locale? 'font-semibold' : ''}`}
            onClick={() => setLocale(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
