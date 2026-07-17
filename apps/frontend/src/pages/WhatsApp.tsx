import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C, btn } from "../lib/theme";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";

type ConnState = "open" | "connecting" | "qrcode" | "disconnected" | "error" | "unknown" | "loading";

const stateLabel: Record<ConnState, string> = {
  open: "Conectado", connecting: "Conectando", qrcode: "Aguardando QR",
  disconnected: "Desconectado", error: "Erro", unknown: "Desconhecido", loading: "Carregando",
};
const stateColor: Record<ConnState, string> = {
  open: C.ok, connecting: C.wn, qrcode: C.wn, disconnected: C.dn, error: C.dn, unknown: C.tm, loading: C.tm,
};

export function WhatsApp() {
  const { token } = useAuth();
  const [state, setState] = useState<ConnState>("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [qrImg, setQrImg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type?: "ok" | "error" } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchState = async () => {
    try {
      const d = await api<{ state: string }>("/evolution/instance/connectionState/farmacia", { token: token! });
      const s = (d?.state || "unknown") as ConnState;
      setState(s);
      if (s === "open") { setQr(null); setQrImg(null); stopPoll(); }
    } catch {
      setState("error");
    }
  };

  const startPoll = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(fetchState, 5000);
  };

  const stopPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => {
    fetchState();
    return () => stopPoll();
  }, [token]);

  const connect = async () => {
    setState("connecting");
    try {
      const d = await api<{ code?: string; qrcode?: { base64?: string }; base64?: string }>("/evolution/instance/connect/farmacia", { token: token! });
      const b64 = d?.qrcode?.base64 || d?.base64;
      const code = d?.code;
      if (b64) { setQrImg(b64); setQr(null); }
      else if (code) { setQr(code); setQrImg(null); }
      setState("qrcode");
      startPoll();
    } catch (e) {
      setState("error");
      setToast({ msg: (e as Error).message, type: "error" });
    }
  };

  const disconnect = async () => {
    try {
      await api("/evolution/instance/logout/farmacia", { method: "DELETE", token: token! });
      setState("disconnected"); setQr(null); setQrImg(null); stopPoll();
      setToast({ msg: "Desconectado com sucesso" });
    } catch (e) { setToast({ msg: (e as Error).message, type: "error" }); }
  };

  const refresh = () => { fetchState(); };

  return (
    <div>
      <PageHeader title="WhatsApp" action={
        <button onClick={refresh} style={{ ...btn, background: C.sa, color: C.tm }}>
          <Icon name="ref" size={15} />Atualizar
        </button>
      } />

      <div style={{ display: "grid", gap: 16, maxWidth: 560 }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="whatsapp" size={22} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Instância: farmacia</span>
            </div>
            <Badge color={stateColor[state]}>{stateLabel[state]}</Badge>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {state !== "open" && (
              <button onClick={connect} style={{ ...btn, background: C.ok, color: "#fff" }}>
                <Icon name="link" size={15} />Gerar QR Code
              </button>
            )}
            {state === "open" && (
              <button onClick={disconnect} style={{ ...btn, background: C.dn, color: "#fff" }}>
                Desconectar
              </button>
            )}
          </div>
        </Card>

        {(qrImg || qr) && state !== "open" && (
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

        {state === "open" && (
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.ok }}>
              <Icon name="check" size={18} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>WhatsApp conectado e pronto para enviar mensagens.</span>
            </div>
          </Card>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
