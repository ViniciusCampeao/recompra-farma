import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C, btn, inp, alpha } from "../lib/theme";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";

const INSTANCE = "farmacia";

type ConnState = "open" | "connecting" | "qrcode" | "disconnected" | "error" | "unknown" | "loading";

const stateLabel: Record<ConnState, string> = {
  open: "Conectado", connecting: "Conectando", qrcode: "Aguardando QR",
  disconnected: "Desconectado", error: "Erro", unknown: "Desconhecido", loading: "Carregando",
};
const stateColor: Record<ConnState, string> = {
  open: C.ok, connecting: C.wn, qrcode: C.wn, disconnected: C.dn, error: C.dn, unknown: C.tm, loading: C.tm,
};

// -----------------------------------------------------------------------------
// Tipos — vindos do backend (MessageLog), não do Evolution.
// O backend já normaliza o telefone (E.164) e unifica enviadas + recebidas,
// então não lidamos com os JIDs @lid opacos aqui.
// -----------------------------------------------------------------------------
interface Conversation {
  phone: string;
  count: number;
  name: string | null;
  customerId: string | null;
  lastBody: string;
  lastDirection: "INBOUND" | "OUTBOUND";
  lastAt: string | null;
}

interface Message {
  id: string;
  phone: string;
  body: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  createdAt: string;
  customer?: { id: string; name?: string; phone: string } | null;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
// Formata E.164 BR ("5514999660536") para "(14) 99966-0536".
const fmtPhone = (e164: string) => {
  const d = (e164 || "").replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) return `(${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12 && d.startsWith("55")) return `(${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return e164;
};
const convTitle = (c: Conversation) => c.name || fmtPhone(c.phone);

const fmtTime = (iso?: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};
const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Hoje";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export function WhatsApp() {
  const { token } = useAuth();
  const [state, setState] = useState<ConnState>("loading");
  const [qrImg, setQrImg] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type?: "ok" | "error" } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // --- Conexão --------------------------------------------------------------
  const stopQrPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const fetchState = useCallback(async () => {
    try {
      const d = await api<{ instance?: { state?: string }; state?: string }>(
        `/evolution/instance/connectionState/${INSTANCE}`, { token: token! });
      const s = (d?.instance?.state || d?.state || "unknown") as ConnState;
      setState(s);
      if (s === "open") { setQr(null); setQrImg(null); stopQrPoll(); }
    } catch {
      setState("error");
    }
  }, [token]);

  useEffect(() => { fetchState(); return () => stopQrPoll(); }, [fetchState]);

  const connect = async () => {
    setState("connecting");
    try {
      const d = await api<{ code?: string; qrcode?: { base64?: string }; base64?: string; pairingCode?: string }>(
        `/evolution/instance/connect/${INSTANCE}`, { token: token! });
      const b64 = d?.qrcode?.base64 || d?.base64;
      const code = d?.code || d?.pairingCode;
      if (b64) { setQrImg(b64); setQr(null); }
      else if (code) { setQr(code); setQrImg(null); }
      setState("qrcode");
      if (!pollRef.current) pollRef.current = setInterval(fetchState, 5000);
    } catch (e) {
      setState("error");
      setToast({ msg: (e as Error).message, type: "error" });
    }
  };

  const disconnect = async () => {
    try {
      await api(`/evolution/instance/logout/${INSTANCE}`, { method: "DELETE", token: token! });
      setState("disconnected"); setConvs([]); setActivePhone(null); setMessages([]);
      setToast({ msg: "Sessão encerrada" });
    } catch (e) { setToast({ msg: (e as Error).message, type: "error" }); }
  };

  const wipeData = async () => {
    setConfirmWipe(false);
    try {
      const r = await api<{ deleted: number }>("/messages", { method: "DELETE", token: token! });
      setConvs([]); setActivePhone(null); setMessages([]);
      setToast({ msg: `${r.deleted} mensagens apagadas do banco` });
    } catch (e) { setToast({ msg: (e as Error).message, type: "error" }); }
  };

  // --- Conversas (do banco) -------------------------------------------------
  const loadConvs = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const list = await api<Conversation[]>("/messages/conversations", { token: token! });
      setConvs(Array.isArray(list) ? list : []);
    } catch (e) {
      setToast({ msg: "Falha ao carregar conversas: " + (e as Error).message, type: "error" });
    } finally {
      setLoadingConvs(false);
    }
  }, [token]);

  useEffect(() => {
    if (state !== "open") return;
    loadConvs();
    const t = setInterval(loadConvs, 15000);
    return () => clearInterval(t);
  }, [state, loadConvs]);

  const loadMessages = useCallback(async (phone: string) => {
    setLoadingMsgs(true);
    try {
      const list = await api<Message[]>(`/messages?phone=${encodeURIComponent(phone)}`, { token: token! });
      setMessages(Array.isArray(list) ? list : []);
    } catch (e) {
      setToast({ msg: "Falha ao carregar mensagens: " + (e as Error).message, type: "error" });
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }, [token]);

  const openChat = (phone: string) => {
    setActivePhone(phone);
    setMessages([]);
    loadMessages(phone);
  };

  // Auto-refresh das mensagens do chat aberto a cada 8s
  useEffect(() => {
    if (!activePhone || state !== "open") return;
    const t = setInterval(() => loadMessages(activePhone), 8000);
    return () => clearInterval(t);
  }, [activePhone, state, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !activePhone || sending) return;
    setSending(true);
    try {
      const log = await api<Message>("/messages/send", {
        method: "POST",
        body: { phone: activePhone, text },
        token: token!,
      });
      setDraft("");
      // Otimista: acrescenta na hora e recarrega em seguida
      setMessages(m => [...m, log]);
      loadConvs();
    } catch (e) {
      setToast({ msg: "Falha ao enviar: " + (e as Error).message, type: "error" });
    } finally {
      setSending(false);
    }
  };

  const filteredConvs = convs.filter(c =>
    convTitle(c).toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search.replace(/\D/g, "")));

  const activeConv = convs.find(c => c.phone === activePhone);

  // ---------------------------------------------------------------------------
  // Render: DESCONECTADO → QR
  // ---------------------------------------------------------------------------
  if (state !== "open") {
    return (
      <div>
        <PageHeader title="WhatsApp" action={
          <button onClick={fetchState} style={{ ...btn, background: C.sa, color: C.tm }}>
            <Icon name="ref" size={15} />Atualizar
          </button>
        } />
        <div style={{ display: "grid", gap: 16, maxWidth: 560 }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="whatsapp" size={22} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Instância: {INSTANCE}</span>
              </div>
              <Badge color={stateColor[state]}>{stateLabel[state]}</Badge>
            </div>
            <button onClick={connect} style={{ ...btn, background: C.ok, color: "#fff" }}>
              <Icon name="link" size={15} />Gerar QR Code
            </button>
            <div style={{ display: "flex", gap: 8, marginTop: 12, borderTop: "1px solid " + C.bd, paddingTop: 12, flexWrap: "wrap" }}>
              <button onClick={disconnect} style={{ ...btn, background: C.sa, color: C.tm }}>
                <Icon name="out" size={15} />Sair da sessão
              </button>
              <button onClick={() => setConfirmWipe(true)} style={{ ...btn, background: alpha(C.dn, 7), color: C.dn }}>
                <Icon name="trash" size={15} />Apagar dados
              </button>
            </div>
            <p style={{ fontSize: 11, color: C.tm, marginTop: 10, lineHeight: 1.6 }}>
              <strong>Sair da sessão</strong> desconecta a conta atual do WhatsApp. <strong>Apagar dados</strong> remove todas as conversas salvas no banco — use antes de conectar outro número.
            </p>
          </Card>

          {(qrImg || qr) && (
            <Card>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.tm, marginBottom: 14 }}>
                  Escaneie o QR Code com o WhatsApp
                </div>
                {qrImg ? (
                  <img
                    src={qrImg.startsWith("data:") ? qrImg : `data:image/png;base64,${qrImg}`}
                    alt="QR Code"
                    style={{ width: 220, height: 220, borderRadius: 8, border: "1px solid " + C.bd }}
                  />
                ) : (
                  <div style={{ fontFamily: "monospace", fontSize: 10, wordBreak: "break-all", background: C.sa, padding: 16, borderRadius: 8, color: C.tm, border: "1px solid " + C.bd }}>
                    {qr}
                  </div>
                )}
                <div style={{ marginTop: 12, fontSize: 12, color: C.tm }}>
                  <Icon name="ref" size={13} /> Verificando automaticamente a cada 5s...
                </div>
              </div>
            </Card>
          )}
        </div>
        <WipeModal open={confirmWipe} onClose={() => setConfirmWipe(false)} onConfirm={wipeData} />
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: CONECTADO → tela de conversas (contatos | chat)
  // ---------------------------------------------------------------------------
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: "0.05em", textTransform: "uppercase", color: C.tm }}>WhatsApp</h1>
          <Badge color={C.ok}>Conectado</Badge>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadConvs} style={{ ...btn, background: C.sa, color: C.tm }}>
            <Icon name="ref" size={15} />Atualizar
          </button>
          <button onClick={() => setConfirmWipe(true)} style={{ ...btn, background: C.sa, color: C.tm }}>
            <Icon name="trash" size={15} />Apagar dados
          </button>
          <button onClick={disconnect} style={{ ...btn, background: alpha(C.dn, 7), color: C.dn }}>
            <Icon name="out" size={15} />Sair da sessão
          </button>
        </div>
      </div>

      <Card style={{ flex: 1, padding: 0, overflow: "hidden", display: "flex" }}>
        {/* --- Lista de conversas --- */}
        <div style={{ width: 300, minWidth: 260, borderRight: "1px solid " + C.bd, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 12, borderBottom: "1px solid " + C.bd, position: "relative" }}>
            <input
              style={{ ...inp, paddingLeft: 34, fontSize: 12 }}
              placeholder="Buscar conversa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span style={{ position: "absolute", left: 22, top: "50%", transform: "translateY(-50%)", color: C.tm }}>
              <Icon name="search" size={14} />
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loadingConvs && convs.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", color: C.tm, fontSize: 12 }}>Carregando conversas...</div>
            )}
            {!loadingConvs && convs.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", color: C.tm, fontSize: 12 }}>Nenhuma conversa ainda</div>
            )}
            {filteredConvs.map(c => {
              const active = c.phone === activePhone;
              return (
                <div
                  key={c.phone}
                  onClick={() => openChat(c.phone)}
                  style={{
                    padding: "11px 14px",
                    cursor: "pointer",
                    borderBottom: "1px solid " + C.bd,
                    background: active ? alpha(C.pr, 5) : "transparent",
                    borderLeft: active ? "3px solid " + C.pr : "3px solid transparent",
                    display: "flex", gap: 10, alignItems: "center",
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    background: C.sa, display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.tm, fontWeight: 700, fontSize: 13, overflow: "hidden",
                  }}>
                    {convTitle(c).charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.tx, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {convTitle(c)}
                      </span>
                      <span style={{ fontSize: 10, color: C.tm, flexShrink: 0 }}>
                        {fmtDate(c.lastAt)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.tm, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                      {c.lastDirection === "OUTBOUND" ? "Você: " : ""}{c.lastBody || "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- Conversa --- */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
          {!activePhone ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.tm, gap: 10 }}>
              <Icon name="chat" size={40} />
              <span style={{ fontSize: 13 }}>Selecione uma conversa para ver as mensagens</span>
            </div>
          ) : (
            <>
              {/* Header da conversa */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid " + C.bd, background: C.sf, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", background: C.sa,
                  display: "flex", alignItems: "center", justifyContent: "center", color: C.tm, fontWeight: 700, fontSize: 12,
                }}>
                  {(activeConv ? convTitle(activeConv) : fmtPhone(activePhone)).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{activeConv ? convTitle(activeConv) : fmtPhone(activePhone)}</div>
                  <div style={{ fontSize: 11, color: C.tm }}>{fmtPhone(activePhone)}</div>
                </div>
              </div>

              {/* Mensagens */}
              <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {loadingMsgs && messages.length === 0 && (
                  <div style={{ textAlign: "center", color: C.tm, fontSize: 12, padding: 20 }}>Carregando...</div>
                )}
                {!loadingMsgs && messages.length === 0 && (
                  <div style={{ textAlign: "center", color: C.tm, fontSize: 12, padding: 20 }}>Sem mensagens nesta conversa</div>
                )}
                {messages.map(m => {
                  const out = m.direction === "OUTBOUND";
                  return (
                    <div key={m.id} style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "70%",
                        background: out ? C.pr : C.sf,
                        color: out ? "#fff" : C.tx,
                        border: out ? "none" : "1px solid " + C.bd,
                        borderRadius: out ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                        padding: "8px 12px",
                        boxShadow: "0 1px 2px rgba(0,0,0,.05)",
                      }}>
                        <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
                        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6, textAlign: "right", display: "flex", gap: 5, justifyContent: "flex-end", alignItems: "center" }}>
                          {fmtTime(m.createdAt)}
                          {out && (
                            <Icon name={m.status === "FAILED" ? "clock" : "check"} size={11} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Caixa de envio */}
              <div style={{ padding: 12, borderTop: "1px solid " + C.bd, background: C.sf, display: "flex", gap: 8 }}>
                <input
                  style={{ ...inp, flex: 1 }}
                  placeholder="Digite uma mensagem..."
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  disabled={sending}
                />
                <button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  style={{ ...btn, background: C.pr, color: "#fff", opacity: sending || !draft.trim() ? 0.5 : 1 }}
                >
                  <Icon name="send" size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      </Card>

      <WipeModal open={confirmWipe} onClose={() => setConfirmWipe(false)} onConfirm={wipeData} />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function WipeModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Apagar dados das conversas" width={400}>
      <p style={{ color: C.tm, fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
        Isso remove <strong>todas as conversas salvas no banco</strong> (enviadas e recebidas). Não afeta o WhatsApp em si, só o histórico guardado aqui. Esta ação não pode ser desfeita.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ ...btn, background: C.sa, color: C.tx }}>Cancelar</button>
        <button onClick={onConfirm} style={{ ...btn, background: C.dn, color: "#fff" }}>Apagar tudo</button>
      </div>
    </Modal>
  );
}
