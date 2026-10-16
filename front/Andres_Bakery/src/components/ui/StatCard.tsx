export function StatCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="glass-panel p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-stone-500">{title}</p>
      <p className="mt-3 font-display text-3xl font-semibold text-stone-950">{value}</p>
      <p className="mt-2 text-sm text-stone-600">{detail}</p>
    </div>
  );
}
