import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C } from "../lib/theme";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

interface Template {
  id: string;
  name: string;
  key: string;
  type?: string;
  isDefault?: boolean;
  active: boolean;
  body: string;
}

const typeLabel: Record<string, string> = { ADVANCE: "Antecipado", FINAL_DAY: "Último dia" };

export function Templates() {
  const { token } = useAuth();
  const [ts, setTs] = useState<Template[]>([]);

  useEffect(() => {
    api<Template[]>("/templates", { token: token! }).then(setTs).catch(() => {});
  }, [token]);

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Templates</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {ts.length === 0
          ? <Card><p style={{ color: C.tm, textAlign: "center" }}>Nenhum template</p></Card>
          : ts.map(t => (
            <Card key={t.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <Badge>{t.key}</Badge>
                    {t.type && <Badge color={C.wn}>{typeLabel[t.type] || t.type}</Badge>}
                    {t.isDefault && <Badge color={C.ok}>Padrão</Badge>}
                  </div>
                </div>
                <Badge color={t.active ? C.ok : C.dn}>{t.active ? "Ativo" : "Inativo"}</Badge>
              </div>
              <div style={{ background: C.sa, borderRadius: 8, padding: 14, fontSize: 13, lineHeight: 1.6, color: C.tm, whiteSpace: "pre-wrap", border: "1px solid " + C.bd }}>
                {t.body}
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
