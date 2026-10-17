/** Las iniciales para el circulito de la cuenta: "Facundo Moreno" → "FM".
 *
 *  Un nombre de una sola palabra da sus dos primeras letras ("Andrea" → "AN"),
 *  porque una sola letra en un circulo se lee como un error de carga. Si no hay
 *  nombre no se inventa nada: devuelve vacío y el botón muestra el ícono.
 */
export function iniciales(nombre: string | null | undefined): string {
  const palabras = (nombre ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (palabras.length === 0) {
    return "";
  }
  if (palabras.length === 1) {
    return palabras[0].slice(0, 2).toUpperCase();
  }
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
}
