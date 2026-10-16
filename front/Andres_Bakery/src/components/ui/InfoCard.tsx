import type { ReactNode } from "react";

export function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="pixel-panel p-5">
      <div className="inline-flex bg-tinta p-3 text-crema">{icon}</div>
      <h3 className="mt-4 font-display text-2xl font-semibold text-tinta">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-tinta-suave">{text}</p>
    </div>
  );
}
