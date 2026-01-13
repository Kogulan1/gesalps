import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const locales = ["en", "de", "fr", "it"] as const;

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const { pathname } = nextUrl;

  // Redirect / -> /{locale}
  if (pathname === "/") {
    // Always redirect to English by default
    return NextResponse.redirect(new URL("/en", req.url));
  }

  const seg = pathname.split("/").filter(Boolean)[0];
  const isLocalized = locales.includes(seg as any);
  if (!isLocalized && pathname !== "/") {
    // Always redirect to English by default
    return NextResponse.redirect(new URL(`/en${pathname}`, req.url));
  }
  const res = NextResponse.next();
  
  // Set default locale cookie to English if not set or if set to Italian
  const currentLocale = req.cookies.get("ges.locale")?.value;
  if (!currentLocale || currentLocale === "it") {
    res.cookies.set("ges.locale", "en", { 
      path: "/", 
      maxAge: 31536000, // 1 year
      httpOnly: false 
    });
  }

  // Check if Supabase environment variables are configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase is not configured, skip auth checks but continue with locale handling
    console.warn("[middleware] Supabase environment variables not configured, skipping auth checks");
    return res;
  }

  // Build a Supabase client that reads from the incoming request cookies
  // and writes back to the response when refreshed.
  let supabase;
  try {
    supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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
  } catch (error) {
    console.error("[middleware] Failed to create Supabase client:", error);
    // Return response without auth checks if Supabase client creation fails
    return res;
  }

  const path = req.nextUrl.pathname;
  const rest = isLocalized ? path.replace(/^\/(en|de|fr|it)/, "") : path;
  const prefix = isLocalized ? `/${seg}` : "";
  const isAppRoute = /^(\/dashboard|\/settings)(\/.*)?$/.test(rest);
  const isAuthRoute = /^(\/signin|\/signup|\/reset-password|\/forgot-password)$/.test(rest);

  // Only check user for routes we care about to avoid extra latency elsewhere.
  if (isAppRoute || isAuthRoute) {
    try {
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
    } catch (error) {
      console.error("[middleware] Auth check failed:", error);
      // If auth check fails, allow the request to proceed (graceful degradation)
      // This prevents middleware from crashing the entire application
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
