import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Customers } from "./pages/Customers";
import { Purchases } from "./pages/Purchases";
import { Templates } from "./pages/Templates";
import { WhatsApp } from "./pages/WhatsApp";
import { Users } from "./pages/Users";
import { Sidebar } from "./components/Sidebar";
import { C } from "./lib/theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function Shell() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === "ADMIN";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "24px 28px", overflowX: "hidden", maxWidth: "100%", minWidth: 0 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/painel" replace />} />
          <Route path="/painel" element={<Dashboard />} />
          <Route path="/clientes" element={<Customers />} />
          <Route path="/compras" element={<Purchases />} />
          <Route path="/mensagem" element={<Templates />} />
          <Route path="/whatsapp" element={<WhatsApp />} />
          {isAdmin && <Route path="/usuarios" element={<Users />} />}
          <Route path="*" element={<Navigate to="/painel" replace />} />
        </Routes>
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Root />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
