import Script from "next/script";

// The quiz itself is plain browser JavaScript in public/prepme.js (same code as the prototype).
// It reads the question bank from Supabase with the public, read-only key.
export default function Home() {
  const cfg = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
  return (
    <>
      <div className="wrap">
        <div className="brand">PrepMe</div>
        <div id="progress" className="progress" hidden></div>
        <main id="app" className="card" aria-live="polite"></main>
        <p className="foot">Grades 1–3 · one question from each subcategory, picked at random from the PrepMe bank</p>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `window.PREPME_CFG = ${JSON.stringify(cfg)};` }} />
      <Script src="/prepme.js" strategy="afterInteractive" />
    </>
  );
}
