import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C, inp, btn } from "../lib/theme";
import { Card } from "../components/ui/Card";

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const go = async () => {
    setErr(""); setLoading(true);
    try {
      const d = await api<{ access_token: string }>("/auth/login", { method: "POST", body: { email, password: pw } });
      login(d.access_token);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: 16 }}>
      <Card style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 4 }}>💊</div>
          <h1 style={{ fontSize: 24 }}>Recompra Farma</h1>
          <p style={{ color: C.tm, fontSize: 14, marginTop: 6 }}>Acesse sua conta</p>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, color: C.tm, marginBottom: 6 }}>Email</label>
          <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@farmacia.local" onKeyDown={e => e.key === "Enter" && go()} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, color: C.tm, marginBottom: 6 }}>Senha</label>
          <input style={inp} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••" onKeyDown={e => e.key === "Enter" && go()} />
        </div>
        {err && <div style={{ color: C.dn, fontSize: 13, marginBottom: 14 }}>{err}</div>}
        <button onClick={go} disabled={loading} style={{ ...btn, width: "100%", justifyContent: "center", background: C.pr, color: "#fff", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </Card>
    </div>
  );
}
