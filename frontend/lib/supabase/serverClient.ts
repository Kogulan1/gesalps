import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createSupabaseServerClient = () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const store = await cookies();
          const all = store.getAll();
          return all.map((c) => ({ name: c.name, value: c.value }));
        },
        async setAll(cookiesToSet) {
          const store = await cookies();
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options as any);
          }
        },
      },
    }
  );
};
