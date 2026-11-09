# PrepMe

A short math check for grades 1–3. A child picks their grade, answers one question from every subcategory (K5 Learning's topic list), and the parent sees every answer, the correct answer, and what a wrong answer usually means.

- **Grade 1:** 51 subcategories, 510 questions
- **Grade 2:** 64 subcategories, 640 questions
- **Grade 3:** 69 subcategories, 690 questions

Skills that Common Core teaches in a later grade are marked as *stretch*.

## How it works

- `app/page.tsx` renders the page shell. The quiz itself is plain browser JavaScript in `public/prepme.js`.
- On load, the page reads the question bank from **Supabase** (`questions` and `subcategories` tables) with the public, read-only key. Row Level Security allows reads only.
- Pictures (clocks, graphs, shapes, etc.) are drawn in the browser from each question's `params`. Coin and bill photos are in `public/coins` and `public/bills`.
- No answers are saved yet. Tracking is the next step.

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import `Nuke-SB/PrepMe`. Vercel detects Next.js; keep the default settings.
2. Optional: the app already points at the PrepMe Supabase project by default. To use a different project, add these under **Environment Variables**:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://axzgwfnbztznptqqwczo.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the publishable key from Supabase → Project Settings → API Keys |

3. Click **Deploy**. Every push to `main` redeploys automatically.

The publishable key is safe to expose in the browser. It can only read, because the database allows public reads and nothing else.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev     # http://localhost:3000
```

## Repository layout

```
app/                 Next.js page shell, styles, icon
public/prepme.js     quiz logic and picture drawing
public/coins/        penny, nickel, dime, quarter (heads and tails)
public/bills/        $1, $5, $10, $20, $50, $100 (front only, shown small)
supabase/schema.sql  table definitions and read-only policies
data/                snapshot of the question bank (JSON) that is loaded into Supabase
```

## Question bank

Questions are generated and checked by code: each answer is computed, then re-checked from the picture data. The JSON in `data/` is a snapshot of what is in Supabase. Columns are described in `supabase/schema.sql`.
