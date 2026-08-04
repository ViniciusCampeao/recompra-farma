import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { C } from "../lib/theme";
import { Icon } from "./ui/Icon";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

interface NavItem { path: string; l: string; i: string; adminOnly?: boolean }

const nav: NavItem[] = [
  { path: "/painel",   l: "Painel",       i: "home" },
  { path: "/clientes", l: "Clientes",     i: "users" },
  { path: "/compras",  l: "Compras",      i: "cart" },
  { path: "/mensagem", l: "Mensagem",     i: "tpl" },
  { path: "/whatsapp", l: "WhatsApp",     i: "whatsapp" },
  { path: "/usuarios", l: "Usuários",     i: "userplus", adminOnly: true },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
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
            Autofarma
          </span>
        )}
      </div>

      <nav style={{ flex: 1, padding: "10px 6px" }}>
        {items.map(n => {
          const a = location.pathname === n.path;
          return (
            <button
              key={n.path}
              onClick={() => navigate(n.path)}
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
          onClick={toggle}
          title={collapsed ? (theme === "dark" ? "Tema claro" : "Tema escuro") : undefined}
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
            marginBottom: 2,
          }}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
          {!collapsed && (theme === "dark" ? "Tema claro" : "Tema escuro")}
        </button>
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
