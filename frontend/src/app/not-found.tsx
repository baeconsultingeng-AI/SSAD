export default function NotFound() {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#0d1b2e",
      gap: 12,
    }}>
      <div style={{ fontFamily: "var(--ser)", fontSize: 48, fontWeight: 900, color: "rgba(200,150,12,.7)" }}>
        404
      </div>
      <div style={{ fontFamily: "var(--ser)", fontSize: 16, fontWeight: 700, color: "#fff" }}>
        Page not found
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "rgba(255,255,255,.4)" }}>
        This route does not exist.
      </div>
      <a
        href="/"
        style={{
          marginTop: 12,
          background: "rgba(200,150,12,.12)",
          border: "1px solid rgba(200,150,12,.45)",
          color: "#c8960c",
          padding: "8px 20px",
          borderRadius: 8,
          fontFamily: "var(--mono)",
          fontSize: 11,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Go home
      </a>
    </div>
  );
}
