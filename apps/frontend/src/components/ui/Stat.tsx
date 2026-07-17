import { C } from "../../lib/theme";
import { Card } from "./Card";
import { Icon } from "./Icon";

interface StatProps {
  icon: string;
  label: string;
  value: number;
  color?: string;
}

export function Stat({ icon, label, value, color = C.pr }: StatProps) {
  return (
    <Card style={{ display: "flex", alignItems: "center", gap: 16, flex: "1 1 200px" }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: color + "14", color, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={19} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, color: C.tm, marginTop: 2, letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
      </div>
    </Card>
  );
}
