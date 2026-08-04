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
import { PageHeader, SectionLabel } from "../components/ui/PageHeader";
import { ErrorState } from "../components/ui/ErrorState";

interface Settings {
  defaultSendHour: number;
  defaultSendMinute: number;
}

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
const typeColor: Record<string, string> = { ADVANCE: C.pr, FINAL_DAY: C.wn };

function TplModal({
  open, onClose, onOk, editing,
}: {
  open: boolean; onClose: () => void; onOk: () => void; editing: Template | null;
}) {
  const { token } = useAuth();
  const [f, setF] = useState({ name: "", body: "", isDefault: false, active: true });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && editing) {
      setF({
        name: editing.name || "",
        body: editing.body || "",
        isDefault: editing.isDefault ?? false,
        active: editing.active ?? true,
      });
      setErr("");
    }
  }, [open, editing]);

  const s = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const v = (e.target as HTMLInputElement).type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setF(p => ({ ...p, [k]: v }));
  };

  const go = async () => {
    if (!editing) return;
    if (!f.name.trim() || !f.body.trim()) { setErr("Nome e mensagem são obrigatórios"); return; }
    setErr(""); setLoading(true);
    try {
      await api(`/templates/${editing.id}`, { method: "PATCH", body: { name: f.name, body: f.body, isDefault: f.isDefault, active: f.active }, token: token! });
      onOk();
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Editar template" width={600}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nome">
          <input style={inp} value={f.name} onChange={s("name")} placeholder="Aviso antecipado personalizado" />
        </Field>
        <Field label="Mensagem">
          <textarea
            style={{ ...inp, minHeight: 160, lineHeight: 1.7, fontFamily: "monospace", fontSize: 12 }}
            value={f.body}
            onChange={s("body")}
            placeholder={"Olá {{cliente}}!\n\nSeu medicamento {{medicamento}} termina em {{dias}} dias."}
          />
          <div style={{ fontSize: 11, color: C.tm, marginTop: 8, lineHeight: 1.9 }}>
            Use estas etiquetas — elas são trocadas automaticamente na hora do envio:<br />
            <code style={{ background: C.sa, padding: "1px 5px", borderRadius: 3 }}>{"{{cliente}}"}</code> nome do cliente{" · "}
            <code style={{ background: C.sa, padding: "1px 5px", borderRadius: 3 }}>{"{{medicamento}}"}</code> remédio{" · "}
            <code style={{ background: C.sa, padding: "1px 5px", borderRadius: 3 }}>{"{{dias}}"}</code> dias restantes{" · "}
            <code style={{ background: C.sa, padding: "1px 5px", borderRadius: 3 }}>{"{{data_fim}}"}</code> data de término
          </div>
        </Field>
        <div style={{ display: "flex", gap: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={f.isDefault} onChange={s("isDefault")} />
            Padrão para o tipo
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={f.active} onChange={s("active")} />
            Ativo
          </label>
        </div>
        {err && <div style={{ color: C.dn, fontSize: 12, padding: "8px 12px", background: alpha(C.dn, 7), borderRadius: 6 }}>{err}</div>}
        <button onClick={go} disabled={loading} style={{ ...btn, justifyContent: "center", background: C.pr, color: "#fff" }}>
          {loading ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </Modal>
  );
}

function ConfirmModal({ open, onClose, onConfirm, name }: { open: boolean; onClose: () => void; onConfirm: () => void; name: string }) {
  return (
    <Modal open={open} onClose={onClose} title="Excluir template" width={380}>
      <p style={{ color: C.tm, fontSize: 13, marginBottom: 20 }}>
        Deseja excluir o template <strong>{name}</strong>? Esta ação não pode ser desfeita.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ ...btn, background: C.sa, color: C.tx }}>Cancelar</button>
        <button onClick={onConfirm} style={{ ...btn, background: C.dn, color: "#fff" }}>Excluir</button>
      </div>
    </Modal>
  );
}

export function Templates() {
  const { token } = useAuth();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState<Template | null>(null);
  const [toast, setToast] = useState<{ msg: string; type?: "ok" | "error" } | null>(null);

  const [hour, setHour] = useState("10");
  const [minute, setMinute] = useState("0");
  const [savingSettings, setSavingSettings] = useState(false);

  const { data: ts, isLoading, isError, refetch } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api<Template[]>("/templates", { token: token! }),
    enabled: !!token,
  });

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings", { token: token! }),
    enabled: !!token,
  });

  useEffect(() => {
    if (settings.data) {
      setHour(String(settings.data.defaultSendHour));
      setMinute(String(settings.data.defaultSendMinute));
    }
  }, [settings.data]);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await api("/settings", {
        method: "PUT",
        body: { defaultSendHour: parseInt(hour) || 10, defaultSendMinute: parseInt(minute) || 0 },
        token: token!,
      });
      setToast({ msg: "Configurações salvas" });
    } catch (e) { setToast({ msg: (e as Error).message, type: "error" }); }
    finally { setSavingSettings(false); }
  };

  const doDelete = async () => {
    if (!deleting) return;
    try {
      await api(`/templates/${deleting.id}`, { method: "DELETE", token: token! });
      setDeleting(null); refetch(); setToast({ msg: "Template excluído" });
    } catch (e) { setToast({ msg: (e as Error).message, type: "error" }); setDeleting(null); }
  };

  return (
    <div>
      <PageHeader title="Mensagem" />
      {isError ? (
        <ErrorState message="Falha ao carregar os templates." onRetry={() => refetch()} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isLoading
            ? <Card><p style={{ color: C.tm, textAlign: "center", fontSize: 13 }}>Carregando...</p></Card>
            : (ts ?? []).length === 0
              ? <Card><p style={{ color: C.tm, textAlign: "center", fontSize: 13 }}>Nenhum template cadastrado</p></Card>
              : (ts ?? []).map(t => (
                <Card key={t.id} style={{ cursor: "default" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</span>
                        {t.type && <Badge color={typeColor[t.type] || C.tm}>{typeLabel[t.type] || t.type}</Badge>}
                        {t.isDefault && <Badge color={C.ok}>Padrão</Badge>}
                        <Badge color={t.active ? C.ok : C.tm}>{t.active ? "Ativo" : "Inativo"}</Badge>
                      </div>
                      <div style={{ background: C.sa, borderRadius: 6, padding: "12px 14px", fontSize: 12, lineHeight: 1.7, color: C.tm, whiteSpace: "pre-wrap", border: "1px solid " + C.bd, fontFamily: "monospace" }}>
                        {t.body}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <ActionBtn icon="edit" title="Editar" color={C.pr} onClick={() => { setEditing(t); setModal(true); }} />
                      <ActionBtn icon="trash" title="Excluir" color={C.dn} onClick={() => setDeleting(t)} />
                    </div>
                  </div>
                </Card>
              ))}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <PageHeader title="Configurações de envio" />
        <div style={{ maxWidth: 480 }}>
          <Card>
            <SectionLabel>Horário padrão de envio</SectionLabel>
            <p style={{ fontSize: 12, color: C.tm, marginBottom: 16 }}>
              Horário padrão para envio dos lembretes quando não especificado na compra.
            </p>
            {settings.isError && (
              <div style={{ marginBottom: 16 }}>
                <ErrorState message="Falha ao carregar as configurações atuais." onRetry={() => settings.refetch()} />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Hora (0–23)</label>
                <input style={{ ...inp, width: 80, textAlign: "center" }} type="number" min="0" max="23" value={hour} onChange={e => setHour(e.target.value)} />
              </div>
              <span style={{ color: C.tm, fontSize: 20, marginTop: 20 }}>:</span>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Minuto (0–59)</label>
                <input style={{ ...inp, width: 80, textAlign: "center" }} type="number" min="0" max="59" value={minute} onChange={e => setMinute(e.target.value)} />
              </div>
              <div style={{ marginTop: 22, color: C.tm, fontSize: 13 }}>
                Brasília · {hour.padStart(2, "0")}:{minute.padStart(2, "0")}
              </div>
            </div>
            <button onClick={saveSettings} disabled={savingSettings} style={{ ...btn, background: C.pr, color: "#fff" }}>
              {savingSettings ? "Salvando..." : "Salvar configurações"}
            </button>
          </Card>
        </div>
      </div>

      <TplModal
        open={modal}
        onClose={() => setModal(false)}
        editing={editing}
        onOk={() => { refetch(); setModal(false); setToast({ msg: "Template atualizado" }); }}
      />
      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={doDelete}
        name={deleting?.name || ""}
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

function ActionBtn({ icon, title, color, onClick }: { icon: string; title: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{ padding: "7px 9px", borderRadius: 6, border: "none", cursor: "pointer", background: alpha(color, 8), color, display: "flex", alignItems: "center" }}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}
