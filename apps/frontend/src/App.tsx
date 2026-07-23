import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Customers } from "./pages/Customers";
import { Purchases } from "./pages/Purchases";
import { Templates } from "./pages/Templates";
import { WhatsApp } from "./pages/WhatsApp";
import { Users } from "./pages/Users";
import { Sidebar } from "./components/Sidebar";
import { C } from "./lib/theme";

function Shell() {
  const [page, setPage] = useState("dash");

  const pages: Record<string, JSX.Element> = {
    dash:     <Dashboard />,
    cust:     <Customers />,
    purch:    <Purchases />,
    tpl:      <Templates />,
    whatsapp: <WhatsApp />,
    users:    <Users />,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <Sidebar active={page} onChange={setPage} />
      <main style={{ flex: 1, padding: "24px 28px", overflowX: "hidden", maxWidth: "100%", minWidth: 0 }}>
        {pages[page] ?? <Dashboard />}
      </main>
    </div>
  );
}

function Root() {
  const { token } = useAuth();
  if (!token) return <Login />;
  return <Shell />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
