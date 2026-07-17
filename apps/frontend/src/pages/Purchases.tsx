import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C, inp, btn } from "../lib/theme";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Toast } from "../components/ui/Toast";
import { Icon } from "../components/ui/Icon";

interface Purchase {
  id: string;
  medicationName: string;
  quantity: number;
  unit: string;
  estimatedEndDate?: string;
  status: "ACTIVE" | "FINISHED" | "CANCELLED";
  customer?: { name?: string; phone: string };
  reminders?: { status: string }[];
}

interface Customer {
  id: string;
  name?: string;
  phone: string;
}

const statusColor: Record<string, string> = { ACTIVE: "#22c55e", FINISHED: "#8b8fa7", CANCELLED: "#ef4444" };
const statusLabel: Record<string, string> = { ACTIVE: "Ativo", FINISHED: "Finalizado", CANCELLED: "Cancelado" };

function PurchModal({ open, onClose, onOk }: { open: boolean; onClose: () => void; onOk: () => void }) {
  const { token } = useAuth();
  const [cs, setCs] = useState<Customer[]>([]);
  const [f, setF] = useState({ cid: "", med: "", qty: "", unit: "comprimidos", dpd: "", td: "", ae: true, ad: "3", fe: true, sh: "10", sm: "0" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) api<Customer[]>("/customers", { token: token! }).then(setCs).catch(() => {});
  }, [open, token]);

  const s = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(p => ({ ...p, [k]: (e.target as HTMLInputElement).type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const go = async () => {
    if (!f.cid || !f.med || !f.qty) { setErr("Preencha cliente, medicamento e quantidade"); return; }
    setErr(""); setLoading(true);
    try {
      await api("/purchases", {
        method: "POST",
        body: {
          customerId: f.cid, medicationName: f.med, quantity: parseFloat(f.qty), unit: f.unit,
          dosePerDay: f.dpd ? parseFloat(f.dpd) : undefined,
          treatmentDays: f.td ? parseInt(f.td) : undefined,
          advanceEnabled: f.ae, advanceDays: parseInt(f.ad) || 3,
          finalDayEnabled: f.fe, sendHour: parseInt(f.sh) || 10, sendMinute: parseInt(f.sm) || 0,
        },
        token: token!,
      });
      setF({ cid: "", med: "", qty: "", unit: "comprimidos", dpd: "", td: "", ae: true, ad: "3", fe: true, sh: "10", sm: "0" });
      onOk();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova compra" width={580}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, color: C.tm, marginBottom: 6 }}>Cliente</label>
          <select style={{ ...inp, appearance: "none" }} value={f.cid} onChange={s("cid")}>
            <option value="">Selecione...</option>
            {cs.map(c => <option key={c.id} value={c.id}>{c.name || c.phone}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, color: C.tm, marginBottom: 6 }}>Medicamento</label>
          <input style={inp} value={f.med} onChange={s("med")} placeholder="Losartana 50mg" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, color: C.tm, marginBottom: 6 }}>Quantidade</label>
            <input style={inp} type="number" value={f.qty} onChange={s("qty")} placeholder="30" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, color: C.tm, marginBottom: 6 }}>Unidade</label>
            <input style={inp} value={f.unit} onChange={s("unit")} placeholder="comprimidos" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, color: C.tm, marginBottom: 6 }}>Dose/dia (opcional)</label>
            <input style={inp} type="number" value={f.dpd} onChange={s("dpd")} placeholder="1" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, color: C.tm, marginBottom: 6 }}>Dias tratamento (opcional)</label>
            <input style={inp} type="number" value={f.td} onChange={s("td")} placeholder="30" />
          </div>
        </div>
        <div style={{ borderTop: "1px solid " + C.bd, paddingTop: 14, marginTop: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Lembretes</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer", marginBottom: 8 }}>
            <input type="checkbox" checked={f.ae} onChange={s("ae")} />Aviso antecipado
            {f.ae && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input style={{ ...inp, width: 60, padding: "4px 8px", textAlign: "center" }} type="number" value={f.ad} onChange={s("ad")} />dias antes
              </span>
            )}
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer", marginBottom: 10 }}>
            <input type="checkbox" checked={f.fe} onChange={s("fe")} />Aviso no último dia
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: C.tm }}>Horário (UTC):</span>
            <input style={{ ...inp, width: 60, padding: "4px 8px", textAlign: "center" }} type="number" min="0" max="23" value={f.sh} onChange={s("sh")} />
            <span style={{ color: C.tm }}>:</span>
            <input style={{ ...inp, width: 60, padding: "4px 8px", textAlign: "center" }} type="number" min="0" max="59" value={f.sm} onChange={s("sm")} />
          </div>
        </div>
        {err && <div style={{ color: C.dn, fontSize: 13 }}>{err}</div>}
        <button onClick={go} disabled={loading} style={{ ...btn, justifyContent: "center", background: C.pr, color: "#fff", marginTop: 4 }}>
          {loading ? "Salvando..." : "Registrar compra"}
        </button>
      </div>
    </Modal>
  );
}

export function Purchases() {
  const { token } = useAuth();
  const [ps, setPs] = useState<Purchase[]>([]);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Purchase[]>("/purchases", { token: token! }).then(setPs).catch(() => {});
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Compras</h1>
        <button onClick={() => setModal(true)} style={{ ...btn, background: C.pr, color: "#fff" }}>
          <Icon name="plus" size={18} />Nova compra
        </button>
      </div>
      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid " + C.bd }}>
              {["Cliente", "Medicamento", "Qtd", "Término", "Status", "Lembretes"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, color: C.tm, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ps.length === 0
              ? <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: C.tm }}>Nenhuma compra</td></tr>
              : ps.map(p => {
                const rs = p.reminders || [];
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid " + C.bd }}>
                    <td style={{ padding: "12px 16px", fontWeight: 500 }}>{p.customer?.name || p.customer?.phone || "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="pill" size={16} />{p.medicationName}</div>
                    </td>
                    <td style={{ padding: "12px 16px", color: C.tm, fontSize: 13 }}>{p.quantity} {p.unit}</td>
                    <td style={{ padding: "12px 16px", color: C.tm, fontSize: 13 }}>
                      {p.estimatedEndDate ? new Date(p.estimatedEndDate).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Badge color={statusColor[p.status]}>{statusLabel[p.status] || p.status}</Badge>
                    </td>
                    <td style={{ padding: "12px 16px", color: C.tm, fontSize: 13 }}>
                      {rs.filter(r => r.status === "SENT").length}/{rs.length}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </Card>
      <PurchModal open={modal} onClose={() => setModal(false)} onOk={() => { load(); setModal(false); setToast("Compra registrada"); }} />
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
