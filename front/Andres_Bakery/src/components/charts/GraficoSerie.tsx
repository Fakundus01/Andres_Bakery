import { useEffect, useId, useRef, useState, type MouseEvent } from "react";

import type { PuntoDeSerie } from "../../lib/types";
import { TablaDeSerie, formatoCorto, ticksDelEje } from "./piezas";

const ANCHO_BASE = 640;
const ALTO = 220;
const MARGEN = { arriba: 18, derecha: 16, abajo: 26, izquierda: 48 };

/** Una serie por día: línea o columnas (F47, F48, ADR-019).
 *
 *  Una sola serie y un solo hue (`--color-acento`), por una razón medida: el par
 *  `acento`/`acento-2` de los temas no separa dos series — el validador de
 *  paletas da ΔE 10,1 en invierno incluso con visión normal (ver `design.md`).
 *  Así que acá el color no codifica nada: la identidad la dice el título y el
 *  valor lo dicen las etiquetas y el tooltip.
 *
 *  Los extremos de las barras quedan cuadrados, no redondeados: el proyecto no
 *  usa radios en ningún borde (ADR-003).
 */
export function GraficoSerie({
  titulo,
  datos,
  forma = "linea",
  moneda = false,
}: {
  titulo: string;
  datos: PuntoDeSerie[];
  forma?: "linea" | "columnas";
  moneda?: boolean;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  const [ancho, setAncho] = useState(ANCHO_BASE);
  const caja = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const idTitulo = useId();

  /** El SVG se dibuja al tamaño real del panel, no escalado.
   *
   *  Con un `viewBox` fijo estirado al ancho disponible, el texto escala con
   *  todo lo demás: en un celular de 390px los números del eje terminaban en
   *  ~5px y no se leían. Midiendo el contenedor, una unidad del gráfico es un
   *  píxel y 11px son 11px en cualquier pantalla. */
  useEffect(() => {
    const elemento = caja.current;
    if (!elemento) {
      return;
    }
    const observador = new ResizeObserver(([entrada]) =>
      setAncho(Math.max(260, Math.round(entrada.contentRect.width))),
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  if (datos.length === 0) {
    return <PanelVacio titulo={titulo} />;
  }

  const maximo = Math.max(...datos.map((punto) => punto.value));
  const marcas = ticksDelEje(maximo);
  const techo = marcas[marcas.length - 1];
  const anchoUtil = ancho - MARGEN.izquierda - MARGEN.derecha;
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const paso = anchoUtil / Math.max(1, datos.length - 1);
  const base = MARGEN.arriba + altoUtil;

  const x = (indice: number) =>
    datos.length === 1 ? MARGEN.izquierda + anchoUtil / 2 : MARGEN.izquierda + indice * paso;
  const y = (valor: number) => base - (techo === 0 ? 0 : (valor / techo) * altoUtil);

  const indiceMaximo = datos.findIndex((punto) => punto.value === maximo);
  const ultimo = datos.length - 1;
  const aEtiquetar = new Set(maximo > 0 ? [indiceMaximo, ultimo] : [ultimo]);

  const seguirElMouse = (evento: MouseEvent<SVGSVGElement>) => {
    const caja = svg.current?.getBoundingClientRect();
    if (!caja) {
      return;
    }
    const proporcion = (evento.clientX - caja.left) / caja.width;
    const dentro = (proporcion * ancho - MARGEN.izquierda) / Math.max(1, anchoUtil);
    const indice = Math.round(dentro * (datos.length - 1));
    setActivo(Math.min(datos.length - 1, Math.max(0, indice)));
  };

  const punta = activo === null ? null : datos[activo];
  const anchoColumna = Math.min(24, (anchoUtil / datos.length) * 0.7);

  return (
    <figure className="pixel-panel min-w-0 p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 id={idTitulo} className="font-display text-2xl font-bold text-tinta">
          {titulo}
        </h4>
        <p className="text-sm text-tinta-tenue">
          {punta ? `${diaCorto(punta.day)}: ${formatoCorto(punta.value, moneda)}` : `máximo ${formatoCorto(maximo, moneda)}`}
        </p>
      </figcaption>

      <div ref={caja} className="mt-3 w-full overflow-hidden">
      <svg
        ref={svg}
        viewBox={`0 0 ${ancho} ${ALTO}`}
        width={ancho}
        height={ALTO}
        role="img"
        aria-labelledby={idTitulo}
        onMouseMove={seguirElMouse}
        onMouseLeave={() => setActivo(null)}
      >
        {/* Grilla fina y recesiva, nunca punteada. Una línea por marca del
            eje: así cada etiqueta cae exactamente en su valor. */}
        {marcas.map((marca) => {
          const y = techo === 0 ? base : base - (marca / techo) * altoUtil;
          return (
            <g key={marca}>
              <line
                x1={MARGEN.izquierda}
                x2={ancho - MARGEN.derecha}
                y1={y}
                y2={y}
                stroke="var(--color-sombra)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={MARGEN.izquierda - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-[var(--color-tinta-tenue)] text-[11px]"
              >
                {formatoCorto(marca, moneda)}
              </text>
            </g>
          );
        })}

        {forma === "columnas"
          ? datos.map((punto, indice) => (
              <rect
                key={punto.day}
                x={x(indice) - anchoColumna / 2}
                y={y(punto.value)}
                width={anchoColumna}
                height={Math.max(0, base - y(punto.value))}
                fill="var(--color-acento)"
                opacity={activo === null || activo === indice ? 1 : 0.55}
              />
            ))
          : (
            <>
              <polyline
                points={datos.map((punto, indice) => `${x(indice)},${y(punto.value)}`).join(" ")}
                fill="none"
                stroke="var(--color-acento)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={x(ultimo)}
                cy={y(datos[ultimo].value)}
                r={4.5}
                fill="var(--color-acento)"
                stroke="var(--color-superficie)"
                strokeWidth={2}
              />
            </>
          )}

        {activo !== null && punta ? (
          <>
            <line
              x1={x(activo)}
              x2={x(activo)}
              y1={MARGEN.arriba}
              y2={base}
              stroke="var(--color-borde)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={x(activo)}
              cy={y(punta.value)}
              r={5}
              fill="var(--color-acento)"
              stroke="var(--color-superficie)"
              strokeWidth={2}
            />
          </>
        ) : null}

        {/* Etiquetas al pie: solo la primera y la última, para que no choquen. */}
        <text x={MARGEN.izquierda} y={ALTO - 6} className="fill-[var(--color-tinta-tenue)] text-[11px]">
          {diaCorto(datos[0].day)}
        </text>
        <text
          x={ancho - MARGEN.derecha}
          y={ALTO - 6}
          textAnchor="end"
          className="fill-[var(--color-tinta-tenue)] text-[11px]"
        >
          {diaCorto(datos[ultimo].day)}
        </text>

        {/* Y los valores del pico y del último punto, nunca de todos. */}
        {[...aEtiquetar].map((indice) =>
          datos[indice].value > 0 ? (
            <text
              key={`etiqueta-${indice}`}
              x={x(indice)}
              y={y(datos[indice].value) - 8}
              textAnchor={indice === ultimo ? "end" : "middle"}
              className="fill-[var(--color-tinta)] text-[11px] font-bold"
            >
              {formatoCorto(datos[indice].value, moneda)}
            </text>
          ) : null,
        )}
      </svg>
      </div>

      <TablaDeSerie titulo={titulo} datos={datos} moneda={moneda} />
    </figure>
  );
}

function PanelVacio({ titulo }: { titulo: string }) {
  return (
    <figure className="pixel-panel min-w-0 p-5">
      <h4 className="font-display text-2xl font-bold text-tinta">{titulo}</h4>
      <p className="mt-3 border-[3px] border-dashed border-borde p-4 text-sm leading-6 text-tinta-suave">
        Todavía no hay datos para mostrar acá.
      </p>
    </figure>
  );
}

function diaCorto(dia: string): string {
  const [, mes, numero] = dia.split("-");
  return `${numero}/${mes}`;
}
