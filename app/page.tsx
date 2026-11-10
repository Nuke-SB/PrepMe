import Script from "next/script";

// The quiz itself is plain browser JavaScript in public/prepme.js (same code as the prototype).
// It reads the question bank from Supabase with the public, read-only key.
export default function Home() {
  // Defaults point at the PrepMe Supabase project. The publishable key is meant to be public:
  // the database only allows reading questions. Vercel environment variables override these if set.
  const cfg = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://axzgwfnbztznptqqwczo.supabase.co",
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Iod6p96P1WRWWsCP13IRiQ_4AgQh-tT",
  };
  return (
    <>
      <div className="wrap">
        <div className="brand">PrepMe</div>
        <div id="progress" className="progress" hidden></div>
        <main id="app" className="card" aria-live="polite"></main>
        <p className="foot">Grades 1–4 · Bronze, Silver, Gold · one question from each subcategory, picked at random from the PrepMe bank</p>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `window.PREPME_CFG = ${JSON.stringify(cfg)};` }} />
      <Script src="/prepme.js" strategy="afterInteractive" />
    </>
  );
}
