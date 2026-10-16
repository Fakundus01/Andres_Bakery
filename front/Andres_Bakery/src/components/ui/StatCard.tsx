export function StatCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="pixel-panel p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-tinta-tenue">{title}</p>
      <p className="mt-3 font-display text-3xl font-semibold text-tinta">{value}</p>
      <p className="mt-2 text-sm text-tinta-suave">{detail}</p>
    </div>
  );
}
