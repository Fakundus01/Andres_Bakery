import { Clock3 } from "lucide-react";

export function LoadingPanel({ label }: { label: string }) {
  return <div className="pixel-panel flex items-center gap-3 p-5 text-sm text-tinta-suave"><Clock3 className="h-5 w-5 animate-spin-slow text-acento" />{label}</div>;
}
