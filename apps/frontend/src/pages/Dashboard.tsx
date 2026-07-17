import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C } from "../lib/theme";
import { Card } from "../components/ui/Card";
import { Stat } from "../components/ui/Stat";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";

interface Stats {
  c: number;
  a: number;
  p: number;
  s: number;
}

export function Dashboard() {
  const { token } = useAuth();
  const [st, setSt] = useState<Stats>({ c: 0, a: 0, p: 0, s: 0 });
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ length: number }[]>("/customers", { token: token! }),
      api<{ status: string; reminders?: { status: string }[] }[]>("/purchases", { token: token! }),
    ]).then(([cs, ps]) => {
      const a = ps.filter(p => p.status === "ACTIVE").length;
      const rs = ps.flatMap(p => p.reminders || []);
      setSt({ c: cs.length, a, p: rs.filter(r => r.status === "PENDING").length, s: rs.filter(r => r.status === "SENT").length });
    }).catch(() => {});
    api("/health", { token: token! }).then(() => setApiOk(true)).catch(() => setApiOk(false));
  }, [token]);

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Painel</h1>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Stat icon="users" label="Clientes" value={st.c} color={C.pr} />
        <Stat icon="cart" label="Compras ativas" value={st.a} color={C.ok} />
        <Stat icon="clock" label="Pendentes" value={st.p} color={C.wn} />
        <Stat icon="check" label="Enviados" value={st.s} color={C.ok} />
      </div>
      <Card style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Icon name="wifi" size={20} />
            <span style={{ fontWeight: 600 }}>Status do Sistema</span>
          </div>
          <Badge color={apiOk === null ? C.tm : apiOk ? C.ok : C.dn}>
            {apiOk === null ? "Verificando..." : apiOk ? "API Online" : "API Offline"}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
