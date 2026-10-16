import { getStatusTone } from "../../lib/format";

export function StatusPill({ status, compact = false }: { status: string; compact?: boolean }) {
  return <span className={`inline-flex items-center px-3 py-1 font-semibold ${compact ? "text-xs" : "text-sm"} ${getStatusTone(status)}`}>{status.replaceAll("_", " ")}</span>;
}
