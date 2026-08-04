import { C, alpha } from "../../lib/theme";
import { ReactNode } from "react";

export function Badge({ children, color = C.pr }: { children: ReactNode; color?: string }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", background: alpha(color, 9), color }}>
      {children}
    </span>
  );
}
