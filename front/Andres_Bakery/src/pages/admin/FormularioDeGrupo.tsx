import { useState, type FormEvent } from "react";

import { Field } from "../../components/ui";

/** El id del `<form>`, para que "Crear grupo" viva en el pie del pop-up. */
export const ID_DEL_FORMULARIO_DE_GRUPO = "formulario-de-grupo";

/** Dar de alta un grupo de gustos: el nombre y si hay que elegir uno.
 *
 *  Salió de `OpcionesTab` cuando la pestaña pasó a orquestar los pop-ups
 *  (R05). Se muestra en la página (celular) y en un pop-up (computadora).
 */
export function FormularioDeGrupo({
  onCrear,
  aviso,
}: {
  /** Devuelve `true` si el alta se aceptó: con eso el formulario se limpia.
   *  Si el grupo ya existía escrito de otra forma, devuelve `false` y el
   *  aviso explica por qué no apareció uno nuevo. */
  onCrear: (nombre: string, obligatorio: boolean) => boolean;
  aviso?: string;
}) {
  const [nombre, setNombre] = useState("");
  const [obligatorio, setObligatorio] = useState(true);

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) {
      return;
    }
    if (onCrear(limpio, obligatorio)) {
      setNombre("");
      setObligatorio(true);
    }
  };

  return (
    <form id={ID_DEL_FORMULARIO_DE_GRUPO} className="space-y-4" onSubmit={enviar}>
      <p className="text-sm leading-6 text-tinta-suave">
        Armá un grupo por cada cosa que el cliente elige: Bizcocho, Relleno, Cobertura. Después, en
        cada producto de la carta, marcás qué grupos aplican.
      </p>

      <Field label="Nombre del grupo">
        <input
          className="field"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          placeholder="Relleno, Bizcocho, Cobertura…"
        />
      </Field>

      <label className="flex items-center gap-3 border-[3px] border-borde bg-superficie px-4 py-3 text-sm font-medium text-tinta-suave">
        <input
          type="checkbox"
          checked={obligatorio}
          onChange={(evento) => setObligatorio(evento.target.checked)}
        />
        Hay que elegir uno para poder pedir
      </label>
      <p className="border-[3px] border-borde bg-superficie-alt p-3 text-xs leading-5 text-tinta-suave">
        Dejalo marcado para el relleno: una torta sin relleno elegido no es un pedido que puedas
        cumplir. Destildalo para algo que se puede dejar vacío, como una cobertura extra.
      </p>

      {aviso ? (
        <p className="border-[3px] border-borde bg-superficie px-3 py-2 text-xs leading-5 text-tinta">
          {aviso}
        </p>
      ) : null}
    </form>
  );
}
