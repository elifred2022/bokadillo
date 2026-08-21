import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_FOTO_ARTICULO } from "@/lib/storage/foto-url";

export { BUCKET_FOTO_ARTICULO, urlFotoArticulo } from "@/lib/storage/foto-url";

const TIPOS_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 5 * 1024 * 1024;

function idSeguro(idarticulo: string): string {
  const s = idarticulo.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
  return s || "articulo";
}

function extensionFoto(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[file.type] ?? "jpg";
}

export function validarFotoArticulo(file: File): void {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const tipoOk =
    TIPOS_PERMITIDOS.has(file.type) ||
    ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
  if (!tipoOk) {
    throw new Error("La foto debe ser JPG, PNG, WEBP o GIF");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("La foto no puede superar 5 MB");
  }
}

export async function subirFotoArticulo(
  idarticulo: string,
  file: File
): Promise<string> {
  validarFotoArticulo(file);
  const ext = extensionFoto(file);
  const path = `${idSeguro(idarticulo)}/${Date.now()}.${ext}`;
  const supabase = createAdminClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(BUCKET_FOTO_ARTICULO)
    .upload(path, bytes, {
      contentType: file.type || (ext === "jpg" ? "image/jpeg" : `image/${ext}`),
      upsert: true,
    });
  if (error) throw error;
  return path;
}

export async function borrarFotoArticulo(imgPath?: string | null): Promise<void> {
  if (!imgPath?.trim() || /^https?:\/\//i.test(imgPath)) return;
  const sinSlash = imgPath.trim().replace(/^\/+/, "");
  const objectPath = sinSlash.startsWith(`${BUCKET_FOTO_ARTICULO}/`)
    ? sinSlash.slice(BUCKET_FOTO_ARTICULO.length + 1)
    : sinSlash;
  const supabase = createAdminClient();
  await supabase.storage.from(BUCKET_FOTO_ARTICULO).remove([objectPath]);
}

export async function parseArticuloRequest(request: Request): Promise<{
  body: Record<string, unknown>;
  foto: File | null;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const fd = await request.formData();
    const rawFoto = fd.get("foto");
    const foto =
      rawFoto instanceof Blob && rawFoto.size > 0
        ? (rawFoto as File)
        : null;
    return {
      body: {
        codbarra: fd.get("codbarra"),
        id: fd.get("id"),
        idarticulo: fd.get("idarticulo"),
        nombre: fd.get("nombre"),
        descripcion: fd.get("descripcion"),
        precio: fd.get("precio"),
        stock: fd.get("stock"),
      },
      foto,
    };
  }

  const body = (await request.json()) as Record<string, unknown>;
  return { body, foto: null };
}
