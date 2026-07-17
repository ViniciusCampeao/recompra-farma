import { useState } from "react";
import { C } from "../lib/theme";
import { Icon } from "./ui/Icon";
import { useAuth } from "../contexts/AuthContext";

const nav = [
  { k: "dash", l: "Painel", i: "home" },
  { k: "cust", l: "Clientes", i: "users" },
  { k: "purch", l: "Compras", i: "cart" },
  { k: "tpl", l: "Templates", i: "tpl" },
];

interface SidebarProps {
  active: string;
  onChange: (page: string) => void;
}

export function Sidebar({ active, onChange }: SidebarProps) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768);

  return (
    <div style={{ width: collapsed ? 64 : 220, minHeight: "100vh", background: C.sf, borderRight: "1px solid " + C.bd, display: "flex", flexDirection: "column", transition: "width .2s", flexShrink: 0 }}>
      <div
        style={{ padding: collapsed ? "20px 12px" : "20px 18px", borderBottom: "1px solid " + C.bd, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span style={{ fontSize: 22 }}>💊</span>
        {!collapsed && <span style={{ fontSize: 16, fontWeight: 700 }}>Recompra</span>}
      </div>
      <nav style={{ flex: 1, padding: "12px 8px" }}>
        {nav.map(n => {
          const a = active === n.k;
          return (
            <button
              key={n.k}
              onClick={() => onChange(n.k)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: collapsed ? "10px 12px" : "10px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: a ? C.pr + "20" : "transparent", color: a ? C.pr : C.tm, fontSize: 14, fontWeight: a ? 600 : 400, marginBottom: 4, textAlign: "left", transition: "background .15s" }}
            >
              <Icon name={n.i} size={20} />
              {!collapsed && n.l}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: collapsed ? "16px 8px" : "16px 14px", borderTop: "1px solid " + C.bd }}>
        {!collapsed && user && (
          <div style={{ fontSize: 13, color: C.tm, marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis" }}>
            {user.name || user.email}
          </div>
        )}
        <button
          onClick={logout}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: C.dn, fontSize: 13, textAlign: "left" }}
        >
          <Icon name="out" size={18} />
          {!collapsed && "Sair"}
        </button>
      </div>
    </div>
  );
}
