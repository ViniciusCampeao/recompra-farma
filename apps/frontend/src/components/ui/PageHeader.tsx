import { C } from "../../lib/theme";
import { ReactNode } from "react";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
      <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: "0.05em", textTransform: "uppercase", color: C.tm }}>{title}</h1>
      {action}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.tm, marginBottom: 10 }}>
      {children}
    </div>
  );
}

export function TH({ children }: { children?: ReactNode }) {
  return (
    <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, color: C.tm, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid " + C.bd }}>
      {children}
    </th>
  );
}

export function TD({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return (
    <td style={{ padding: "11px 14px", fontSize: 13, fontFamily: mono ? "monospace" : undefined }}>
      {children}
    </td>
  );
}
