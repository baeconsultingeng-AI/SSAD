"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, background: "#0d1b2e", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontFamily: "serif", fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            Application Error
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 20 }}>
            {error.message || "A critical error occurred."}
          </div>
          <button
            onClick={reset}
            style={{ background: "rgba(200,150,12,.15)", border: "1px solid rgba(200,150,12,.5)", color: "#c8960c", padding: "8px 20px", borderRadius: 8, fontFamily: "monospace", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
