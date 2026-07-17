import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { C, inp, btn } from "../lib/theme";

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
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: C.pr, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "#fff", fontSize: 22, fontWeight: 700 }}>F</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.01em" }}>Farma Tec</h1>
          <p style={{ color: C.tm, fontSize: 13, marginTop: 4 }}>Acesse sua conta</p>
        </div>
        <div style={{ background: C.sf, borderRadius: 8, border: "1px solid " + C.bd, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Email</label>
            <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@farmacia.local" onKeyDown={e => e.key === "Enter" && go()} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.tm, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Senha</label>
            <input style={inp} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••" onKeyDown={e => e.key === "Enter" && go()} />
          </div>
          {err && <div style={{ color: C.dn, fontSize: 12, marginBottom: 14, padding: "8px 12px", background: C.dn + "14", borderRadius: 6 }}>{err}</div>}
          <button onClick={go} disabled={loading} style={{ ...btn, width: "100%", justifyContent: "center", background: C.pr, color: "#fff", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
