import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C } from "../lib/theme";
import { Card } from "../components/ui/Card";
import { Stat } from "../components/ui/Stat";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";
import { PageHeader } from "../components/ui/PageHeader";
import { ErrorState } from "../components/ui/ErrorState";

interface Stats {
  customers: number;
  activePurchases: number;
  pendingReminders: number;
  sentReminders: number;
}

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

  const stats = useQuery({
    queryKey: ["stats-summary"],
    queryFn: () => api<Stats>("/purchases/stats/summary", { token: token! }),
    enabled: !!token,
  });

  const reminders = useQuery({
    queryKey: ["reminders-today"],
    queryFn: () => api<Reminder[]>("/purchases/reminders/today", { token: token! }),
    enabled: !!token,
  });

  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api("/health", { token: token! }),
    enabled: !!token,
    retry: false,
  });

  const st = stats.data ?? { customers: 0, activePurchases: 0, pendingReminders: 0, sentReminders: 0 };
  const remindersList = reminders.data ?? [];
  const pending = remindersList.filter(r => r.status === "PENDING").length;

  return (
    <div>
      <PageHeader title="Painel" />

      {stats.isError && (
        <div style={{ marginBottom: 20 }}>
          <ErrorState message="Falha ao carregar os números do painel." onRetry={() => stats.refetch()} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        <Stat icon="users"  label="Clientes"       value={stats.isLoading ? 0 : st.customers}        color={C.pr} />
        <Stat icon="cart"   label="Compras Ativas"  value={stats.isLoading ? 0 : st.activePurchases}  color={C.ok} />
        <Stat icon="clock"  label="Pendentes"       value={stats.isLoading ? 0 : st.pendingReminders} color={C.wn} />
        <Stat icon="check"  label="Enviados"        value={stats.isLoading ? 0 : st.sentReminders}    color={C.ok} />
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

        {reminders.isError ? (
          <div style={{ padding: 18 }}>
            <ErrorState message="Falha ao carregar os lembretes de hoje." onRetry={() => reminders.refetch()} />
          </div>
        ) : reminders.isLoading ? (
          <div style={{ padding: 24, textAlign: "center", color: C.tm, fontSize: 13 }}>Carregando...</div>
        ) : remindersList.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: C.tm, fontSize: 13 }}>
            Nenhum lembrete agendado para hoje
          </div>
        ) : (
          <div>
            {remindersList.map((r, i) => (
              <div
                key={r.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 18px",
                  borderBottom: i < remindersList.length - 1 ? "1px solid " + C.bd : undefined,
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
          <Badge color={health.isLoading ? C.tm : health.isError ? C.dn : C.ok}>
            {health.isLoading ? "Verificando" : health.isError ? "Offline" : "Online"}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
