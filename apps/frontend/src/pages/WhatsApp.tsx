import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C, btn, inp } from "../lib/theme";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";

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
// Tipos das respostas do Evolution API
// -----------------------------------------------------------------------------
interface Chat {
  remoteJid: string;
  // Evolution/Baileys às vezes trazem o número real num campo alternativo quando
  // o remoteJid é um @lid opaco (dispositivo vinculado). Consultamos todos eles.
  remoteJidAlt?: string;
  senderPn?: string;
  owner?: string;
  jid?: string;
  pushName?: string;
  name?: string;
  profilePicUrl?: string;
  lastMessage?: { message?: any; messageTimestamp?: number };
  updatedAt?: string;
}

interface EvoMessage {
  key: {
    id: string;
    remoteJid: string;
    remoteJidAlt?: string;
    senderPn?: string;
    fromMe: boolean;
  };
  message?: any;
  messageTimestamp?: number;
  pushName?: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
// Número puro (só dígitos), sem sufixo @s.whatsapp.net / @c.us — usado para
// agrupar e comparar contatos, já que o Evolution varia o sufixo do JID entre
// mensagens enviadas e recebidas.
const jidToPhone = (jid?: string) => (jid || "").replace(/[@:].*/, "").replace(/\D/g, "");
const isGroup = (jid?: string) => (jid || "").endsWith("@g.us");
const isLid = (jid?: string) => (jid || "").endsWith("@lid");

// Número canônico do contato. Um @lid é um identificador opaco (dispositivo
// vinculado) que NÃO é o telefone real, então preferimos qualquer campo
// alternativo que contenha o número de verdade. Se só houver o @lid, usamos ele
// mesmo como chave — melhor agrupar por algo estável do que espalhar a conversa.
const chatPhone = (c: {
  remoteJid?: string; remoteJidAlt?: string; senderPn?: string; owner?: string; jid?: string;
}) => {
  const candidates = [c.remoteJidAlt, c.senderPn, c.jid, c.owner, c.remoteJid];
  const real = candidates.find(v => v && !isLid(v) && jidToPhone(v).length >= 8);
  return jidToPhone(real || c.remoteJid);
};

const chatTitle = (c: Chat) => c.name || c.pushName || chatPhone(c);

function extractText(m: any): string {
  if (!m) return "";
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    (m.imageMessage ? "📷 Imagem" : "") ||
    (m.videoMessage ? "🎥 Vídeo" : "") ||
    (m.audioMessage ? "🎵 Áudio" : "") ||
    (m.documentMessage ? "📄 Documento" : "") ||
    (m.stickerMessage ? "Figurinha" : "") ||
    ""
  );
}

const fmtTime = (ts?: number) => {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};
const fmtDate = (ts?: number) => {
  if (!ts) return "";
  const d = new Date(ts * 1000);
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

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeJid, setActiveJid] = useState<string | null>(null);
  const [messages, setMessages] = useState<EvoMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // --- Conexão --------------------------------------------------------------
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

  const stopQrPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

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
      setState("disconnected"); setChats([]); setActiveJid(null); setMessages([]);
      setToast({ msg: "Desconectado com sucesso" });
    } catch (e) { setToast({ msg: (e as Error).message, type: "error" }); }
  };

  // --- Conversas ------------------------------------------------------------
  const loadChats = useCallback(async () => {
    if (state !== "open") return;
    setLoadingChats(true);
    try {
      const raw = await api<Chat[]>(`/evolution/chat/findChats/${INSTANCE}`, { method: "POST", body: {}, token: token! });
      // DEBUG: inspeciona o formato bruto (remover depois de resolver o @lid)
      console.log("[WA] findChats RAW:", raw);
      // Desduplica por número: o Evolution pode retornar o mesmo contato com
      // sufixos de JID diferentes (@s.whatsapp.net / @c.us). Mantém o chat com
      // a mensagem mais recente e descarta os duplicados.
      const byPhone = new Map<string, Chat>();
      for (const c of Array.isArray(raw) ? raw : []) {
        if (!c.remoteJid || isGroup(c.remoteJid) || c.remoteJid === "status@broadcast") continue;
        const phone = chatPhone(c);
        if (!phone) continue;
        const prev = byPhone.get(phone);
        const t = c.lastMessage?.messageTimestamp || 0;
        const tPrev = prev?.lastMessage?.messageTimestamp || 0;
        // Mantém o chat mais recente, mas prefere o que tem número real (não @lid)
        // como "dono" da entrada para o título/avatar ficarem corretos.
        const prevIsLid = prev ? isLid(prev.remoteJid) : true;
        const curIsLid = isLid(c.remoteJid);
        if (!prev || t >= tPrev || (prevIsLid && !curIsLid)) byPhone.set(phone, c);
      }
      const list = [...byPhone.values()].sort((a, b) =>
        (b.lastMessage?.messageTimestamp || 0) - (a.lastMessage?.messageTimestamp || 0));
      setChats(list);
    } catch (e) {
      setToast({ msg: "Falha ao carregar conversas: " + (e as Error).message, type: "error" });
    } finally {
      setLoadingChats(false);
    }
  }, [state, token]);

  useEffect(() => {
    if (state === "open") loadChats();
  }, [state, loadChats]);

  // Reúne enviadas + recebidas numa só conversa. As enviadas ficam sob o número
  // real (@s.whatsapp.net / @c.us); as recebidas de dispositivo vinculado ficam
  // sob o @lid. Buscamos TODOS os JIDs conhecidos do contato e mesclamos.
  const loadMessages = useCallback(async (phone: string, extraJids: string[] = []) => {
    setLoadingMsgs(true);
    try {
      const jids = Array.from(new Set([
        `${phone}@s.whatsapp.net`,
        `${phone}@c.us`,
        ...extraJids.filter(Boolean),
      ]));
      const results = await Promise.all(jids.map(jid =>
        api<{ messages?: { records?: EvoMessage[] } } | EvoMessage[]>(
          `/evolution/chat/findMessages/${INSTANCE}`,
          { method: "POST", body: { where: { key: { remoteJid: jid } } }, token: token! })
          .then(r => (Array.isArray(r) ? r : (r?.messages?.records || [])))
          .catch(() => [] as EvoMessage[])
      ));
      // Mescla e desduplica por id da mensagem
      const seen = new Set<string>();
      const merged: EvoMessage[] = [];
      for (const rec of results.flat()) {
        const id = rec.key?.id;
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        merged.push(rec);
      }
      merged.sort((a, b) => (a.messageTimestamp || 0) - (b.messageTimestamp || 0));
      setMessages(merged);
    } catch (e) {
      setToast({ msg: "Falha ao carregar mensagens: " + (e as Error).message, type: "error" });
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }, [token]);

  // JIDs "extras" do contato ativo além do número puro — inclui o @lid e demais
  // variantes que o Evolution possa ter guardado, para não perder mensagens.
  const activeExtraJids = useCallback((phone: string) => {
    const jids = new Set<string>();
    for (const c of chats) {
      if (chatPhone(c) !== phone) continue;
      for (const v of [c.remoteJid, c.remoteJidAlt, c.senderPn, c.jid]) {
        if (v && v.includes("@")) jids.add(v);
      }
    }
    return [...jids];
  }, [chats]);

  const openChat = (c: Chat) => {
    const phone = chatPhone(c);
    setActiveJid(phone);
    setMessages([]);
    loadMessages(phone, activeExtraJids(phone));
  };

  // Auto-refresh das mensagens do chat aberto a cada 8s
  useEffect(() => {
    if (!activeJid || state !== "open") return;
    const t = setInterval(() => loadMessages(activeJid, activeExtraJids(activeJid)), 8000);
    return () => clearInterval(t);
  }, [activeJid, state, loadMessages, activeExtraJids]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !activeJid || sending) return;
    setSending(true);
    try {
      await api(`/evolution/message/sendText/${INSTANCE}`, {
        method: "POST",
        body: { number: activeJid, text },
        token: token!,
      });
      setDraft("");
      // Otimista: recarrega em seguida
      setTimeout(() => loadMessages(activeJid, activeExtraJids(activeJid)), 600);
    } catch (e) {
      setToast({ msg: "Falha ao enviar: " + (e as Error).message, type: "error" });
    } finally {
      setSending(false);
    }
  };

  const filteredChats = chats.filter(c =>
    chatTitle(c).toLowerCase().includes(search.toLowerCase()) ||
    chatPhone(c).includes(search));

  const activeChat = chats.find(c => chatPhone(c) === activeJid);

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
          <button onClick={loadChats} style={{ ...btn, background: C.sa, color: C.tm }}>
            <Icon name="ref" size={15} />Atualizar
          </button>
          <button onClick={disconnect} style={{ ...btn, background: C.dn + "12", color: C.dn }}>
            Desconectar
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
            {loadingChats && chats.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", color: C.tm, fontSize: 12 }}>Carregando conversas...</div>
            )}
            {!loadingChats && chats.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", color: C.tm, fontSize: 12 }}>Nenhuma conversa ainda</div>
            )}
            {filteredChats.map(c => {
              const active = chatPhone(c) === activeJid;
              const last = extractText(c.lastMessage?.message);
              return (
                <div
                  key={c.remoteJid}
                  onClick={() => openChat(c)}
                  style={{
                    padding: "11px 14px",
                    cursor: "pointer",
                    borderBottom: "1px solid " + C.bd,
                    background: active ? C.pr + "0e" : "transparent",
                    borderLeft: active ? "3px solid " + C.pr : "3px solid transparent",
                    display: "flex", gap: 10, alignItems: "center",
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    background: C.sa, display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.tm, fontWeight: 700, fontSize: 13, overflow: "hidden",
                  }}>
                    {c.profilePicUrl
                      ? <img src={c.profilePicUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : chatTitle(c).charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.tx, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {chatTitle(c)}
                      </span>
                      <span style={{ fontSize: 10, color: C.tm, flexShrink: 0 }}>
                        {fmtDate(c.lastMessage?.messageTimestamp)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: C.tm, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                      {last || "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- Conversa --- */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg }}>
          {!activeJid ? (
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
                  {activeChat ? chatTitle(activeChat).charAt(0).toUpperCase() : "?"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{activeChat ? chatTitle(activeChat) : activeJid}</div>
                  <div style={{ fontSize: 11, color: C.tm }}>{activeJid}</div>
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
                  const out = m.key?.fromMe;
                  const text = extractText(m.message);
                  if (!text) return null;
                  return (
                    <div key={m.key.id} style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "70%",
                        background: out ? C.pr : C.sf,
                        color: out ? "#fff" : C.tx,
                        border: out ? "none" : "1px solid " + C.bd,
                        borderRadius: out ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                        padding: "8px 12px",
                        boxShadow: "0 1px 2px rgba(0,0,0,.05)",
                      }}>
                        <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{text}</div>
                        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6, textAlign: "right" }}>
                          {fmtTime(m.messageTimestamp)}
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

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
