import { Clock3 } from "lucide-react";

export function LoadingPanel({ label }: { label: string }) {
  return <div className="glass-panel flex items-center gap-3 p-5 text-sm text-stone-600"><Clock3 className="h-5 w-5 animate-spin-slow text-orange-500" />{label}</div>;
}
