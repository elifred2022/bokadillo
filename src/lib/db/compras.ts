import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ArticuloCompra,
  CompraList,
  CompraNueva,
  CompraUpdatePayload,
} from "@/lib/types";

type DbScalar = string | number | null;

function asStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function toDbScalar(val: string): DbScalar {
  const t = val.trim();
  if (!t) return null;
  const num = Number(t);
  if (!Number.isNaN(num) && String(num) === t) return num;
  return t;
}

function parseFecha(val: unknown): string {
  if (val === null || val === undefined || val === "") return "";
  const s = String(val).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0];
  const n = Number(s);
  if (!Number.isNaN(n) && n > 25569 && n < 100000) {
    const excel = new Date((n - 25569) * 86400 * 1000);
    return excel.toISOString().split("T")[0];
  }
  return s;
}

function normalizeArticuloCompra(item: Record<string, unknown>): ArticuloCompra {
  return {
    idarticulo: asStr(item.idarticulo),
    nombre: asStr(item.nombre),
    cantidad: Number(item.cantidad) || 0,
    total: Number(item.total) || 0,
  };
}

function parseArticuloField(val: unknown): {
  articulos?: ArticuloCompra[];
  articuloRaw: string;
} {
  if (Array.isArray(val)) {
    const articulos = val.map((item) =>
      normalizeArticuloCompra(item as Record<string, unknown>)
    );
    return { articulos, articuloRaw: JSON.stringify(articulos) };
  }
  if (typeof val === "string") {
    const s = val.trim();
    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s) as unknown;
        if (Array.isArray(parsed)) {
          const articulos = parsed.map((item) =>
            normalizeArticuloCompra(item as Record<string, unknown>)
          );
          return { articulos, articuloRaw: s };
        }
      } catch {
        /* legacy */
      }
    }
    return { articuloRaw: s };
  }
  return { articuloRaw: "" };
}

function rowToCompra(row: Record<string, unknown>): CompraList {
  const articuloField = row.articulo ?? row.nombre;
  const { articulos, articuloRaw } = parseArticuloField(articuloField);
  const cantidad = Number(row.cantidad) || 0;

  return {
    idcompra:
      row.idcompra != null && asStr(row.idcompra)
        ? asStr(row.idcompra)
        : asStr(row.id),
    fecha: parseFecha(row.fecha ?? row.created_at),
    proveedor: asStr(row.proveedor),
    factura:
      row.factura != null && asStr(row.factura)
        ? asStr(row.factura)
        : undefined,
    idarticulo:
      row.idarticulo != null ? asStr(row.idarticulo) || undefined : undefined,
    articulo: articuloRaw,
    articulos,
    cantidad,
    total: Number(row.total) || 0,
  };
}

function articulosToDbJson(articulos: ArticuloCompra[]) {
  return articulos.map((a) => ({
    idarticulo: asStr(a.idarticulo),
    nombre: a.nombre.trim(),
    cantidad: Number(a.cantidad) || 0,
    total: Number(a.total) || 0,
  }));
}

function compraToDbRow(data: {
  articulos: ArticuloCompra[];
  total: number;
  proveedor: string;
  factura?: string;
  fecha?: string;
}) {
  const row: Record<string, unknown> = {
    proveedor: data.proveedor.trim(),
    articulo: articulosToDbJson(data.articulos),
    total: data.total,
    factura: data.factura?.trim() ? toDbScalar(data.factura) : null,
  };
  if (data.fecha?.trim()) {
    row.created_at = `${data.fecha.trim()}T12:00:00.000Z`;
  }
  return row;
}

async function getCompraRowById(
  idcompra: string
): Promise<Record<string, unknown> | null> {
  const idVal = toDbScalar(idcompra);
  if (idVal === null) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("compras")
    .select("*")
    .eq("id", idVal)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getCompraById(idcompra: string): Promise<CompraList | null> {
  const row = await getCompraRowById(idcompra);
  return row ? rowToCompra(row) : null;
}

export async function getCompras(): Promise<CompraList[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("compras")
    .select("*")
    .order("id", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => rowToCompra(row));
}

export async function generarSiguienteIdCompra(): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("compras")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);

  if (error) throw error;
  const max = data?.[0]?.id != null ? Number(data[0].id) : 0;
  return String(max + 1);
}

export async function insertarCompra(compra: CompraNueva): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("compras").insert(
    compraToDbRow({
      articulos: compra.articulos,
      total: compra.total,
      proveedor: compra.proveedor,
      factura: compra.factura,
      fecha: compra.fecha,
    })
  );

  if (error) throw error;
}

export async function actualizarCompra(
  idcompraAntiguo: string,
  compra: CompraUpdatePayload
): Promise<void> {
  const actual = await getCompraById(idcompraAntiguo);
  if (!actual) {
    throw new Error("Compra no encontrada");
  }

  let articulos: ArticuloCompra[];
  let total: number;
  if (
    compra.articulos &&
    Array.isArray(compra.articulos) &&
    compra.articulos.length > 0
  ) {
    articulos = compra.articulos;
    total = articulos.reduce((sum, a) => sum + (a.total || 0), 0);
  } else if (actual.articulos?.length) {
    articulos = actual.articulos;
    total = compra.total ?? actual.total;
  } else {
    articulos = [];
    total = compra.total ?? actual.total;
  }

  const idVal = toDbScalar(idcompraAntiguo);
  if (idVal === null) {
    throw new Error("Compra no encontrada");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("compras")
    .update(
      compraToDbRow({
        articulos,
        total,
        proveedor: compra.proveedor ?? actual.proveedor,
        factura:
          compra.factura != null ? String(compra.factura).trim() : actual.factura,
        fecha: compra.fecha ?? actual.fecha,
      })
    )
    .eq("id", idVal)
    .select("id");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("Compra no encontrada");
  }
}

export async function eliminarCompra(idcompra: string): Promise<void> {
  const idVal = toDbScalar(idcompra);
  if (idVal === null) {
    throw new Error("Compra no encontrada");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("compras")
    .delete()
    .eq("id", idVal)
    .select("id");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("Compra no encontrada");
  }
}
