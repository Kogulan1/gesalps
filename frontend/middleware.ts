import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const locales = ["en", "de", "fr", "it"] as const;

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const { pathname } = nextUrl;

  // Redirect / -> /{locale}
  if (pathname === "/") {
    const cookie = req.cookies.get("ges.locale")?.value;
    const header = req.headers.get("accept-language") || "";
    const preferred = cookie && locales.includes(cookie as any) ? cookie : header.split(",")[0]?.slice(0, 2);
    const locale = locales.includes(preferred as any) ? preferred : "en";
    return NextResponse.redirect(new URL(`/${locale}`, req.url));
  }

  const seg = pathname.split("/").filter(Boolean)[0];
  const isLocalized = locales.includes(seg as any);
  if (!isLocalized && pathname !== "/") {
    const cookie = req.cookies.get("ges.locale")?.value;
    const header = req.headers.get("accept-language") || "";
    const preferred = cookie && locales.includes(cookie as any) ? cookie : header.split(",")[0]?.slice(0, 2);
    const locale = locales.includes(preferred as any) ? preferred : "en";
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, req.url));
  }
  const res = NextResponse.next();

  // Build a Supabase client that reads from the incoming request cookies
  // and writes back to the response when refreshed.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const all = req.cookies.getAll();
          return all.map((c) => ({ name: c.name, value: c.value }));
        },
        setAll(cookies) {
          for (const { name, value, options } of cookies) {
            res.cookies.set(name, value, options as any);
          }
        },
      },
    }
  );

  const path = req.nextUrl.pathname;
  const rest = isLocalized ? path.replace(/^\/(en|de|fr|it)/, "") : path;
  const prefix = isLocalized ? `/${seg}` : "";
  const isAppRoute = /^(\/dashboard|\/settings)(\/.*)?$/.test(rest);
  const isAuthRoute = /^(\/signin|\/signup|\/reset-password|\/forgot-password)$/.test(rest);

  // Only check user for routes we care about to avoid extra latency elsewhere.
  if (isAppRoute || isAuthRoute) {
    const { data, error } = await supabase.auth.getUser();
    const user = data?.user ?? null;

    if (isAppRoute && !user) {
      const redirect = NextResponse.redirect(new URL(`${prefix}/signin`, req.url));
      // Preserve originally requested path for post-login redirect
      redirect.headers.set("x-redirect-to", path);
      return redirect;
    }
    if (isAuthRoute && user) {
      return NextResponse.redirect(new URL(`${prefix}/dashboard`, req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/",
    "/(en|de|fr|it)/:path*",
  ],
};
