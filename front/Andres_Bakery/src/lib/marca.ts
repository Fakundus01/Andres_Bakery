/** El nombre de la marca, escrito una sola vez (D24).
 *
 *  Estaba repetido a mano en cinco lugares del front y en seis del back, con
 *  dos grafías distintas: el logo lo escribe con apóstrofo y en mayúsculas, el
 *  sitio lo escribía sin apóstrofo. El humano decidió el 2026-10-25 seguir el
 *  logo. (Las dos grafías viejas no se citan acá a propósito: el barrido de
 *  `marca.test.ts` las busca en este archivo también.)
 *
 *  Acá va la grafía de los TEXTOS: apóstrofo recto y caja normal. Las
 *  mayúsculas del logo son estilo, no ortografía, y en esta casa el estilo lo
 *  pone el CSS: «Dónde encontrarnos» está escrito en caja normal y lo agranda
 *  `uppercase tracking-[0.2em]`. Si algún día un diseño necesita la marca
 *  gritada, va `className="uppercase"`, no un literal nuevo.
 *
 *  El apóstrofo es el recto (U+0027) y no el tipográfico (U+2019) porque es
 *  ASCII: pasa igual por la consola, por `grep`, por los asserts de las dos
 *  suites y por el CDP a mano con el que este repo cumple R07 cuando el MCP
 *  de Playwright no conecta. Y es el que sale del teclado cuando Andrea edita
 *  el texto institucional desde el panel, así que no hay dos grafías que se
 *  vean iguales y comparen distinto. El resto de las razones y los candados
 *  están en `marca.test.ts`.
 *
 *  `index.html` no puede importar esto —es HTML estático, y poner el `<title>`
 *  desde JS lo haría parpadear— así que ahí la grafía sigue escrita y la cuida
 *  el barrido de `marca.test.ts`.
 */
export const MARCA = "Andre's Bakery";
