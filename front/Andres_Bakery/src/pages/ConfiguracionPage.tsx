import { RotateCcw } from "lucide-react";

import { SectionHeading } from "../components/ui";
import { ESCALAS, NAV_MODOS, PANELES_LATERALES, TEMAS, TIPOGRAFIAS } from "../preferencias/PreferencesProvider";
import { usePreferences } from "../preferencias/usePreferences";

export function ConfiguracionPage() {
  const preferencias = usePreferences();
  const { setPreferencia, reiniciar } = preferencias;

  return (
    <div className="space-y-8 pb-10">
      <SectionHeading
        eyebrow="Configuración"
        title="Dejá la página como la quieras ver"
        description="Se guarda en este navegador, no en tu cuenta: podés cambiarla sin estar registrado y cada dispositivo recuerda la suya."
      />

      <GrupoOpciones
        titulo="Estación"
        ayuda="Cambia toda la paleta del sitio. Se elige acá: el menú de arriba quedó solo con lo que se usa para comprar."
        opciones={TEMAS.map((tema) => ({
          id: tema.id,
          label: `${tema.icono} ${tema.label}`,
        }))}
        activo={preferencias.tema}
        onElegir={(valor) => setPreferencia("tema", valor)}
      />

      <GrupoOpciones
        titulo="Tipografía"
        ayuda="Si la letra pixelada te cuesta, poné Redonda: se lee mucho mejor en textos largos."
        opciones={TIPOGRAFIAS.map((fuente) => ({
          id: fuente.id,
          label: fuente.label,
          detalle: fuente.detalle,
        }))}
        activo={preferencias.tipografia}
        onElegir={(valor) => setPreferencia("tipografia", valor)}
      />

      <GrupoOpciones
        titulo="Tamaño de letra"
        ayuda="Agranda todo junto: textos, botones y espacios, sin romper la grilla."
        opciones={ESCALAS.map((escala) => ({ id: escala.id, label: escala.label }))}
        activo={preferencias.escala}
        onElegir={(valor) => setPreferencia("escala", valor)}
      />

      <GrupoOpciones
        titulo="Dónde va el menú"
        ayuda="En celular siempre es el botón de la hamburguesa; esto decide cómo se ve en una pantalla grande."
        opciones={NAV_MODOS.map((modo) => ({ id: modo.id, label: modo.label, detalle: modo.detalle }))}
        activo={preferencias.navModo}
        onElegir={(valor) => setPreferencia("navModo", valor)}
      />

      {preferencias.navModo === "drawer" ? (
        <GrupoOpciones
          titulo="Cómo se comporta el panel"
          ayuda="Solo aplica al panel de la izquierda, en pantallas grandes."
          opciones={PANELES_LATERALES.map((modo) => ({
            id: modo.id,
            label: modo.label,
            detalle: modo.detalle,
          }))}
          activo={preferencias.panelLateral}
          onElegir={(valor) => setPreferencia("panelLateral", valor)}
        />
      ) : null}

      <section className="pixel-panel p-6">
        <h2 className="font-display text-2xl font-bold text-tinta">Vista previa</h2>
        <p className="mt-2 text-sm text-tinta-suave">
          Así se ve un texto largo con lo que elegiste. Si acá te cuesta leer, cambialo arriba: la página entera usa
          esta misma configuración.
        </p>
        <div className="mt-5 border-[3px] border-borde bg-superficie-alt p-5">
          <p className="font-display text-2xl font-bold text-tinta">Cheesecake de frutos rojos</p>
          <p className="mt-3 text-base leading-7 text-tinta-suave">
            Base crocante de galleta con manteca, relleno cremoso y frutos rojos frescos por encima. Se encarga con
            48 horas de anticipación y se entrega en Villa Maipú o se retira por el local.
          </p>
          <p className="mt-4 font-display text-2xl font-bold text-acento">$ 14.200</p>
        </div>
      </section>

      <button type="button" className="btn-secondary" onClick={reiniciar}>
        <RotateCcw className="h-4 w-4" />
        Volver a como venía
      </button>
    </div>
  );
}

type Opcion<T extends string> = { id: T; label: string; detalle?: string };

// Generico sobre el VALOR, no sobre la clave: si fuera sobre la clave,
// TypeScript infiere la union de todas y no distingue un grupo de otro.
function GrupoOpciones<T extends string>({
  titulo,
  ayuda,
  opciones,
  activo,
  onElegir,
}: {
  titulo: string;
  ayuda: string;
  opciones: Opcion<T>[];
  activo: T;
  onElegir: (valor: T) => void;
}) {
  return (
    <section className="pixel-panel p-6">
      <h2 className="font-display text-2xl font-bold text-tinta">{titulo}</h2>
      <p className="mt-2 text-sm leading-6 text-tinta-suave">{ayuda}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {opciones.map((opcion) => {
          const elegida = opcion.id === activo;
          return (
            <button
              key={opcion.id}
              type="button"
              onClick={() => onElegir(opcion.id)}
              aria-pressed={elegida}
              className={`border-[3px] border-borde p-4 text-left transition ${
                elegida ? "bg-acento text-crema" : "bg-superficie-alt text-tinta hover:bg-superficie"
              }`}
            >
              <span className="font-display text-lg font-bold">{opcion.label}</span>
              {opcion.detalle ? (
                <span className={`mt-1 block text-xs leading-5 ${elegida ? "text-crema" : "text-tinta-suave"}`}>
                  {opcion.detalle}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
