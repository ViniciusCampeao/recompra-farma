import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C, inp } from "../lib/theme";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";
import { PageHeader } from "../components/ui/PageHeader";

interface MessageLog {
  id: string;
  phone: string;
  body: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  origin: string;
  createdAt: string;
  customer?: { name?: string };
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export function Messages() {
  const { token } = useAuth();
  const [msgs, setMsgs] = useState<MessageLog[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<MessageLog[]>("/messages", { token: token! })
      .then(m => { setMsgs(m); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const filtered = msgs.filter(m =>
    m.body.toLowerCase().includes(q.toLowerCase()) ||
    m.phone.includes(q) ||
    (m.customer?.name || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>
      <PageHeader title="Mensagens" />
      <div style={{ marginBottom: 12, position: "relative" }}>
        <input style={{ ...inp, paddingLeft: 36 }} placeholder="Buscar por número, nome ou mensagem..." value={q} onChange={e => setQ(e.target.value)} />
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.tm }}>
          <Icon name="search" size={15} />
        </span>
      </div>
      <Card style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && <div style={{ textAlign: "center", color: C.tm, fontSize: 13, padding: 20 }}>Carregando...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", color: C.tm, fontSize: 13, padding: 20 }}>
            {msgs.length === 0 ? "Nenhuma mensagem registrada" : "Nenhum resultado"}
          </div>
        )}
        {filtered.map(m => {
          const out = m.direction === "OUTBOUND";
          return (
            <div
              key={m.id}
              style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start" }}
            >
              <div style={{
                maxWidth: "72%",
                background: out ? C.pr : C.sf,
                color: out ? "#fff" : C.tx,
                border: out ? "none" : "1px solid " + C.bd,
                borderRadius: out ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                padding: "10px 14px",
                boxShadow: "0 1px 3px rgba(0,0,0,.06)",
              }}>
                {!out && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.pr, marginBottom: 4, letterSpacing: "0.04em" }}>
                    {m.customer?.name || m.phone}
                  </div>
                )}
                <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.body}</div>
                <div style={{ fontSize: 10, marginTop: 6, opacity: 0.65, textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                  {formatTime(m.createdAt)}
                  {out && (
                    <Icon name={m.status === "SENT" || m.status === "DELIVERED" || m.status === "READ" ? "check" : "clock"} size={11} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </Card>
    </div>
  );
}
