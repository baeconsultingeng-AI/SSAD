"use client";

import { useEffect } from "react";

export default function Error({
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
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#0d1b2e",
      gap: 16,
      padding: 24,
    }}>
      <div style={{ fontFamily: "var(--ser)", fontSize: 18, fontWeight: 700, color: "#fff" }}>
        Something went wrong
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "rgba(255,255,255,.45)", textAlign: "center", maxWidth: 400 }}>
        {error.message || "An unexpected error occurred."}
      </div>
      <button
        onClick={reset}
        style={{
          background: "rgba(200,150,12,.12)",
          border: "1px solid rgba(200,150,12,.45)",
          color: "#c8960c",
          padding: "8px 20px",
          borderRadius: 8,
          fontFamily: "var(--mono)",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          marginTop: 8,
        }}
      >
        Try again
      </button>
    </div>
  );
}
