import { useState } from "react";
import { C } from "../lib/theme";
import { Icon } from "./ui/Icon";
import { useAuth } from "../contexts/AuthContext";

interface NavItem { k: string; l: string; i: string; adminOnly?: boolean }

const nav: NavItem[] = [
  { k: "dash",     l: "Painel",       i: "home" },
  { k: "cust",     l: "Clientes",     i: "users" },
  { k: "purch",    l: "Compras",      i: "cart" },
  { k: "tpl",      l: "Templates",    i: "tpl" },
  { k: "whatsapp", l: "WhatsApp",     i: "whatsapp" },
  { k: "settings", l: "Configurações",i: "gear" },
  { k: "users",    l: "Usuários",     i: "userplus", adminOnly: true },
];

interface SidebarProps {
  active: string;
  onChange: (page: string) => void;
}

export function Sidebar({ active, onChange }: SidebarProps) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(window.innerWidth < 900);
  const isAdmin = (user as any)?.role === "ADMIN";

  const items = nav.filter(n => !n.adminOnly || isAdmin);

  return (
    <div style={{
      width: collapsed ? 56 : 210,
      minHeight: "100vh",
      background: C.sb,
      display: "flex",
      flexDirection: "column",
      transition: "width .2s",
      flexShrink: 0,
    }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: collapsed ? "18px 0" : "18px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>＋</span>
        {!collapsed && (
          <span style={{ color: C.sbt, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Farma Tec
          </span>
        )}
      </div>

      <nav style={{ flex: 1, padding: "10px 6px" }}>
        {items.map(n => {
          const a = active === n.k;
          return (
            <button
              key={n.k}
              onClick={() => onChange(n.k)}
              title={collapsed ? n.l : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                width: "100%",
                padding: collapsed ? "9px 0" : "9px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: a ? C.sba : "transparent",
                color: a ? C.sbt : C.sbm,
                fontSize: 12,
                fontWeight: a ? 600 : 400,
                letterSpacing: "0.03em",
                marginBottom: 2,
                textAlign: "left",
                transition: "background .12s, color .12s",
              }}
            >
              <Icon name={n.i} size={17} />
              {!collapsed && n.l}
            </button>
          );
        })}
      </nav>

      <div style={{
        padding: collapsed ? "12px 6px" : "12px 10px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}>
        {!collapsed && user && (
          <div style={{ fontSize: 11, color: C.sbm, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
            {user.name || user.email}
          </div>
        )}
        <button
          onClick={logout}
          title={collapsed ? "Sair" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 8,
            width: "100%",
            padding: "8px 6px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: C.sbm,
            fontSize: 12,
            textAlign: "left",
          }}
        >
          <Icon name="out" size={16} />
          {!collapsed && "Sair"}
        </button>
      </div>
    </div>
  );
}
