import { C, alpha } from "../../lib/theme";
import { Icon } from "./Icon";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const navBtn = (disabled: boolean) => ({
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: 30,
    height: 30,
    borderRadius: 6,
    border: "none",
    cursor: disabled ? "default" : "pointer",
    background: disabled ? "transparent" : alpha(C.pr, 8),
    color: disabled ? C.tm : C.pr,
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 4px", flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: C.tm }}>
        {from}–{to} de {total}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button disabled={page <= 1} onClick={() => onChange(page - 1)} style={navBtn(page <= 1)} title="Página anterior">
          <Icon name="chevronLeft" size={16} />
        </button>
        <span style={{ fontSize: 12, color: C.tm, minWidth: 64, textAlign: "center" }}>
          Página {page} de {pageCount}
        </span>
        <button disabled={page >= pageCount} onClick={() => onChange(page + 1)} style={navBtn(page >= pageCount)} title="Próxima página">
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
}
