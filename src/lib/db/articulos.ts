import { createAdminClient } from "@/lib/supabase/admin";
import type { Articulo, ArticuloNuevo } from "@/lib/types";

type DbScalar = string | number | null;

function asStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

/** Convierte texto a number si la columna en Supabase es numérica (p. ej. bigint). */
function toDbScalar(val: string): DbScalar {
  const t = val.trim();
  if (!t) return null;
  const num = Number(t);
  if (!Number.isNaN(num) && String(num) === t) return num;
  return t;
}

function rowToArticulo(row: Record<string, unknown>): Articulo {
  return {
    codbarra: asStr(row.codbarra),
    idarticulo: asStr(row.idarticulo),
    nombre: asStr(row.nombre),
    descripcion: asStr(row.descripcion) || undefined,
    precio: Number(row.precio) || 0,
    stock: Number(row.stock) || 0,
    categoria:
      row.categoria != null ? asStr(row.categoria) || undefined : undefined,
    img_path: asStr(row.img_path) || undefined,
  };
}

function articuloToDbRow(articulo: ArticuloNuevo) {
  const idVal = toDbScalar(articulo.idarticulo);
  if (idVal === null) {
    throw new Error("ID artículo inválido");
  }
  const row: Record<string, unknown> = {
    codbarra: toDbScalar(articulo.codbarra),
    idarticulo: idVal,
    nombre: articulo.nombre.trim(),
    descripcion: articulo.descripcion?.trim() ?? "",
    precio: articulo.precio,
    stock: articulo.stock,
  };
  if (articulo.img_path !== undefined) {
    row.img_path = articulo.img_path?.trim() || null;
  }
  return row;
}

export async function getArticuloById(idarticulo: string): Promise<Articulo | null> {
  const idVal = toDbScalar(idarticulo);
  if (idVal === null) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("articulos")
    .select("*")
    .eq("idarticulo", idVal)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToArticulo(data) : null;
}

export async function getArticulos(): Promise<Articulo[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("articulos")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => rowToArticulo(row));
}

export async function articuloExiste(id: string): Promise<boolean> {
  const articulo = await getArticuloById(id);
  return articulo !== null;
}

export async function articuloExistePorCodbarra(
  codbarra: string,
  excluirId?: string
): Promise<boolean> {
  const c = codbarra.trim();
  if (!c) return false;

  const codVal = toDbScalar(c);
  if (codVal === null) return false;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("articulos")
    .select("idarticulo, codbarra")
    .eq("codbarra", codVal);

  if (error) throw error;

  return (data ?? []).some(
    (row) =>
      asStr(row.codbarra).toLowerCase() === c.toLowerCase() &&
      (!excluirId ||
        asStr(row.idarticulo).toLowerCase() !== excluirId.trim().toLowerCase())
  );
}

export async function insertarArticulo(articulo: ArticuloNuevo): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("articulos")
    .insert(articuloToDbRow(articulo));

  if (error) throw error;
}

export async function actualizarArticulo(
  idAntiguo: string,
  articulo: ArticuloNuevo
): Promise<void> {
  const existente = await getArticuloById(idAntiguo);
  if (!existente) {
    throw new Error("Artículo no encontrado");
  }

  const idAntiguoVal = toDbScalar(idAntiguo);
  if (idAntiguoVal === null) {
    throw new Error("Artículo no encontrado");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("articulos")
    .update(articuloToDbRow(articulo))
    .eq("idarticulo", idAntiguoVal)
    .select("idarticulo");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("Artículo no encontrado");
  }

  if (
    articulo.img_path &&
    existente.img_path &&
    articulo.img_path !== existente.img_path
  ) {
    const { borrarFotoArticulo } = await import("@/lib/storage/articulos");
    await borrarFotoArticulo(existente.img_path).catch(() => {});
  }
}

async function actualizarStockArticuloPorId(
  idarticulo: string,
  nuevoStock: number
): Promise<void> {
  const idVal = toDbScalar(idarticulo);
  if (idVal === null) {
    throw new Error("Artículo no encontrado");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("articulos")
    .update({ stock: nuevoStock })
    .eq("idarticulo", idVal)
    .select("idarticulo");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("Artículo no encontrado");
  }
}

export async function descontarStockArticulo(
  idarticulo: string,
  cantidad: number
): Promise<void> {
  if (!idarticulo?.trim() || cantidad <= 0) return;

  const articulo = await getArticuloById(idarticulo);
  if (!articulo) {
    throw new Error("Artículo no encontrado");
  }

  const nuevoStock = articulo.stock - cantidad;
  if (nuevoStock < 0) {
    throw new Error(
      `Stock insuficiente. Disponible: ${articulo.stock}, solicitado: ${cantidad}`
    );
  }

  await actualizarStockArticuloPorId(articulo.idarticulo, nuevoStock);
}

export async function actualizarPrecioYStockArticulo(
  idarticulo: string,
  nuevoPrecio: number,
  cantidadAAgregar: number
): Promise<void> {
  if (!idarticulo?.trim()) return;

  const articulo = await getArticuloById(idarticulo);
  if (!articulo) {
    throw new Error("Artículo no encontrado");
  }

  const idVal = toDbScalar(idarticulo);
  if (idVal === null) {
    throw new Error("Artículo no encontrado");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("articulos")
    .update({
      precio: nuevoPrecio,
      stock: articulo.stock + cantidadAAgregar,
    })
    .eq("idarticulo", idVal)
    .select("idarticulo");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("Artículo no encontrado");
  }
}

export async function restarStockArticulo(
  idarticulo: string,
  cantidad: number
): Promise<void> {
  if (!idarticulo?.trim() || cantidad <= 0) return;

  const articulo = await getArticuloById(idarticulo);
  if (!articulo) {
    throw new Error("Artículo no encontrado");
  }

  const nuevoStock = articulo.stock - cantidad;
  if (nuevoStock < 0) {
    throw new Error(
      `Stock insuficiente para revertir. Disponible: ${articulo.stock}`
    );
  }

  await actualizarStockArticuloPorId(articulo.idarticulo, nuevoStock);
}

export async function reponerStockArticulo(
  idarticulo: string,
  cantidad: number
): Promise<void> {
  if (!idarticulo?.trim() || cantidad <= 0) return;

  const articulo = await getArticuloById(idarticulo);
  if (!articulo) return;

  await actualizarStockArticuloPorId(
    articulo.idarticulo,
    articulo.stock + cantidad
  );
}

export async function eliminarArticulo(id: string): Promise<void> {
  const idVal = toDbScalar(id);
  if (idVal === null) {
    throw new Error("Artículo no encontrado");
  }

  const existente = await getArticuloById(id);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("articulos")
    .delete()
    .eq("idarticulo", idVal)
    .select("idarticulo");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("Artículo no encontrado");
  }

  if (existente?.img_path) {
    const { borrarFotoArticulo } = await import("@/lib/storage/articulos");
    await borrarFotoArticulo(existente.img_path).catch(() => {});
  }
}
