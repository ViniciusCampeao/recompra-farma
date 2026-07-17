import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C, inp, btn } from "../lib/theme";
import { Card } from "../components/ui/Card";
import { Toast } from "../components/ui/Toast";
import { PageHeader, SectionLabel } from "../components/ui/PageHeader";

interface Settings {
  defaultSendHour: number;
  defaultSendMinute: number;
}

export function Settings() {
  const { token } = useAuth();
  const [hour, setHour] = useState("10");
  const [minute, setMinute] = useState("0");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: "ok" | "error" } | null>(null);

  useEffect(() => {
    api<Settings>("/settings", { token: token! })
      .then(s => { setHour(String(s.defaultSendHour)); setMinute(String(s.defaultSendMinute)); })
      .catch(() => {});
  }, [token]);

  const save = async () => {
    setLoading(true);
    try {
      await api("/settings", {
        method: "PUT",
        body: { defaultSendHour: parseInt(hour) || 10, defaultSendMinute: parseInt(minute) || 0 },
        token: token!,
      });
      setToast({ msg: "Configurações salvas" });
    } catch (e) { setToast({ msg: (e as Error).message, type: "error" }); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader title="Configurações" />
      <div style={{ maxWidth: 480 }}>
        <Card>
          <SectionLabel>Horário padrão de envio</SectionLabel>
          <p style={{ fontSize: 12, color: C.tm, marginBottom: 16 }}>
            Horário padrão para envio dos lembretes quando não especificado na compra.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Hora (0–23)</label>
              <input
                style={{ ...inp, width: 80, textAlign: "center" }}
                type="number" min="0" max="23"
                value={hour}
                onChange={e => setHour(e.target.value)}
              />
            </div>
            <span style={{ color: C.tm, fontSize: 20, marginTop: 20 }}>:</span>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Minuto (0–59)</label>
              <input
                style={{ ...inp, width: 80, textAlign: "center" }}
                type="number" min="0" max="59"
                value={minute}
                onChange={e => setMinute(e.target.value)}
              />
            </div>
            <div style={{ marginTop: 22, color: C.tm, fontSize: 13 }}>
              UTC · {hour.padStart(2, "0")}:{minute.padStart(2, "0")}
            </div>
          </div>
          <button onClick={save} disabled={loading} style={{ ...btn, background: C.pr, color: "#fff" }}>
            {loading ? "Salvando..." : "Salvar configurações"}
          </button>
        </Card>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
