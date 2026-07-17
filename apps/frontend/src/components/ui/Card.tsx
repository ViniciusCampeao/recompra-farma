import { C } from "../../lib/theme";
import { CSSProperties, ReactNode } from "react";

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: C.sf, borderRadius: 8, border: "1px solid " + C.bd, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.06)", ...style }}>
      {children}
    </div>
  );
}
