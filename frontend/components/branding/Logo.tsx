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
      {variant === "compact" ? (
        <Image src="/logo-gesalps-icon-red.svg" alt="GESALP AI mark" width={size} height={size} priority />
      ) : (
        <>
          <span className="font-semibold tracking-tight" style={{ color: "var(--ges-fg)", fontSize: 18 }}>GESALP</span>
          <Image src="/logo-gesalps-icon-red.svg" alt="GESALP AI mark" width={size} height={size} priority />
          <span className="font-semibold tracking-tight" style={{ color: "var(--ges-fg)", fontSize: 18 }}>AI</span>
        </>
      )}
    </Link>
  );
}
