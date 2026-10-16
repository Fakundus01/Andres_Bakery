import type { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-stone-700">
      <span>{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
