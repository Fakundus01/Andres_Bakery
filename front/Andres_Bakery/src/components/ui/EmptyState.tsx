import { Package } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <section className="pixel-panel mx-auto max-w-2xl p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center bg-tinta text-crema"><Package className="h-7 w-7" /></div>
      <h2 className="mt-5 font-display text-3xl font-semibold text-tinta">{title}</h2>
      <p className="mt-3 text-base leading-7 text-tinta-suave">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </section>
  );
}
