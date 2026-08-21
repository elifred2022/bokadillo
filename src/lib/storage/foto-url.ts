export const BUCKET_FOTO_ARTICULO = "foto_articulo_venta";

function supabaseBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    .trim()
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/$/, "");
}

/** URL pública para mostrar la foto (usa NEXT_PUBLIC_SUPABASE_URL). */
export function urlFotoArticulo(imgPath?: string | null): string | null {
  if (!imgPath?.trim()) return null;
  const path = imgPath.trim();
  if (/^https?:\/\//i.test(path)) return path;

  const base = supabaseBaseUrl();
  if (!base) return null;

  const sinSlash = path.replace(/^\/+/, "");
  const objectPath = sinSlash.startsWith(`${BUCKET_FOTO_ARTICULO}/`)
    ? sinSlash.slice(BUCKET_FOTO_ARTICULO.length + 1)
    : sinSlash;
  return `${base}/storage/v1/object/public/${BUCKET_FOTO_ARTICULO}/${objectPath}`;
}
