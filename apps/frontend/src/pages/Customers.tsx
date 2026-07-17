import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C, inp, btn } from "../lib/theme";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Toast } from "../components/ui/Toast";
import { Icon } from "../components/ui/Icon";

interface Customer {
  id: string;
  name?: string;
  phone: string;
  createdAt: string;
  _count?: { purchases: number };
}

function CustModal({ open, onClose, onOk }: { open: boolean; onClose: () => void; onOk: () => void }) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const go = async () => {
    if (!phone.trim()) { setErr("Telefone obrigatório"); return; }
    setErr(""); setLoading(true);
    try {
      await api("/customers", { method: "POST", body: { name: name || undefined, phone }, token: token! });
      setName(""); setPhone(""); onOk();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo cliente">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 13, color: C.tm, marginBottom: 6 }}>Nome (opcional)</label>
          <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="João Silva" />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, color: C.tm, marginBottom: 6 }}>Telefone</label>
          <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="14999887766" />
        </div>
        {err && <div style={{ color: C.dn, fontSize: 13 }}>{err}</div>}
        <button onClick={go} disabled={loading} style={{ ...btn, justifyContent: "center", background: C.pr, color: "#fff", marginTop: 4 }}>
          {loading ? "Salvando..." : "Criar cliente"}
        </button>
      </div>
    </Modal>
  );
}

export function Customers() {
  const { token } = useAuth();
  const [cs, setCs] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Customer[]>("/customers", { token: token! }).then(setCs).catch(() => {});
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const fl = cs.filter(c => (c.name || "").toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Clientes</h1>
        <button onClick={() => setModal(true)} style={{ ...btn, background: C.pr, color: "#fff" }}>
          <Icon name="plus" size={18} />Novo cliente
        </button>
      </div>
      <div style={{ marginBottom: 16, position: "relative" }}>
        <input style={{ ...inp, paddingLeft: 40 }} placeholder="Buscar por nome ou telefone..." value={q} onChange={e => setQ(e.target.value)} />
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.tm }}>
          <Icon name="search" size={18} />
        </span>
      </div>
      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid " + C.bd }}>
              {["Nome", "Telefone", "Compras", "Cadastro"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, color: C.tm, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fl.length === 0
              ? <tr><td colSpan={4} style={{ padding: 32, textAlign: "center", color: C.tm }}>{cs.length === 0 ? "Nenhum cliente" : "Nenhum resultado"}</td></tr>
              : fl.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid " + C.bd }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{c.name || "—"}</td>
                  <td style={{ padding: "12px 16px", color: C.tm, fontFamily: "monospace", fontSize: 13 }}>{c.phone}</td>
                  <td style={{ padding: "12px 16px" }}><Badge>{c._count?.purchases ?? 0}</Badge></td>
                  <td style={{ padding: "12px 16px", color: C.tm, fontSize: 13 }}>{new Date(c.createdAt).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
      <CustModal open={modal} onClose={() => setModal(false)} onOk={() => { load(); setModal(false); setToast("Cliente criado"); }} />
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
