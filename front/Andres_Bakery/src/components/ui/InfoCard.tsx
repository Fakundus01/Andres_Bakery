import type { ReactNode } from "react";

export function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="glass-panel p-5">
      <div className="inline-flex rounded-2xl bg-stone-900 p-3 text-white">{icon}</div>
      <h3 className="mt-4 font-display text-2xl font-semibold text-stone-950">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-stone-600">{text}</p>
    </div>
  );
}
