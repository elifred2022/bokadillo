import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ArticuloVenta,
  Venta,
  VentaList,
  VentaUpdatePayload,
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

function normalizeArticulo(item: Record<string, unknown>): ArticuloVenta {
  return {
    idarticulo: asStr(item.idarticulo),
    nombre: asStr(item.nombre),
    cantidad: Number(item.cantidad) || 0,
    total: Number(item.total) || 0,
  };
}

function parseNombreArticulos(val: unknown): {
  articulos?: ArticuloVenta[];
  nombreRaw: string;
} {
  if (Array.isArray(val)) {
    const articulos = val.map((item) =>
      normalizeArticulo(item as Record<string, unknown>)
    );
    return { articulos, nombreRaw: JSON.stringify(articulos) };
  }
  if (typeof val === "string") {
    const s = val.trim();
    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s) as unknown;
        if (Array.isArray(parsed)) {
          const articulos = parsed.map((item) =>
            normalizeArticulo(item as Record<string, unknown>)
          );
          return { articulos, nombreRaw: s };
        }
      } catch {
        /* legacy */
      }
    }
    return { nombreRaw: s };
  }
  return { nombreRaw: "" };
}

function rowToVenta(row: Record<string, unknown>): VentaList {
  const { articulos, nombreRaw } = parseNombreArticulos(row.nombre);
  const cantidad = Number(row.cantidad) || 0;
  const total = Number(row.total) || 0;
  const precioCol = row.precio ?? row.preciounitario;
  const precioUnitario =
    Number(precioCol) || (cantidad > 0 ? total / cantidad : 0);

  return {
    idventa:
      row.idventa != null && asStr(row.idventa)
        ? asStr(row.idventa)
        : asStr(row.id),
    fecha: parseFecha(row.fecha ?? row.created_at),
    cliente: asStr(row.cliente),
    nombre: nombreRaw,
    articulos,
    cantidad,
    precioUnitario,
    total,
    entregado: asStr(row.entregado) || "pendiente",
  };
}

function articulosToDbJson(articulos: ArticuloVenta[]) {
  return articulos.map((a) => ({
    idarticulo: asStr(a.idarticulo),
    nombre: a.nombre.trim(),
    cantidad: Number(a.cantidad) || 0,
    total: Number(a.total) || 0,
  }));
}

function ventaToDbRow(data: {
  articulos: ArticuloVenta[];
  total: number;
  cliente?: string;
  idcliente?: string;
  entregado?: string;
  fecha?: string;
}) {
  const row: Record<string, unknown> = {
    cliente: data.cliente?.trim() ?? "",
    nombre: articulosToDbJson(data.articulos),
    cantidad: 0,
    precio: 0,
    total: data.total,
    entregado: data.entregado?.trim() || "pendiente",
    idcliente: data.idcliente?.trim() ? toDbScalar(data.idcliente) : null,
  };
  if (data.fecha?.trim()) {
    row.created_at = `${data.fecha.trim()}T12:00:00.000Z`;
  }
  return row;
}

async function getVentaRowById(
  idventa: string
): Promise<Record<string, unknown> | null> {
  const idVal = toDbScalar(idventa);
  if (idVal === null) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ventas")
    .select("*")
    .eq("id", idVal)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getVentaById(idventa: string): Promise<VentaList | null> {
  const row = await getVentaRowById(idventa);
  return row ? rowToVenta(row) : null;
}

export async function getVentas(): Promise<VentaList[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ventas")
    .select("*")
    .order("id", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => rowToVenta(row));
}

export async function eliminarVenta(idventa: string): Promise<void> {
  const idVal = toDbScalar(idventa);
  if (idVal === null) {
    throw new Error("Venta no encontrada");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ventas")
    .delete()
    .eq("id", idVal)
    .select("id");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("Venta no encontrada");
  }
}

export async function actualizarVenta(
  idventaAntiguo: string,
  venta: VentaUpdatePayload
): Promise<void> {
  const actual = await getVentaById(idventaAntiguo);
  if (!actual) {
    throw new Error("Venta no encontrada");
  }
  const raw = await getVentaRowById(idventaAntiguo);

  let articulos: ArticuloVenta[];
  let total: number;
  if (venta.articulos && Array.isArray(venta.articulos) && venta.articulos.length > 0) {
    articulos = venta.articulos;
    total = articulos.reduce((sum, a) => sum + (a.total || 0), 0);
  } else if (actual.articulos?.length) {
    articulos = actual.articulos;
    total = venta.total ?? actual.total;
  } else {
    articulos = [];
    total = venta.total ?? actual.total;
  }

  const idVal = toDbScalar(idventaAntiguo);
  if (idVal === null) {
    throw new Error("Venta no encontrada");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ventas")
    .update(
      ventaToDbRow({
        articulos,
        total,
        cliente: venta.cliente ?? actual.cliente,
        idcliente:
          venta.idcliente != null
            ? String(venta.idcliente).trim()
            : raw?.idcliente != null
              ? asStr(raw.idcliente)
              : undefined,
        entregado:
          venta.entregado != null
            ? String(venta.entregado).trim()
            : actual.entregado,
        fecha: venta.fecha ?? actual.fecha,
      })
    )
    .eq("id", idVal)
    .select("id");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("Venta no encontrada");
  }
}

export async function generarSiguienteIdVenta(): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ventas")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);

  if (error) throw error;
  const max = data?.[0]?.id != null ? Number(data[0].id) : 0;
  return String(max + 1);
}

export async function insertarVenta(venta: Venta): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("ventas").insert(
    ventaToDbRow({
      articulos: venta.articulos,
      total: venta.total,
      cliente: venta.cliente,
      idcliente: venta.idcliente,
      entregado: venta.entregado ?? "pendiente",
      fecha: venta.fecha,
    })
  );

  if (error) throw error;
}
