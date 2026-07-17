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
      <div style={{ width: 44, height: 44, borderRadius: 10, background: color + "18", color, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={22} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 13, color: C.tm, marginTop: 2 }}>{label}</div>
      </div>
    </Card>
  );
}
