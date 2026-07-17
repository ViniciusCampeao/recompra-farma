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

interface Customer {
  id: string;
  name?: string;
  phone: string;
  phoneRaw?: string;
  notes?: string;
  createdAt: string;
  _count?: { purchases: number };
}

interface Template {
  id: string;
  name: string;
  body: string;
}

function CustModal({
  open, onClose, onOk, editing,
}: {
  open: boolean; onClose: () => void; onOk: () => void; editing?: Customer | null;
}) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name || "");
      setPhone(editing?.phoneRaw || editing?.phone || "");
      setNotes(editing?.notes || "");
      setErr("");
    }
  }, [open, editing]);

  const go = async () => {
    if (!editing && !phone.trim()) { setErr("Telefone obrigatório"); return; }
    setErr(""); setLoading(true);
    try {
      if (editing) {
        await api(`/customers/${editing.id}`, { method: "PATCH", body: { name: name || undefined, phone: phone || undefined, notes: notes || undefined }, token: token! });
      } else {
        await api("/customers", { method: "POST", body: { name: name || undefined, phone }, token: token! });
      }
      onOk();
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar cliente" : "Novo cliente"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nome (opcional)">
          <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="João Silva" />
        </Field>
        <Field label={editing ? "Telefone (deixe em branco para manter)" : "Telefone"}>
          <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="14999887766" />
        </Field>
        <Field label="Observações (opcional)">
          <textarea style={{ ...inp, minHeight: 70 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas internas..." />
        </Field>
        {err && <ErrBox msg={err} />}
        <button onClick={go} disabled={loading} style={{ ...btn, justifyContent: "center", background: C.pr, color: "#fff" }}>
          {loading ? "Salvando..." : editing ? "Salvar alterações" : "Criar cliente"}
        </button>
      </div>
    </Modal>
  );
}

function SendTestModal({ open, onClose, customer }: { open: boolean; onClose: () => void; customer: Customer | null }) {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tplId, setTplId] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open && customer) {
      api<Template[]>("/templates", { token: token! }).then(ts => {
        setTemplates(ts);
        if (ts.length > 0) { setTplId(ts[0].id); setBody(ts[0].body); }
      }).catch(() => {});
      setSent(false); setErr("");
    }
  }, [open, customer, token]);

  const onTplChange = (id: string) => {
    setTplId(id);
    const t = templates.find(t => t.id === id);
    if (t) setBody(renderPreview(t.body, customer?.name));
  };

  const renderPreview = (b: string, nome?: string) => {
    const n = nome?.trim();
    return (n
      ? b.replace(/\{\{cliente\}\}/g, n)
      : b.replace(/ ?\{\{cliente\}\}/g, ""))
     .replace(/\{\{medicamento\}\}/g, "[ medicamento ]")
     .replace(/\{\{dias\}\}/g, "[ dias ]")
     .replace(/\{\{data_fim\}\}/g, "[ data ]")
     .trim();
  };

  useEffect(() => {
    if (tplId) {
      const t = templates.find(t => t.id === tplId);
      if (t) setBody(renderPreview(t.body, customer?.name));
    }
  }, [tplId, templates, customer]);

  const send = async () => {
    if (!body.trim() || !customer) return;
    setLoading(true); setErr("");
    try {
      await api("/purchases/send-test", { method: "POST", body: { customerId: customer.id, message: body }, token: token! });
      setSent(true);
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Enviar mensagem — ${customer?.name || customer?.phone}`} width={560}>
      {sent ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ color: C.ok, fontSize: 32, marginBottom: 10 }}>✓</div>
          <div style={{ fontWeight: 600 }}>Mensagem enviada!</div>
          <button onClick={onClose} style={{ ...btn, marginTop: 16, background: C.pr, color: "#fff", justifyContent: "center" }}>Fechar</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Template">
            <select style={{ ...inp, appearance: "none" }} value={tplId} onChange={e => onTplChange(e.target.value)}>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Mensagem (editável antes de enviar)">
            <textarea style={{ ...inp, minHeight: 140, lineHeight: 1.6 }} value={body} onChange={e => setBody(e.target.value)} />
          </Field>
          {err && <ErrBox msg={err} />}
          <button onClick={send} disabled={loading} style={{ ...btn, justifyContent: "center", background: C.pr, color: "#fff" }}>
            <Icon name="send" size={16} />
            {loading ? "Enviando..." : "Enviar mensagem"}
          </button>
        </div>
      )}
    </Modal>
  );
}

function ConfirmModal({ open, onClose, onConfirm, title, msg }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; msg: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={400}>
      <p style={{ color: C.tm, fontSize: 13, marginBottom: 20 }}>{msg}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ ...btn, background: C.sa, color: C.tx }}>Cancelar</button>
        <button onClick={onConfirm} style={{ ...btn, background: C.dn, color: "#fff" }}>Excluir</button>
      </div>
    </Modal>
  );
}

export function Customers() {
  const { token } = useAuth();
  const [cs, setCs] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [testModal, setTestModal] = useState<Customer | null>(null);
  const [toast, setToast] = useState<{ msg: string; type?: "ok" | "error" } | null>(null);

  const load = useCallback(() => {
    api<Customer[]>("/customers", { token: token! }).then(setCs).catch(() => {});
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const fl = cs.filter(c =>
    (c.name || "").toLowerCase().includes(q.toLowerCase()) ||
    c.phone.includes(q) ||
    (c.phoneRaw || "").includes(q)
  );

  const doDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/customers/${deleting.id}`, { method: "DELETE", token: token! });
      setDeleting(null); load(); setToast({ msg: "Cliente excluído" });
    } catch (e) { setToast({ msg: (e as Error).message, type: "error" }); setDeleting(null); }
  };

  return (
    <div>
      <PageHeader title="Clientes" action={
        <button onClick={() => { setEditing(null); setModal(true); }} style={{ ...btn, background: C.pr, color: "#fff" }}>
          <Icon name="plus" size={16} />Novo cliente
        </button>
      } />
      <div style={{ marginBottom: 14, position: "relative" }}>
        <input style={{ ...inp, paddingLeft: 38 }} placeholder="Buscar por nome ou telefone..." value={q} onChange={e => setQ(e.target.value)} />
        <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.tm }}><Icon name="search" size={16} /></span>
      </div>
      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr>
              <TH>Nome</TH><TH>Telefone</TH><TH>Compras</TH><TH>Cadastro</TH><TH></TH>
            </tr>
          </thead>
          <tbody>
            {fl.length === 0
              ? <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: C.tm, fontSize: 13 }}>{cs.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum resultado"}</td></tr>
              : fl.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < fl.length - 1 ? "1px solid " + C.bd : undefined }}>
                  <TD><span style={{ fontWeight: 500 }}>{c.name || <span style={{ color: C.tm }}>—</span>}</span></TD>
                  <TD mono>{c.phoneRaw || c.phone}</TD>
                  <TD><Badge color={C.pr}>{c._count?.purchases ?? 0}</Badge></TD>
                  <TD><span style={{ color: C.tm }}>{new Date(c.createdAt).toLocaleDateString("pt-BR")}</span></TD>
                  <td style={{ padding: "8px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <ActionBtn icon="send" title="Enviar mensagem" color={C.ok} onClick={() => setTestModal(c)} />
                      <ActionBtn icon="edit" title="Editar" color={C.pr} onClick={() => { setEditing(c); setModal(true); }} />
                      <ActionBtn icon="trash" title="Excluir" color={C.dn} onClick={() => setDeleting(c)} />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>

      <CustModal
        open={modal}
        onClose={() => setModal(false)}
        editing={editing}
        onOk={() => { load(); setModal(false); setToast({ msg: editing ? "Cliente atualizado" : "Cliente criado" }); }}
      />
      <SendTestModal open={!!testModal} onClose={() => setTestModal(null)} customer={testModal} />
      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={doDelete}
        title="Excluir cliente"
        msg={`Deseja excluir ${deleting?.name || deleting?.phone}? Esta ação não pode ser desfeita.`}
      />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return <div style={{ color: C.dn, fontSize: 12, padding: "8px 12px", background: C.dn + "12", borderRadius: 6 }}>{msg}</div>;
}

function ActionBtn({ icon, title, color, onClick }: { icon: string; title: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ padding: "6px 8px", borderRadius: 6, border: "none", cursor: "pointer", background: color + "14", color, display: "flex", alignItems: "center" }}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}
