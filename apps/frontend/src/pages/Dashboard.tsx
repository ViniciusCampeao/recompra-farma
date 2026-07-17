import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C } from "../lib/theme";
import { Card } from "../components/ui/Card";
import { Stat } from "../components/ui/Stat";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";
import { PageHeader } from "../components/ui/PageHeader";

interface Stats { c: number; a: number; p: number; s: number }

interface Reminder {
  id: string;
  type: "ADVANCE" | "FINAL_DAY";
  status: "PENDING" | "SENT" | "FAILED" | "CANCELLED";
  scheduledFor: string;
  purchase?: {
    medicationName: string;
    customer?: { name?: string; phone: string } | null;
  };
}

const typeLabel: Record<string, string> = { ADVANCE: "Antecipado", FINAL_DAY: "Último dia" };
const statusColor: Record<string, string> = { PENDING: C.wn, SENT: C.ok, FAILED: C.dn, CANCELLED: C.tm };
const statusLabel: Record<string, string> = { PENDING: "Pendente", SENT: "Enviado", FAILED: "Falhou", CANCELLED: "Cancelado" };

const fmtHour = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const fmtPhone = (e164: string) => {
  const d = (e164 || "").replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) return `(${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  return e164;
};

export function Dashboard() {
  const { token } = useAuth();
  const [st, setSt] = useState<Stats>({ c: 0, a: 0, p: 0, s: 0 });
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingRem, setLoadingRem] = useState(true);

  useEffect(() => {
    Promise.all([
      api<{ length: number }[]>("/customers", { token: token! }),
      api<{ status: string; reminders?: { status: string }[] }[]>("/purchases", { token: token! }),
    ]).then(([cs, ps]) => {
      const a = ps.filter(p => p.status === "ACTIVE").length;
      const rs = ps.flatMap(p => p.reminders || []);
      setSt({ c: cs.length, a, p: rs.filter(r => r.status === "PENDING").length, s: rs.filter(r => r.status === "SENT").length });
    }).catch(() => {});

    api<Reminder[]>("/purchases/reminders/today", { token: token! })
      .then(r => { setReminders(Array.isArray(r) ? r : []); setLoadingRem(false); })
      .catch(() => setLoadingRem(false));

    api("/health", { token: token! }).then(() => setApiOk(true)).catch(() => setApiOk(false));
  }, [token]);

  const pending = reminders.filter(r => r.status === "PENDING").length;

  return (
    <div>
      <PageHeader title="Painel" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        <Stat icon="users"  label="Clientes"       value={st.c} color={C.pr} />
        <Stat icon="cart"   label="Compras Ativas"  value={st.a} color={C.ok} />
        <Stat icon="clock"  label="Pendentes"       value={st.p} color={C.wn} />
        <Stat icon="check"  label="Enviados"        value={st.s} color={C.ok} />
      </div>

      {/* Lembretes de hoje */}
      <Card style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid " + C.bd }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="clock" size={18} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Lembretes de hoje</span>
          </div>
          <Badge color={pending > 0 ? C.wn : C.ok}>
            {pending > 0 ? `${pending} pendente${pending > 1 ? "s" : ""}` : "Tudo em dia"}
          </Badge>
        </div>

        {loadingRem ? (
          <div style={{ padding: 24, textAlign: "center", color: C.tm, fontSize: 13 }}>Carregando...</div>
        ) : reminders.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: C.tm, fontSize: 13 }}>
            Nenhum lembrete agendado para hoje
          </div>
        ) : (
          <div>
            {reminders.map((r, i) => (
              <div
                key={r.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 18px",
                  borderBottom: i < reminders.length - 1 ? "1px solid " + C.bd : undefined,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: C.tm, width: 48, flexShrink: 0 }}>
                  {fmtHour(r.scheduledFor)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.purchase?.customer?.name || fmtPhone(r.purchase?.customer?.phone || "")}
                  </div>
                  <div style={{ fontSize: 12, color: C.tm, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
                    <Icon name="pill" size={12} /> {r.purchase?.medicationName || "—"} · {typeLabel[r.type] || r.type}
                  </div>
                </div>
                <Badge color={statusColor[r.status]}>{statusLabel[r.status] || r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="wifi" size={18} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Status do Sistema</span>
          </div>
          <Badge color={apiOk === null ? C.tm : apiOk ? C.ok : C.dn}>
            {apiOk === null ? "Verificando" : apiOk ? "Online" : "Offline"}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
