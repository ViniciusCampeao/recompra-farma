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

interface Reminder {
  status: string;
  scheduledFor?: string;
  sentAt?: string | null;
  type?: string;
}
interface Purchase {
  id: string;
  medicationName: string;
  quantity: number;
  unit: string;
  dosePerDay?: number;
  treatmentDays?: number;
  purchaseDate?: string;
  estimatedEndDate?: string;
  status: "ACTIVE" | "FINISHED" | "CANCELLED";
  customer?: { name?: string; phone: string };
  reminders?: Reminder[];
}

interface Customer { id: string; name?: string; phone: string }

// Deriva o "estado de envio" de uma compra a partir dos lembretes.
// Cor: verde = enviado, amarelo = agendado (vai enviar), vermelho = falhou.
function sendState(p: Purchase): { label: string; color: string; sentAt?: string } {
  const rs = p.reminders || [];
  if (rs.some(r => r.status === "FAILED")) return { label: "Falha no envio", color: C.dn };
  const sent = rs.filter(r => r.status === "SENT");
  const pending = rs.filter(r => r.status === "PENDING");
  if (sent.length && pending.length === 0) {
    const last = sent.map(r => r.sentAt).filter(Boolean).sort().pop() || undefined;
    return { label: "Enviado", color: C.ok, sentAt: last };
  }
  if (pending.length) return { label: "Agendado", color: C.wn };
  if (p.status === "CANCELLED") return { label: "Cancelado", color: C.dn };
  return { label: "Sem lembrete", color: C.tm };
}

// "DD/MM" sem ano
const fmtDM = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";

// Dias restantes até o término, em texto relativo
function daysLabel(iso?: string): string {
  if (!iso) return "";
  const end = new Date(iso); end.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = Math.round((end.getTime() - today.getTime()) / 86400000);
  if (d > 1) return `em ${d} dias`;
  if (d === 1) return "amanhã";
  if (d === 0) return "hoje";
  if (d === -1) return "ontem";
  return `há ${-d} dias`;
}

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
            <span style={{ fontSize: 11, fontWeight: 700, color: C.tm, letterSpacing: "0.06em", textTransform: "uppercase" }}>Horário (Brasília):</span>
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

function InspectModal({ purchase, onClose }: { purchase: Purchase | null; onClose: () => void }) {
  if (!purchase) return null;
  const st = sendState(purchase);
  const rows: [string, React.ReactNode][] = [
    ["Cliente", purchase.customer?.name || purchase.customer?.phone || "—"],
    ["Medicamento", purchase.medicationName],
    ["Quantidade", `${purchase.quantity} ${purchase.unit}`],
    ["Dose por dia", purchase.dosePerDay ? `${purchase.dosePerDay} ${purchase.unit}/dia` : "—"],
    ["Tratamento", purchase.treatmentDays ? `${purchase.treatmentDays} dias` : "—"],
    ["Compra feita em", fmtDM(purchase.purchaseDate)],
    ["Término previsto", purchase.estimatedEndDate ? `${fmtDM(purchase.estimatedEndDate)} · ${daysLabel(purchase.estimatedEndDate)}` : "—"],
    ["Lembrete", <Badge color={st.color}>{st.label}{st.sentAt ? ` · ${fmtDM(st.sentAt)}` : ""}</Badge>],
  ];
  return (
    <Modal open={!!purchase} onClose={onClose} title="Detalhes da compra" width={460}>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {rows.map(([label, value], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "11px 0", borderBottom: i < rows.length - 1 ? "1px solid " + C.bd : undefined }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.tm, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
            <span style={{ fontSize: 13, textAlign: "right" }}>{value}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function ConfirmDelete({ purchase, onClose, onConfirm }: { purchase: Purchase | null; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal open={!!purchase} onClose={onClose} title="Excluir compra" width={380}>
      <p style={{ color: C.tm, fontSize: 13, marginBottom: 20 }}>
        Excluir a compra de <strong>{purchase?.medicationName}</strong> de <strong>{purchase?.customer?.name || purchase?.customer?.phone}</strong>? Os lembretes agendados também serão removidos. Esta ação não pode ser desfeita.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ ...btn, background: C.sa, color: C.tx }}>Cancelar</button>
        <button onClick={onConfirm} style={{ ...btn, background: C.dn, color: "#fff" }}>Excluir</button>
      </div>
    </Modal>
  );
}

function ActionBtn({ icon, title, color, onClick }: { icon: string; title: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={title} style={{ padding: "7px 9px", borderRadius: 6, border: "none", cursor: "pointer", background: color + "14", color, display: "flex", alignItems: "center" }}>
      <Icon name={icon} size={15} />
    </button>
  );
}

export function Purchases() {
  const { token } = useAuth();
  const [ps, setPs] = useState<Purchase[]>([]);
  const [modal, setModal] = useState(false);
  const [inspecting, setInspecting] = useState<Purchase | null>(null);
  const [deleting, setDeleting] = useState<Purchase | null>(null);
  const [toast, setToast] = useState<{ msg: string; type?: "ok" | "error" } | null>(null);

  const load = useCallback(() => {
    api<Purchase[]>("/purchases", { token: token! }).then(setPs).catch(() => {});
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const doDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/purchases/${deleting.id}`, { method: "DELETE", token: token! });
      setDeleting(null); load(); setToast({ msg: "Compra excluída" });
    } catch (e) { setToast({ msg: (e as Error).message, type: "error" }); setDeleting(null); }
  };

  return (
    <div>
      <PageHeader title="Compras" action={
        <button onClick={() => setModal(true)} style={{ ...btn, background: C.pr, color: "#fff" }}>
          <Icon name="plus" size={16} />Nova compra
        </button>
      } />
      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr><TH>Cliente</TH><TH>Medicamento</TH><TH>Qtd</TH><TH>Término</TH><TH>Lembrete</TH><TH></TH></tr>
          </thead>
          <tbody>
            {ps.length === 0
              ? <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: C.tm, fontSize: 13 }}>Nenhuma compra registrada</td></tr>
              : ps.map((p, i) => {
                const st = sendState(p);
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
                    <TD>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <span style={{ color: st.color, fontWeight: 600, fontSize: 13 }}>
                          {p.estimatedEndDate ? `${daysLabel(p.estimatedEndDate)} · ${fmtDM(p.estimatedEndDate)}` : "—"}
                        </span>
                      </div>
                    </TD>
                    <TD>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Badge color={st.color}>{st.label}</Badge>
                        {st.sentAt && <span style={{ fontSize: 10, color: C.tm }}>em {fmtDM(st.sentAt)}</span>}
                      </div>
                    </TD>
                    <TD>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <ActionBtn icon="eye" title="Inspecionar" color={C.pr} onClick={() => setInspecting(p)} />
                        <ActionBtn icon="trash" title="Excluir" color={C.dn} onClick={() => setDeleting(p)} />
                      </div>
                    </TD>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </Card>
      <PurchModal open={modal} onClose={() => setModal(false)} onOk={() => { load(); setModal(false); setToast({ msg: "Compra registrada" }); }} />
      <InspectModal purchase={inspecting} onClose={() => setInspecting(null)} />
      <ConfirmDelete purchase={deleting} onClose={() => setDeleting(null)} onConfirm={doDelete} />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
