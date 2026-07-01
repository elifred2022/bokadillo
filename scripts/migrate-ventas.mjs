/**
 * Migra ventas desde Google Sheets a Supabase (una sola vez).
 * Uso: npm run migrate:ventas
 */
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

function parsePrivateKey(raw) {
  if (!raw?.trim()) return "";
  let key = raw.replace(/\\n/g, "\n").trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).replace(/\\n/g, "\n");
  }
  return key;
}

function getSpreadsheetId() {
  const id = process.env.GOOGLE_SHEET_ID ?? "";
  const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : id;
}

function parseFecha(val) {
  if (val === undefined || val === null || val === "") return null;
  const s = String(val).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isNaN(n) && n > 25569 && n < 100000) {
    const d = new Date((n - 25569) * 86400 * 1000);
    return d.toISOString().split("T")[0];
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function toDbScalar(val) {
  const t = String(val ?? "").trim();
  if (!t) return null;
  const num = Number(t);
  if (!Number.isNaN(num) && String(num) === t) return num;
  return t;
}

function parseArticulos(nombreRaw) {
  const s = String(nombreRaw ?? "").trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return parsed.map((a) => ({
          idarticulo: String(a?.idarticulo ?? "").trim(),
          nombre: String(a?.nombre ?? "").trim(),
          cantidad: Number(a?.cantidad) || 0,
          total: Number(a?.total) || 0,
        }));
      }
    } catch {
      return [];
    }
  }
  return [];
}

async function getVentasFromSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim(),
      private_key: parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: "'ventas'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map((h) => String(h ?? "").trim().toLowerCase());
  const col = (key) => headers.findIndex((h) => h === key.toLowerCase());
  const idx = {
    idventa: col("idventa"),
    fecha: col("fecha"),
    cliente: col("cliente") >= 0 ? col("cliente") : col("idarticulo"),
    nombre: col("nombre") >= 0 ? col("nombre") : col("articulonombre"),
    cantidad: col("cantidad"),
    precio: col("preciounitario") >= 0 ? col("preciounitario") : col("precio"),
    total: col("total"),
    entregado: col("entregado"),
    idcliente: col("idcliente"),
  };

  return rows.slice(1).flatMap((row, i) => {
    const get = (j) =>
      j >= 0 && row[j] !== undefined ? String(row[j]).trim() : "";
    const nombreRaw = idx.nombre >= 0 ? get(idx.nombre) : "";
    const articulos = parseArticulos(nombreRaw);
    const fecha = parseFecha(idx.fecha >= 0 ? row[idx.fecha] : "");
    const idventa = idx.idventa >= 0 ? get(idx.idventa) : String(i + 1);
    if (!idventa && articulos.length === 0 && !get(idx.cliente)) return [];

    const rowData = {
      id: toDbScalar(idventa),
      cliente: get(idx.cliente),
      nombre: articulos,
      cantidad: Number(get(idx.cantidad)) || 0,
      precio: Number(get(idx.precio)) || 0,
      total: Number(get(idx.total)) || 0,
      entregado: get(idx.entregado) || "pendiente",
      idcliente: toDbScalar(get(idx.idcliente)),
    };
    if (fecha) {
      rowData.created_at = `${fecha}T12:00:00.000Z`;
    }
    return [rowData];
  });
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const ventas = await getVentasFromSheets();
  console.log(`Leídas ${ventas.length} ventas de Google Sheets`);

  const supabase = createClient(url, key);
  let inserted = 0;
  const batchSize = 50;

  for (let i = 0; i < ventas.length; i += batchSize) {
    const batch = ventas.slice(i, i + batchSize);
    const { error } = await supabase.from("ventas").upsert(batch, {
      onConflict: "id",
    });
    if (error) {
      console.error("Error en lote:", error.message);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`  ${inserted}/${ventas.length}`);
  }

  console.log("Migración de ventas completada.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
