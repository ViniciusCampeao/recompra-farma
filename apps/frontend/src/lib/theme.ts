export const C = {
  bg: "#f5f6fa",
  sf: "#ffffff",
  sa: "#f0f1f5",
  bd: "#e2e4ec",
  tx: "#1a1d2e",
  tm: "#6b7094",
  pr: "#2563eb",
  ph: "#3b82f6",
  ok: "#16a34a",
  wn: "#d97706",
  dn: "#dc2626",
  sb: "#1e2440",
  sbt: "#ffffff",
  sbm: "rgba(255,255,255,0.55)",
  sba: "rgba(255,255,255,0.12)",
} as const;

export const inp: React.CSSProperties = {
  width: "100%",
  padding: "9px 13px",
  background: C.sf,
  border: "1px solid " + C.bd,
  borderRadius: 6,
  color: C.tx,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

export const btn: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  transition: "opacity .15s",
};
