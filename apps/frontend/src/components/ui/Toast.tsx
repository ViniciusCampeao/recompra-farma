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
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 2000, padding: "14px 22px", borderRadius: 10, background: type === "error" ? C.dn : C.ok, color: "#fff", fontSize: 14, fontWeight: 500, boxShadow: "0 8px 30px rgba(0,0,0,.4)", animation: "fadeIn .2s ease" }}>
      {msg}
    </div>
  );
}
