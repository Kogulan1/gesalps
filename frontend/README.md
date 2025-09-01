Gesalps – Next.js App Router + Tailwind + shadcn-style UI + Supabase Auth

Quickstart

- Prereqs: Node 18+, npm
- Copy `.env.local` and fill your keys:

  NEXT_PUBLIC_SUPABASE_URL=YOUR_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_KEY
  NEXT_PUBLIC_BACKEND_API_BASE=https://YOUR-RAILWAY-BACKEND

- Install deps and run locally:

  npm install
  npm run dev

- Open http://localhost:3000

Features

- Next.js App Router in `app/`
- Tailwind CSS (v4) with clean, clinical UI
- shadcn-style UI primitives in `components/ui/*` (Button, Input, Card, Badge, Avatar, Dialog, Tabs, Accordion)
- Supabase email/password auth with SSR helpers (`lib/supabase/*`)
- Polished auth: email/password, magic link, OAuth (Google/GitHub),
  forgot/reset password with strength checks
- Auth context + guard for `/dashboard`
- Marketing homepage with hero, features, generators tabs, pricing, FAQ, CTA, footer
- Static legal pages: `/privacy`, `/terms`
- Robots at `public/robots.txt`

Auth Setup (Supabase)

- Create a Supabase project (free tier). In Project Settings → API copy:
  - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
  - anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- In Authentication → Providers ensure Email is enabled.
- Email/password sign-in and sign-up will redirect to `/dashboard`.

Project Structure

- `app/` – routes: `/`, `/signin`, `/signup`, `/dashboard`, `/privacy`, `/terms`
- `components/` – UI, layout, auth provider/guard, toasts
- `lib/supabase/` – browser + server clients

Deploy (Vercel)

- Push to GitHub, then “Import Project” on Vercel
- Add env vars in Vercel Project Settings → Environment Variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_BACKEND_API_BASE`
- Deploy; production will use these vars automatically.

OAuth setup (optional)

- In Supabase → Authentication → Providers, enable Google and/or GitHub.
- Add Redirect URLs:
  - `http://localhost:3000/dashboard` (dev)
  - Your production URL, e.g. `https://yourapp.com/dashboard`
  The app calls `signInWithOAuth` with `redirectTo` pointing to `/dashboard`.

Password reset

- Users request a reset at `/forgot-password`; the email link lands on `/reset-password`.
- In Supabase Auth Settings, make sure “Site URL” is set to your app base URL during development.

Notes

- “API status” card on `/dashboard` fetches `${process.env.NEXT_PUBLIC_BACKEND_API_BASE}/` and shows “Healthy” on HTTP 200.
- UI components mimic shadcn API without external deps.
