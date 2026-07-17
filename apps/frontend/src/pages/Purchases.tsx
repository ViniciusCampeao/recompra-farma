import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C, inp, btn } from "../lib/theme";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Toast } from "../components/ui/Toast";
import { Icon } from "../components/ui/Icon";
import { PageHeader, TH, TD } from "../components/ui/PageHeader";

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

interface Customer { id: string; name?: string; phone: string }

const statusColor: Record<string, string> = { ACTIVE: C.ok, FINISHED: C.tm, CANCELLED: C.dn };
const statusLabel: Record<string, string> = { ACTIVE: "Ativo", FINISHED: "Finalizado", CANCELLED: "Cancelado" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

function PurchModal({ open, onClose, onOk }: { open: boolean; onClose: () => void; onOk: () => void }) {
  const { token } = useAuth();
  const [cs, setCs] = useState<Customer[]>([]);
  const [f, setF] = useState({ cid: "", med: "", qty: "", unit: "comprimidos", dpd: "", td: "", ae: true, ad: "3", fe: true, sh: "10", sm: "0" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) api<Customer[]>("/customers", { token: token! }).then(setCs).catch(() => {});
  }, [open, token]);

  const s = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = (e.target as HTMLInputElement).type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setF(p => ({ ...p, [k]: v }));
  };

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
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova compra" width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Cliente">
          <select style={{ ...inp, appearance: "none" }} value={f.cid} onChange={s("cid")}>
            <option value="">Selecione um cliente...</option>
            {cs.map(c => <option key={c.id} value={c.id}>{c.name ? `${c.name} — ${c.phone}` : c.phone}</option>)}
          </select>
        </Field>
        <Field label="Medicamento">
          <input style={inp} value={f.med} onChange={s("med")} placeholder="Losartana 50mg" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Quantidade">
            <input style={inp} type="number" value={f.qty} onChange={s("qty")} placeholder="30" />
          </Field>
          <Field label="Unidade">
            <select style={{ ...inp, appearance: "none" }} value={f.unit} onChange={s("unit")}>
              <option value="comprimidos">comprimidos</option>
              <option value="cápsulas">cápsulas</option>
              <option value="ml">ml</option>
              <option value="gotas">gotas</option>
              <option value="sachês">sachês</option>
              <option value="ampolas">ampolas</option>
              <option value="unidades">unidades</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Dose/dia (opcional)">
            <input style={inp} type="number" value={f.dpd} onChange={s("dpd")} placeholder="1" />
          </Field>
          <Field label="Dias de tratamento (opcional)">
            <input style={inp} type="number" value={f.td} onChange={s("td")} placeholder="30" />
          </Field>
        </div>
        <div style={{ borderTop: "1px solid " + C.bd, paddingTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.tm, marginBottom: 12 }}>Lembretes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={f.ae} onChange={s("ae")} />
              Aviso antecipado
              {f.ae && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.tm }}>
                  <input style={{ ...inp, width: 56, padding: "4px 8px", textAlign: "center" }} type="number" value={f.ad} onChange={s("ad")} />
                  dias antes
                </span>
              )}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={f.fe} onChange={s("fe")} />
              Aviso no último dia
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.tm, letterSpacing: "0.06em", textTransform: "uppercase" }}>Horário (UTC):</span>
            <input style={{ ...inp, width: 60, padding: "4px 8px", textAlign: "center" }} type="number" min="0" max="23" value={f.sh} onChange={s("sh")} />
            <span style={{ color: C.tm }}>:</span>
            <input style={{ ...inp, width: 60, padding: "4px 8px", textAlign: "center" }} type="number" min="0" max="59" value={f.sm} onChange={s("sm")} />
          </div>
        </div>
        {err && <div style={{ color: C.dn, fontSize: 12, padding: "8px 12px", background: C.dn + "12", borderRadius: 6 }}>{err}</div>}
        <button onClick={go} disabled={loading} style={{ ...btn, justifyContent: "center", background: C.pr, color: "#fff" }}>
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
      <PageHeader title="Compras" action={
        <button onClick={() => setModal(true)} style={{ ...btn, background: C.pr, color: "#fff" }}>
          <Icon name="plus" size={16} />Nova compra
        </button>
      } />
      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr><TH>Cliente</TH><TH>Medicamento</TH><TH>Qtd</TH><TH>Término</TH><TH>Status</TH><TH>Lembretes</TH></tr>
          </thead>
          <tbody>
            {ps.length === 0
              ? <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: C.tm, fontSize: 13 }}>Nenhuma compra registrada</td></tr>
              : ps.map((p, i) => {
                const rs = p.reminders || [];
                return (
                  <tr key={p.id} style={{ borderBottom: i < ps.length - 1 ? "1px solid " + C.bd : undefined }}>
                    <TD><span style={{ fontWeight: 500 }}>{p.customer?.name || p.customer?.phone || "—"}</span></TD>
                    <TD>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <Icon name="pill" size={14} />
                        {p.medicationName}
                      </div>
                    </TD>
                    <TD><span style={{ color: C.tm }}>{p.quantity} {p.unit}</span></TD>
                    <TD><span style={{ color: C.tm }}>{p.estimatedEndDate ? new Date(p.estimatedEndDate).toLocaleDateString("pt-BR") : "—"}</span></TD>
                    <TD><Badge color={statusColor[p.status]}>{statusLabel[p.status] || p.status}</Badge></TD>
                    <TD>
                      <span style={{ color: C.tm }}>
                        {rs.filter(r => r.status === "SENT").length}/{rs.length}
                      </span>
                    </TD>
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
