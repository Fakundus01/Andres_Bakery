// OJO: esta pestaña se jubila en T3. ADR-001 fusiona Recipe dentro de Product.
import type { Dispatch, FormEvent, SetStateAction } from "react";

import { Field, StatusPill } from "../../components/ui";
import { heroFallback } from "../../lib/constants";
import type { Recipe } from "../../lib/types";
import type { RecipeForm } from "../../lib/ui-types";

export function RecipesTab({
  recipes,
  recipeForm,
  setRecipeForm,
  editingRecipeId,
  setEditingRecipeId,
  onSubmit,
  onReset,
  onDelete,
}: {
  recipes: Recipe[];
  recipeForm: RecipeForm;
  setRecipeForm: Dispatch<SetStateAction<RecipeForm>>;
  editingRecipeId: number | null;
  setEditingRecipeId: Dispatch<SetStateAction<number | null>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  onDelete: (recipeId: number) => void;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
      <form className="glass-panel space-y-4 p-6" onSubmit={onSubmit}>
        <h3 className="font-display text-3xl font-semibold text-stone-950">{editingRecipeId ? "Editar receta" : "Nueva receta"}</h3>
        <Field label="Título"><input className="field" value={recipeForm.title} onChange={(event) => setRecipeForm((current) => ({ ...current, title: event.target.value }))} required /></Field>
        <Field label="Resumen"><textarea className="field min-h-24" value={recipeForm.summary} onChange={(event) => setRecipeForm((current) => ({ ...current, summary: event.target.value }))} required /></Field>
        <Field label="Ingredientes"><textarea className="field min-h-24" value={recipeForm.ingredients} onChange={(event) => setRecipeForm((current) => ({ ...current, ingredients: event.target.value }))} required /></Field>
        <Field label="Pasos"><textarea className="field min-h-32" value={recipeForm.steps} onChange={(event) => setRecipeForm((current) => ({ ...current, steps: event.target.value }))} required /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Categoría"><input className="field" value={recipeForm.category} onChange={(event) => setRecipeForm((current) => ({ ...current, category: event.target.value }))} /></Field>
          <Field label="Estado"><select className="field" value={recipeForm.status} onChange={(event) => setRecipeForm((current) => ({ ...current, status: event.target.value }))}><option value="published">Publicado</option><option value="draft">Borrador</option></select></Field>
        </div>
        <Field label="Imagen"><input className="field" value={recipeForm.image_url} onChange={(event) => setRecipeForm((current) => ({ ...current, image_url: event.target.value }))} placeholder="https://..." /></Field>
        <div className="flex flex-wrap gap-3"><button className="btn-primary" type="submit">{editingRecipeId ? "Guardar cambios" : "Publicar receta"}</button><button className="btn-secondary" type="button" onClick={onReset}>Limpiar</button></div>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {recipes.map((recipe) => (
          <article key={recipe.id} className="glass-panel overflow-hidden p-0">
            <img src={recipe.image_url || heroFallback[1].image} alt={recipe.title} className="h-44 w-full object-cover" />
            <div className="p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">{recipe.category}</p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-stone-950">{recipe.title}</h3>
              <p className="mt-3 text-sm leading-6 text-stone-600">{recipe.summary}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <StatusPill status={recipe.status} compact />
                <div className="flex gap-2">
                  <button className="btn-secondary" type="button" onClick={() => { setEditingRecipeId(recipe.id); setRecipeForm({ title: recipe.title, summary: recipe.summary, ingredients: recipe.ingredients, steps: recipe.steps, image_url: recipe.image_url ?? "", category: recipe.category, status: recipe.status }); }}>Editar</button>
                  <button className="btn-secondary" type="button" onClick={() => onDelete(recipe.id)}>Eliminar</button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
