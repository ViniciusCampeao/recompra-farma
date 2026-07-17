import { C } from "../../lib/theme";
import { ReactNode } from "react";
import { Icon } from "./Icon";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, width = 520 }: ModalProps) {
  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.25)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.sf, borderRadius: 8, border: "1px solid " + C.bd, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,.12)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "0.01em" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.tm, cursor: "pointer" }}>
            <Icon name="x" size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
