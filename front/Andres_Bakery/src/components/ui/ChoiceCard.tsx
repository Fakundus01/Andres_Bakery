import type { ReactNode } from "react";

export function ChoiceCard({ active, icon, title, description, onClick }: { active: boolean; icon: ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={` border p-4 text-left transition ${active ? "border-borde bg-tinta text-crema " : "border-borde bg-superficie text-tinta-suave hover:border-borde hover:bg-superficie-alt"}`}>
      <div className="flex items-center gap-3">
        <span className={`inline-flex p-3 ${active ? "bg-superficie/10" : "bg-superficie-alt"}`}>{icon}</span>
        <div>
          <p className="font-display text-2xl font-semibold">{title}</p>
          <p className={`mt-2 text-sm leading-6 ${active ? "text-crema/75" : "text-tinta-tenue"}`}>{description}</p>
        </div>
      </div>
    </button>
  );
}
