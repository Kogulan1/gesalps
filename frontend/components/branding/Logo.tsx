import Image from "next/image";
import Link from "next/link";

export function Logo({
  variant = "full",
  className = "",
  size = 32,
  href = "/",
}: {
  variant?: "full" | "compact";
  className?: string;
  size?: number; // icon size in px
  href?: string;
}) {
  return (
    <Link href={href} className={`flex items-center gap-2 ${className}`} aria-label="GESALP AI home">
      <Image src="/logo-gesalps-icon.svg" alt="GESALP AI" width={size} height={size} priority />
      {variant === "full" && (
        <span className="font-semibold tracking-tight" style={{ color: "var(--ges-accent)", fontSize: 18 }}>
          GESALP AI
        </span>
      )}
    </Link>
  );
}
