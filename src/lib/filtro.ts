/**
 * Comprueba si un texto contiene la búsqueda como palabra completa (no subcadena).
 * Ej: "tequeño" coincide con "Queso tequeño" pero NO con "queso" ni "tequeños".
 */
export function contienePalabraCompleta(texto: string, busqueda: string): boolean {
  if (!busqueda.trim()) return true;
  const esc = busqueda.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${esc}\\b`, "i");
  return regex.test(texto);
}
