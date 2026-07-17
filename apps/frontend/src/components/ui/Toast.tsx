import { useEffect } from "react";
import { C } from "../../lib/theme";

interface ToastProps {
  msg: string;
  type?: "ok" | "error";
  onClose: () => void;
}

export function Toast({ msg, type = "ok", onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 2000, padding: "12px 18px", borderRadius: 6, background: type === "error" ? C.dn : C.ok, color: "#fff", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,.15)", animation: "fadeIn .2s ease", letterSpacing: "0.02em" }}>
      {msg}
    </div>
  );
}
