import type { Dispatch, SetStateAction } from "react";

export function StoryTab({
  aboutContent,
  setAboutContent,
  onSave,
}: {
  aboutContent: string;
  setAboutContent: Dispatch<SetStateAction<string>>;
  onSave: () => void;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="glass-panel p-6">
        <h3 className="font-display text-3xl font-semibold text-stone-950">Texto institucional</h3>
        <p className="mt-3 text-sm leading-6 text-stone-600">Editá la narrativa de la marca para que el home acompañe mejor el posicionamiento del ecommerce.</p>
        <textarea className="field mt-5 min-h-72" value={aboutContent} onChange={(event) => setAboutContent(event.target.value)} />
        <button className="btn-primary mt-4" type="button" onClick={onSave}>Guardar contenido</button>
      </div>
      <div className="glass-panel p-6">
        <h3 className="font-display text-3xl font-semibold text-stone-950">Preview editorial</h3>
        <div className="mt-5 rounded-[32px] bg-stone-900 p-6 text-stone-100">
          <p className="text-xs uppercase tracking-[0.32em] text-stone-400">Manifiesto</p>
          <p className="mt-4 font-display text-3xl font-semibold leading-tight">{aboutContent || "Tu historia de marca va a aparecer acá."}</p>
        </div>
      </div>
    </section>
  );
}
