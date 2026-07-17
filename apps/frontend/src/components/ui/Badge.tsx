import { C } from "../../lib/theme";
import { ReactNode } from "react";

export function Badge({ children, color = C.pr }: { children: ReactNode; color?: string }) {
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 50, fontSize: 12, fontWeight: 600, background: color + "22", color }}>
      {children}
    </span>
  );
}
