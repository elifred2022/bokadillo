/**
 * Migra artículos desde Google Sheets a Supabase (una sola vez).
 *
 * Requiere .env.local con credenciales de Google y Supabase.
 * Uso: node --env-file=.env.local scripts/migrate-articulos.mjs
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

async function getArticulosFromSheets() {
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
    range: "'articulos'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map((h) => String(h ?? "").trim().toLowerCase());
  const col = (...names) => {
    for (const n of names) {
      const i = headers.indexOf(n.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const idx = {
    codbarra: col("codbarra", "cod barra"),
    id: col("id", "idarticulo", "id artículo"),
    nombre: col("nombre"),
    descripcion: col("descripcion", "descripción"),
    precio: col("precio"),
    stock: col("stock", "existencia", "inventario"),
    categoria: col("categoria", "categoría"),
  };

  return rows.slice(1).flatMap((row) => {
    const get = (i) =>
      i >= 0 && row[i] !== undefined ? String(row[i]).trim() : "";
    const idarticulo = get(idx.id);
    if (!idarticulo) return [];
    return [
      {
        idarticulo,
        codbarra: idx.codbarra >= 0 ? get(idx.codbarra) : "",
        nombre: get(idx.nombre) || idarticulo,
        descripcion: idx.descripcion >= 0 ? get(idx.descripcion) : "",
        precio: Number.parseFloat(get(idx.precio)) || 0,
        stock: Number.parseFloat(get(idx.stock)) || 0,
        categoria: idx.categoria >= 0 ? get(idx.categoria) || null : null,
      },
    ];
  });
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const articulos = await getArticulosFromSheets();
  console.log(`Leídos ${articulos.length} artículos de Google Sheets`);

  const supabase = createClient(url, key);
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < articulos.length; i += batchSize) {
    const batch = articulos.slice(i, i + batchSize);
    const { error } = await supabase.from("articulos").upsert(batch, {
      onConflict: "idarticulo",
    });
    if (error) {
      console.error("Error en lote:", error.message);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`  ${inserted}/${articulos.length}`);
  }

  console.log("Migración de artículos completada.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
