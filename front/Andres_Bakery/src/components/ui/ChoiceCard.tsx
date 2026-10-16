import type { ReactNode } from "react";

export function ChoiceCard({ active, icon, title, description, onClick }: { active: boolean; icon: ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-[28px] border p-4 text-left transition ${active ? "border-stone-950 bg-stone-950 text-white shadow-xl shadow-stone-950/10" : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50"}`}>
      <div className="flex items-center gap-3">
        <span className={`inline-flex rounded-2xl p-3 ${active ? "bg-white/10" : "bg-stone-100"}`}>{icon}</span>
        <div>
          <p className="font-display text-2xl font-semibold">{title}</p>
          <p className={`mt-2 text-sm leading-6 ${active ? "text-white/75" : "text-stone-500"}`}>{description}</p>
        </div>
      </div>
    </button>
  );
}
