"use client";

import { createBrowserClient } from "@supabase/ssr";

export const createSupabaseBrowserClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase] Missing environment variables. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
    // Return a mock client that will fail gracefully
    // This prevents the app from crashing on load
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    );
  }
  
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          if (typeof document === "undefined") return [];
          if (!document.cookie) return [];
          return document.cookie.split("; ").map((pair) => {
            const index = pair.indexOf("=");
            const name = pair.substring(0, index);
            const value = decodeURIComponent(pair.substring(index + 1));
            return { name, value };
          });
        },
        setAll(cookies) {
          if (typeof document === "undefined") return;
          for (const { name, value, options } of cookies) {
            let cookieStr = `${name}=${encodeURIComponent(value)}`;
            if (options?.maxAge !== undefined) {
              const maxAge = typeof options.maxAge === "string" ? parseInt(options.maxAge, 10) : Math.floor(options.maxAge as number);
              if (!Number.isNaN(maxAge)) cookieStr += `; Max-Age=${maxAge}`;
            }
            if (options?.expires) {
              const d = new Date(options.expires as any);
              if (!isNaN(d.getTime())) cookieStr += `; Expires=${d.toUTCString()}`;
            }
            if (options?.path) cookieStr += `; Path=${options.path}`;
            if (options?.domain) cookieStr += `; Domain=${options.domain}`;
            if (options?.secure) cookieStr += `; Secure`;
            if (options?.sameSite) cookieStr += `; SameSite=${options.sameSite as string}`;
            document.cookie = cookieStr;
          }
        },
      },
    }
  );
};