"use client";

import { usePathname } from "next/navigation";
import { FloatingControls } from "./FloatingControls";

export function ConditionalFloatingControls() {
  const pathname = usePathname();
  
  // Show floating controls on all pages (home and docs)
  return <FloatingControls />;
}
