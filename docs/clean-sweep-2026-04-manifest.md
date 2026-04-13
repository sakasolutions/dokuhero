# Clean Sweep – Archiv-Manifest (April 2026)

Vor dem Entfernen dokumentiert: Das Repository wurde von einer vollständigen SaaS-/App-Lösung auf **nur noch Marketing-Landing + statische Login-/Register-Optik + Rechtsseiten** reduziert.

## A) Behalten (Zielzustand)

- `app/page.tsx` – Landingpage
- `app/layout.tsx`, `app/globals.css`
- `app/impressum/`, `app/datenschutz/`, `app/agb/`
- `app/login/page.tsx`, `app/register/page.tsx` – nur Optik (kein Backend)
- `components/PricingSection.tsx`, `components/StatsSection.tsx`
- `components/auth/AuthSplitLayout.tsx`
- `components/layout/LegalPageShell.tsx`
- `lib/animations.ts`
- `public/` (Assets der Website)
- Konfiguration: `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `.eslintrc.json`

## B) Entfernt (Auszug)

- Gesamte App: `app/(dashboard)/`, `app/(admin)/`, `app/(auth)/` (alt), `app/api/`, `app/bewertung/`
- Tool-Neuauflage: `dokuhero-tool/`
- `middleware.ts` (Auth-/Trial-Gating)
- `lib/`: alle Dateien außer `animations.ts`
- `components/`: alles außer Landing-/Legal-/AuthSplit-/Pricing-/Stats-
- `types/` (next-auth, Domain-Types)
- `migrations/` (alte SQL-Altlast)
- Alt-Auth-Komponenten: `LoginForm.tsx`, `RegisterForm.tsx` (ersetzt durch statische Seiten)

## C) Dependencies (entfernt aus `package.json`)

Entfernt u. a.: `@hookform/resolvers`, `@stripe/stripe-js`, `bcryptjs`, `mysql2`, `next-auth`, `openai`, `puppeteer`, `react-hook-form`, `resend`, `sharp`, `stripe`, `zod` sowie `@types/bcryptjs`.

Verbleibend: `next`, `react`, `react-dom`, `framer-motion`, `lucide-react` + übliche Dev-Dependencies für TypeScript/ESLint/Tailwind.

Nach dem Sweep bitte einmal `npm install` ausführen (neues `package-lock.json`).
