export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs uppercase tracking-[0.34em] text-stone-500">{eyebrow}</p>
      <h2 className="mt-3 font-display text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-stone-600 sm:text-lg">{description}</p>
    </div>
  );
}
