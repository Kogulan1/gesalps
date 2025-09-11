"use client";
import Link from "next/link";
import React from "react";

type BackLinkProps = {
  href: string;
  ariaLabel?: string;      // accessible label for icon-only button
  label?: string;          // optional visible text; omit for icon-only
  className?: string;
  iconOnly?: boolean;      // default true (render only the icon in a circle)
};

export default function BackLink({ href, ariaLabel = "Back", label, className, iconOnly = true }: BackLinkProps) {
  const base = `inline-flex items-center justify-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-transparent`;
  const iconOnlyClasses = `h-8 w-8 ${base}`;
  const withTextClasses = `gap-2 px-3 py-1.5 text-sm ${base}`;
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`${iconOnly ? iconOnlyClasses : withTextClasses} ${className || ""}`}
      style={{ borderColor: 'var(--ges-border)' }}
      title={ariaLabel}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12.5 4.75 7.25 10l5.25 5.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!iconOnly && <span>{label ?? 'Back'}</span>}
      <span className="sr-only">{ariaLabel}</span>
    </Link>
  );
}
