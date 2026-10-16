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
      <div className="pixel-panel p-6">
        <h3 className="font-display text-3xl font-semibold text-tinta">Texto institucional</h3>
        <p className="mt-3 text-sm leading-6 text-tinta-suave">Editá la narrativa de la marca para que el home acompañe mejor el posicionamiento del ecommerce.</p>
        <textarea className="field mt-5 min-h-72" value={aboutContent} onChange={(event) => setAboutContent(event.target.value)} />
        <button className="btn-primary mt-4" type="button" onClick={onSave}>Guardar contenido</button>
      </div>
      <div className="pixel-panel p-6">
        <h3 className="font-display text-3xl font-semibold text-tinta">Preview editorial</h3>
        <div className="mt-5 bg-tinta p-6 text-crema">
          <p className="text-xs uppercase tracking-[0.32em] text-tinta-tenue">Manifiesto</p>
          <p className="mt-4 font-display text-3xl font-semibold leading-tight">{aboutContent || "Tu historia de marca va a aparecer acá."}</p>
        </div>
      </div>
    </section>
  );
}
