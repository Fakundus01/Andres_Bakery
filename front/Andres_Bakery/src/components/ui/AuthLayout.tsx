import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export function AuthLayout({ eyebrow, title, description, alternate, children }: { eyebrow: string; title: string; description: string; alternate: ReactNode; children: ReactNode }) {
  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="glass-panel flex flex-col justify-between p-7">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{eyebrow}</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-stone-950">{title}</h1>
          <p className="mt-4 text-base leading-7 text-stone-600">{description}</p>
        </div>
        <div className="mt-8 inline-flex items-center gap-2 text-sm text-stone-500"><ShieldCheck className="h-4 w-4" />{alternate}</div>
      </div>
      <div className="glass-panel p-7">{children}</div>
    </div>
  );
}
