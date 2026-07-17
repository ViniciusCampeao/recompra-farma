export const C = {
  bg: "#0f1117",
  sf: "#1a1d27",
  sa: "#222632",
  bd: "#2d3245",
  tx: "#e4e6ef",
  tm: "#8b8fa7",
  pr: "#6366f1",
  ph: "#818cf8",
  ok: "#22c55e",
  wn: "#f59e0b",
  dn: "#ef4444",
} as const;

export const inp: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: C.sa,
  border: "1px solid " + C.bd,
  borderRadius: 8,
  color: C.tx,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

export const btn: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  transition: "background .15s",
};
