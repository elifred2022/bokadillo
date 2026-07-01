import { createAdminClient } from "@/lib/supabase/admin";
import type { Proveedor, ProveedorNuevo } from "@/lib/types";

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

function rowToProveedor(row: Record<string, unknown>): Proveedor {
  return {
    idproveedor: asStr(row.idproveedor),
    nombre: asStr(row.nombre),
    telefono:
      row.telefono != null ? asStr(row.telefono) || undefined : undefined,
    email: row.email != null ? asStr(row.email) || undefined : undefined,
    direccion:
      row.direccion != null ? asStr(row.direccion) || undefined : undefined,
    contacto:
      row.contacto != null ? asStr(row.contacto) || undefined : undefined,
  };
}

function proveedorToDbRow(proveedor: ProveedorNuevo) {
  const idVal = toDbScalar(proveedor.idproveedor);
  if (idVal === null) {
    throw new Error("ID proveedor inválido");
  }
  return {
    idproveedor: idVal,
    nombre: proveedor.nombre.trim(),
    telefono: proveedor.telefono?.trim()
      ? toDbScalar(proveedor.telefono)
      : null,
    email: proveedor.email?.trim() || null,
    direccion: proveedor.direccion?.trim() || null,
    contacto: proveedor.contacto?.trim() || null,
  };
}

async function getProveedorById(idproveedor: string): Promise<Proveedor | null> {
  const idVal = toDbScalar(idproveedor);
  if (idVal === null) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("proveedores")
    .select("*")
    .eq("idproveedor", idVal)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToProveedor(data) : null;
}

export async function getProveedores(): Promise<Proveedor[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("proveedores")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => rowToProveedor(row));
}

export async function proveedorExiste(id: string): Promise<boolean> {
  const proveedor = await getProveedorById(id);
  return proveedor !== null;
}

export async function insertarProveedor(
  proveedor: ProveedorNuevo
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("proveedores")
    .insert(proveedorToDbRow(proveedor));

  if (error) throw error;
}

export async function actualizarProveedor(
  idAntiguo: string,
  proveedor: ProveedorNuevo
): Promise<void> {
  const existente = await getProveedorById(idAntiguo);
  if (!existente) {
    throw new Error("Proveedor no encontrado");
  }

  const idAntiguoVal = toDbScalar(idAntiguo);
  if (idAntiguoVal === null) {
    throw new Error("Proveedor no encontrado");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("proveedores")
    .update(proveedorToDbRow(proveedor))
    .eq("idproveedor", idAntiguoVal)
    .select("idproveedor");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("Proveedor no encontrado");
  }
}

export async function eliminarProveedor(id: string): Promise<void> {
  const idVal = toDbScalar(id);
  if (idVal === null) {
    throw new Error("Proveedor no encontrado");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("proveedores")
    .delete()
    .eq("idproveedor", idVal)
    .select("idproveedor");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("Proveedor no encontrado");
  }
}
