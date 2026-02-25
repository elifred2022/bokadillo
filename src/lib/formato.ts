/** Formatea un número como precio con símbolo $ */
export function formatPrecio(value: number): string {
  return `$${value.toLocaleString()}`;
}
