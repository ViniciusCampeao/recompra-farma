import { C } from "../../lib/theme";
import { CSSProperties, ReactNode } from "react";

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: C.sf, borderRadius: 12, border: "1px solid " + C.bd, padding: 24, ...style }}>
      {children}
    </div>
  );
}
