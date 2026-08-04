// Os valores abaixo são custom properties CSS (ver index.css), não cores fixas.
// Isso permite alternar claro/escuro via atributo data-theme na <html> sem
// precisar tocar em cada componente que importa `C`.
export const C = {
  bg: "var(--bg)",
  sf: "var(--sf)",
  sa: "var(--sa)",
  bd: "var(--bd)",
  tx: "var(--tx)",
  tm: "var(--tm)",
  pr: "var(--pr)",
  ph: "var(--ph)",
  ok: "var(--ok)",
  wn: "var(--wn)",
  dn: "var(--dn)",
  sb: "var(--sb)",
  sbt: "var(--sbt)",
  sbm: "var(--sbm)",
  sba: "var(--sba)",
} as const;

// Mistura `color` com transparência (substitui o antigo hack `color + "14"`,
// que só funcionava com strings hex literais — quebra com var(--x)).
export function alpha(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

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
