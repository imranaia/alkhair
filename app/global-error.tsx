"use client";

import { useEffect } from "react";

// Root-level fallback for an error the (app)/(portal)/(public) boundaries
// didn't catch (e.g. one thrown by the root layout itself). Per Next.js
// convention this replaces the whole document, so it can't rely on
// globals.css or the app's ThemeProvider — it renders its own <html>/<body>
// and stays legible via prefers-color-scheme alone.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global error boundary]", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <style>{`
          :root { color-scheme: light dark; }
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
            background: #f5f6f4;
            color: #16211c;
          }
          @media (prefers-color-scheme: dark) {
            body { background: #10140f; color: #e7ede8; }
            .card { background: #171d16; border-color: #2a332a; }
            button { background: #5aa98a; color: #0d1310; }
          }
          .card {
            width: 100%;
            max-width: 360px;
            padding: 32px;
            border: 1px solid #d8ded9;
            border-radius: 12px;
            background: #ffffff;
            text-align: center;
          }
          h1 { margin: 0 0 8px; font-size: 17px; }
          p { margin: 0 0 20px; font-size: 14px; opacity: 0.75; }
          button {
            width: 100%;
            padding: 10px 16px;
            border: none;
            border-radius: 8px;
            background: #2f6b57;
            color: #fff;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          }
        `}</style>
        <div className="card">
          <h1>Something went wrong</h1>
          <p>The app hit an unexpected error. Please try again.</p>
          <button onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  );
}
