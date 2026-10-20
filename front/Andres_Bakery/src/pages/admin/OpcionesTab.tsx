import { useState } from "react";
import { Plus } from "lucide-react";

import { ConfirmarBorrado } from "../../components/ConfirmarBorrado";
import { Modal } from "../../components/Modal";
import { textoDeBorrado } from "../../lib/borrados";
import { NOMBRE_TAG_PERSONALIZABLE } from "../../lib/carrito";
import { usePantallaGrande } from "../../lib/usePantallaGrande";
import type { OptionGroup } from "../../lib/types";
import { EditorDeGrupo } from "./EditorDeGrupo";
import { FormularioDeGrupo, ID_DEL_FORMULARIO_DE_GRUPO } from "./FormularioDeGrupo";
import { TarjetaDeGrupo } from "./TarjetaDeGrupo";

/** Los gustos que ofrece la casa (F57, ADR-031).
 *
 *  Acá es donde ella decide **qué se puede elegir**: "Bizcocho" con sus
 *  sabores, "Relleno" con los suyos. Después, en cada torta, marca qué grupos
 *  aplican; el cliente elige de esa lista y nada más. Si pudiera escribir el
 *  sabor, el pedido sería una carta de deseos.
 *
 *  Los grupos son globales como las etiquetas y los ingredientes: "Relleno"
 *  se escribe una vez y lo reusan todas las tortas que lo lleven.
 *
 *  La pestaña orquesta: crear y editar van en pop-up en computadora y en la
 *  página en celular (ADR-034, ADR-035).
 */
export function OpcionesTab({
  grupos,
  usos,
  buscarGrupo,
  etiquetaLista,
  onCrearEtiqueta,
  onCrearGrupo,
  onRenombrarGrupo,
  onObligatoriedad,
  onBorrarGrupo,
  onCrearOpcion,
  onEditarOpcion,
  onBorrarOpcion,
}: {
  grupos: OptionGroup[];
  usos: Record<number, number>;
  buscarGrupo: (nombre: string) => OptionGroup | null;
  /** ¿Existe ya la etiqueta que habilita la personalización? */
  etiquetaLista: boolean;
  onCrearEtiqueta: () => void;
  onCrearGrupo: (nombre: string, obligatorio: boolean) => void;
  onRenombrarGrupo: (id: number, nombre: string) => void;
  onObligatoriedad: (id: number, obligatorio: boolean) => void;
  onBorrarGrupo: (id: number) => void;
  onCrearOpcion: (grupoId: number, nombre: string, recargo: number) => void;
  onEditarOpcion: (grupoId: number, opcionId: number, nombre: string, recargo: number) => void;
  onBorrarOpcion: (grupoId: number, opcionId: number) => void;
}) {
  const enPopUp = usePantallaGrande();
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [aBorrar, setABorrar] = useState<OptionGroup | null>(null);
  const [aviso, setAviso] = useState("");

  const crear = (nombre: string, obligatorio: boolean): boolean => {
    // Si ya existe escrito de otra forma, se dice en vez de mandar un alta
    // que el back va a resolver devolviendo el que estaba: así ella entiende
    // por qué no aparece uno nuevo.
    const existente = buscarGrupo(nombre);
    if (existente) {
      setAviso(`Ya tenés un grupo que se llama «${existente.name}». Agregale los sabores ahí abajo.`);
      return false;
    }
    setAviso("");
    onCrearGrupo(nombre, obligatorio);
    setCreando(false);
    return true;
  };

  const enEdicion = grupos.find((grupo) => grupo.id === editando) ?? null;

  const editorDe = (grupo: OptionGroup) => (
    // La clave importa en celular, donde **todos** los editores están montados
    // a la vez dentro de sus tarjetas: sin ella, React podría reusar el estado
    // de uno para otro al reordenarse la lista. En computadora el pop-up monta
    // uno solo y lo desmonta al cerrar.
    <EditorDeGrupo
      key={grupo.id}
      grupo={grupo}
      onRenombrar={onRenombrarGrupo}
      onObligatoriedad={onObligatoriedad}
      onCrearOpcion={onCrearOpcion}
      onEditarOpcion={onEditarOpcion}
      onBorrarOpcion={onBorrarOpcion}
    />
  );

  const laEtiqueta = (
    /* La puerta de la feature, dicha donde se trabaja: sin la etiqueta puesta
       en el producto, la ficha no ofrece nada de esto (ADR-033). */
    <div className="border-[3px] border-borde bg-superficie-alt p-3 text-xs leading-5 text-tinta-suave">
      <p>
        Esto solo aplica a los productos con la etiqueta{" "}
        <strong>«{NOMBRE_TAG_PERSONALIZABLE}»</strong>. Una docena de cookies no se personaliza: se
        pide y listo.
      </p>
      {etiquetaLista ? (
        <p className="mt-2">La etiqueta ya existe: ponela en tus tortas a pedido.</p>
      ) : (
        <button className="btn-secondary mt-2 px-3 py-1 text-xs" type="button" onClick={onCrearEtiqueta}>
          Crear la etiqueta «{NOMBRE_TAG_PERSONALIZABLE}»
        </button>
      )}
    </div>
  );

  const lista =
    grupos.length === 0 ? (
      <p className="pixel-panel border-dashed p-6 text-sm leading-6 text-tinta-suave">
        Todavía no creaste ningún grupo. Empezá por “Relleno” y cargale los sabores que hacés.
      </p>
    ) : (
      <div className={enPopUp ? "grid gap-4 xl:grid-cols-2" : "space-y-4"}>
        {grupos.map((grupo) => (
          <TarjetaDeGrupo
            key={grupo.id}
            grupo={grupo}
            usos={usos[grupo.id] ?? 0}
            abierto={!enPopUp && editando === grupo.id}
            onEditar={() => setEditando((actual) => (actual === grupo.id ? null : grupo.id))}
            onPedirBorrado={() => setABorrar(grupo)}
            editor={enPopUp ? undefined : editorDe(grupo)}
          />
        ))}
      </div>
    );

  const confirmacion = (
    <ConfirmarBorrado
      abierto={aBorrar !== null}
      titulo={aBorrar ? `¿Borrar «${aBorrar.name}» y sus sabores?` : ""}
      texto={textoDeBorrado("grupo", aBorrar ? usos[aBorrar.id] ?? 0 : 0)}
      onCerrar={() => setABorrar(null)}
      onConfirmar={() => {
        if (aBorrar) {
          onBorrarGrupo(aBorrar.id);
          setEditando((actual) => (actual === aBorrar.id ? null : actual));
        }
        setABorrar(null);
      }}
    />
  );

  if (!enPopUp) {
    return (
      <section className="grid gap-6">
        <div className="pixel-panel space-y-4 p-6">
          <h3 className="font-display text-3xl font-semibold text-tinta">Gustos y rellenos</h3>
          {laEtiqueta}
          <FormularioDeGrupo onCrear={crear} aviso={aviso} />
          <button className="btn-primary" type="submit" form={ID_DEL_FORMULARIO_DE_GRUPO}>
            <Plus className="h-4 w-4" />
            Crear grupo
          </button>
        </div>
        {lista}
        {confirmacion}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {laEtiqueta}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tinta-suave">
          {grupos.length === 1 ? "1 grupo de gustos" : `${grupos.length} grupos de gustos`} · el
          cliente elige de acá, no escribe el sabor
        </p>
        <button
          className="btn-primary"
          type="button"
          onClick={() => {
            setAviso("");
            setCreando(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo grupo
        </button>
      </div>

      {lista}

      <Modal
        abierto={creando}
        titulo="Nuevo grupo de gustos"
        descripcion="Un grupo por cada cosa que el cliente elige. Los sabores se cargan después, con el grupo ya creado."
        onCerrar={() => setCreando(false)}
        pie={
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" type="submit" form={ID_DEL_FORMULARIO_DE_GRUPO}>
              <Plus className="h-4 w-4" />
              Crear grupo
            </button>
            <button className="btn-secondary" type="button" onClick={() => setCreando(false)}>
              Cancelar
            </button>
          </div>
        }
      >
        {/* Montado solo mientras está abierto: si queda montado, "Nuevo grupo"
            lo reabre con el nombre que se había tipeado y cancelado, y con el
            "obligatorio" destildado de la vez anterior. */}
        {creando ? <FormularioDeGrupo onCrear={crear} aviso={aviso} /> : null}
      </Modal>

      <Modal
        abierto={enEdicion !== null}
        titulo={enEdicion ? `Editar «${enEdicion.name}»` : ""}
        descripcion="Cada cosa se guarda cuando la hacés: el nombre con Enter o con el tilde, los sabores al agregarlos."
        onCerrar={() => setEditando(null)}
        pie={
          <button className="btn-primary" type="button" onClick={() => setEditando(null)}>
            Listo
          </button>
        }
      >
        {enEdicion ? editorDe(enEdicion) : null}
      </Modal>

      {confirmacion}
    </section>
  );
}
