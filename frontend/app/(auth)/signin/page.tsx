"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This non-localized route simply redirects to the localized sign-in page
// to avoid duplicate auth UIs rendering in parallel.
export default function SignInRedirect() {
  const router = useRouter();
  useEffect(() => {
    try {
      const cookie = document.cookie.split("; ").find((c) => c.startsWith("ges.locale="));
      const fromCookie = cookie ? cookie.split("=")[1] : "";
      const navLang = navigator.language?.slice(0, 2) || "en";
      const locale = ["en","de","fr","it"].includes(fromCookie) ? fromCookie : (["en","de","fr","it"].includes(navLang) ? navLang : "en");
      router.replace(`/${locale}/signin`);
    } catch {
      router.replace(`/en/signin`);
    }
  }, [router]);
  return null;
}
