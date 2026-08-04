import { C, btn, alpha } from "../../lib/theme";
import { Icon } from "./Icon";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        padding: "14px 16px",
        borderRadius: 8,
        background: alpha(C.dn, 7),
        border: "1px solid " + alpha(C.dn, 20),
        color: C.dn,
        fontSize: 13,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="alert" size={16} />
        <span>{message || "Não foi possível carregar os dados."}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} style={{ ...btn, background: C.dn, color: "#fff", padding: "6px 12px" }}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
