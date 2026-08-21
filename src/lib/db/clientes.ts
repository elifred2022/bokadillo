import { createAdminClient } from "@/lib/supabase/admin";
import type { Cliente, ClienteNuevo } from "@/lib/types";

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
  const n = Number(s);
  if (!Number.isNaN(n) && n > 25569 && n < 100000) {
    const d = new Date((n - 25569) * 86400 * 1000);
    return d.toISOString().split("T")[0];
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function rowToCliente(row: Record<string, unknown>): Cliente {
  const fechaRaw = row.fecha ?? row.fechaCreacion ?? row.fecha_creacion;
  return {
    idcliente: asStr(row.idcliente),
    nombre: asStr(row.nombre),
    telefono: row.telefono != null ? asStr(row.telefono) || undefined : undefined,
    email: row.email != null ? asStr(row.email) || undefined : undefined,
    direccion:
      row.direccion != null ? asStr(row.direccion) || undefined : undefined,
    fechaCreacion: parseFecha(fechaRaw),
    clave: row.clave != null ? asStr(row.clave) || undefined : undefined,
  };
}

function clienteToDbRow(cliente: ClienteNuevo, clave?: string | null) {
  const idVal = toDbScalar(cliente.idcliente);
  if (idVal === null) {
    throw new Error("ID cliente inválido");
  }

  const row: Record<string, unknown> = {
    idcliente: idVal,
    nombre: cliente.nombre.trim(),
    telefono: cliente.telefono?.trim() ? toDbScalar(cliente.telefono) : null,
    email: cliente.email?.trim() || null,
    direccion: cliente.direccion?.trim() || null,
    fecha: cliente.fechaCreacion || new Date().toISOString().split("T")[0],
  };

  if (clave !== undefined) {
    row.clave = clave;
  } else if (cliente.clave !== undefined) {
    row.clave = cliente.clave || null;
  }

  return row;
}

async function getClienteById(idcliente: string): Promise<Cliente | null> {
  const idVal = toDbScalar(idcliente);
  if (idVal === null) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("idcliente", idVal)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToCliente(data) : null;
}

export async function getClientes(): Promise<Cliente[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => rowToCliente(row));
}

export async function clienteExiste(id: string): Promise<boolean> {
  const cliente = await getClienteById(id);
  return cliente !== null;
}

export async function getClientePorEmail(email: string): Promise<Cliente | null> {
  const buscado = email.trim();
  if (!buscado) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .ilike("email", buscado)
    .limit(1);

  if (error) throw error;
  const row = data?.[0];
  return row ? rowToCliente(row) : null;
}

export async function clienteExistePorEmail(email: string): Promise<boolean> {
  const cliente = await getClientePorEmail(email);
  return cliente !== null;
}

export async function generarSiguienteIdCliente(): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("idcliente")
    .order("idcliente", { ascending: false })
    .limit(1);

  if (error) throw error;

  let max = 0;
  for (const row of data ?? []) {
    const n = Number(row.idcliente);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return String(max + 1);
}

export async function insertarCliente(cliente: ClienteNuevo): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("clientes")
    .insert(clienteToDbRow(cliente));

  if (error) throw error;
}

export async function actualizarCliente(
  idAntiguo: string,
  cliente: ClienteNuevo
): Promise<void> {
  const existente = await getClienteById(idAntiguo);
  if (!existente) {
    throw new Error("Cliente no encontrado");
  }

  const idAntiguoVal = toDbScalar(idAntiguo);
  if (idAntiguoVal === null) {
    throw new Error("Cliente no encontrado");
  }

  const claveFinal =
    cliente.clave !== undefined ? cliente.clave : existente.clave;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clientes")
    .update(clienteToDbRow(cliente, claveFinal ?? null))
    .eq("idcliente", idAntiguoVal)
    .select("idcliente");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("Cliente no encontrado");
  }
}

export async function eliminarCliente(id: string): Promise<void> {
  const idVal = toDbScalar(id);
  if (idVal === null) {
    throw new Error("Cliente no encontrado");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clientes")
    .delete()
    .eq("idcliente", idVal)
    .select("idcliente");

  if (error) throw error;
  if (!data?.length) {
    throw new Error("Cliente no encontrado");
  }
}
