import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C, inp, btn, alpha } from "../lib/theme";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Toast } from "../components/ui/Toast";
import { Icon } from "../components/ui/Icon";
import { PageHeader, TH, TD, TableMessage } from "../components/ui/PageHeader";
import { ErrorState } from "../components/ui/ErrorState";

interface User {
  id: string;
  name?: string;
  email: string;
  role: "ADMIN" | "ATTENDANT";
  active: boolean;
  createdAt: string;
}

function UserModal({ open, onClose, onOk, editing }: { open: boolean; onClose: () => void; onOk: () => void; editing?: User | null }) {
  const { token } = useAuth();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "ATTENDANT", active: true });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setF({ name: editing?.name || "", email: editing?.email || "", password: "", role: editing?.role || "ATTENDANT", active: editing?.active ?? true });
      setErr("");
    }
  }, [open, editing]);

  const s = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = (e.target as HTMLInputElement).type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setF(p => ({ ...p, [k]: v }));
  };

  const go = async () => {
    if (!f.email.trim()) { setErr("Email obrigatório"); return; }
    if (!editing && !f.password.trim()) { setErr("Senha obrigatória para novo usuário"); return; }
    setErr(""); setLoading(true);
    try {
      if (editing) {
        const body: Record<string, unknown> = { name: f.name || undefined, role: f.role, active: f.active };
        if (f.password) body.password = f.password;
        await api(`/users/${editing.id}`, { method: "PATCH", body, token: token! });
      } else {
        await api("/users", { method: "POST", body: { name: f.name || undefined, email: f.email, password: f.password, role: f.role }, token: token! });
      }
      onOk();
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Editar usuário" : "Novo usuário"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nome (opcional)">
          <input style={inp} value={f.name} onChange={s("name")} placeholder="João Silva" />
        </Field>
        {!editing && (
          <Field label="Email">
            <input style={inp} type="email" value={f.email} onChange={s("email")} placeholder="usuario@farmacia.com" />
          </Field>
        )}
        <Field label={editing ? "Nova senha (deixe vazio para manter)" : "Senha"}>
          <input style={inp} type="password" value={f.password} onChange={s("password")} placeholder="••••••" />
        </Field>
        <Field label="Perfil">
          <select style={{ ...inp, appearance: "none" }} value={f.role} onChange={s("role")}>
            <option value="ATTENDANT">Atendente</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </Field>
        {editing && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={f.active} onChange={s("active")} />
            Usuário ativo
          </label>
        )}
        {err && <div style={{ color: C.dn, fontSize: 12, padding: "8px 12px", background: alpha(C.dn, 7), borderRadius: 6 }}>{err}</div>}
        <button onClick={go} disabled={loading} style={{ ...btn, justifyContent: "center", background: C.pr, color: "#fff" }}>
          {loading ? "Salvando..." : editing ? "Salvar alterações" : "Criar usuário"}
        </button>
      </div>
    </Modal>
  );
}

export function Users() {
  const { token, user } = useAuth();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [toast, setToast] = useState<{ msg: string; type?: "ok" | "error" } | null>(null);

  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: () => api<User[]>("/users", { token: token! }),
    enabled: !!token,
  });

  const list = users ?? [];

  const doDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/users/${deleting.id}`, { method: "DELETE", token: token! });
      setDeleting(null); refetch(); setToast({ msg: "Usuário excluído" });
    } catch (e) { setToast({ msg: (e as Error).message, type: "error" }); setDeleting(null); }
  };

  return (
    <div>
      <PageHeader title="Usuários" action={
        <button onClick={() => { setEditing(null); setModal(true); }} style={{ ...btn, background: C.pr, color: "#fff" }}>
          <Icon name="plus" size={16} />Novo usuário
        </button>
      } />
      {isError ? (
        <ErrorState message="Falha ao carregar os usuários." onRetry={() => refetch()} />
      ) : (
        <Card style={{ padding: 0, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
            <thead>
              <tr><TH>Nome</TH><TH>Email</TH><TH>Perfil</TH><TH>Status</TH><TH>Criado</TH><TH></TH></tr>
            </thead>
            <tbody>
              {isLoading
                ? <TableMessage colSpan={6}>Carregando...</TableMessage>
                : list.length === 0
                  ? <TableMessage colSpan={6}>Nenhum usuário</TableMessage>
                  : list.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: i < list.length - 1 ? "1px solid " + C.bd : undefined }}>
                      <TD><span style={{ fontWeight: 500 }}>{u.name || "—"}</span></TD>
                      <TD><span style={{ color: C.tm }}>{u.email}</span></TD>
                      <TD><Badge color={u.role === "ADMIN" ? C.pr : C.tm}>{u.role === "ADMIN" ? "Admin" : "Atendente"}</Badge></TD>
                      <TD><Badge color={u.active ? C.ok : C.dn}>{u.active ? "Ativo" : "Inativo"}</Badge></TD>
                      <TD><span style={{ color: C.tm }}>{new Date(u.createdAt).toLocaleDateString("pt-BR")}</span></TD>
                      <td style={{ padding: "8px 14px" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button
                            onClick={() => { setEditing(u); setModal(true); }}
                            title="Editar"
                            style={{ padding: "6px 8px", borderRadius: 6, border: "none", cursor: "pointer", background: alpha(C.pr, 8), color: C.pr, display: "flex", alignItems: "center" }}
                          >
                            <Icon name="edit" size={15} />
                          </button>
                          {u.id !== user?.id && (
                            <button
                              onClick={() => setDeleting(u)}
                              title="Excluir"
                              style={{ padding: "6px 8px", borderRadius: 6, border: "none", cursor: "pointer", background: alpha(C.dn, 8), color: C.dn, display: "flex", alignItems: "center" }}
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </Card>
      )}
      <UserModal
        open={modal}
        onClose={() => setModal(false)}
        editing={editing}
        onOk={() => { refetch(); setModal(false); setToast({ msg: editing ? "Usuário atualizado" : "Usuário criado" }); }}
      />
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Excluir usuário" width={380}>
        <p style={{ color: C.tm, fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          Excluir <strong>{deleting?.name || deleting?.email}</strong>? Esta ação não pode ser desfeita. Se preferir manter o histórico, desative o usuário em vez de excluir.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setDeleting(null)} style={{ ...btn, background: C.sa, color: C.tx }}>Cancelar</button>
          <button onClick={doDelete} style={{ ...btn, background: C.dn, color: "#fff" }}>Excluir</button>
        </div>
      </Modal>
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
