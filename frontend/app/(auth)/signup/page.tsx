"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Non-localized signup route redirects to localized variant to avoid duplicate UIs.
export default function SignUpRedirect() {
  const router = useRouter();
  useEffect(() => {
    try {
      const cookie = document.cookie.split("; ").find((c) => c.startsWith("ges.locale="));
      const fromCookie = cookie ? cookie.split("=")[1] : "";
      const navLang = navigator.language?.slice(0, 2) || "en";
      const locale = ["en","de","fr","it"].includes(fromCookie) ? fromCookie : (["en","de","fr","it"].includes(navLang) ? navLang : "en");
      router.replace(`/${locale}/signup`);
    } catch {
      router.replace(`/en/signup`);
    }
  }, [router]);
  return null;
}
