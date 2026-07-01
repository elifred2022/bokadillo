/**
 * Migra proveedores desde Google Sheets a Supabase (una sola vez).
 * Uso: npm run migrate:proveedores
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

function toDbScalar(val) {
  const t = String(val ?? "").trim();
  if (!t) return null;
  const num = Number(t);
  if (!Number.isNaN(num) && String(num) === t) return num;
  return t;
}

async function getProveedoresFromSheets() {
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
    range: "'proveedores'!A:Z",
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
    id: col("id", "idproveedor", "id proveedor", "codigo", "código"),
    nombre: col("nombre"),
    telefono: col("telefono", "teléfono", "phone"),
    email: col("email", "correo", "e-mail"),
    direccion: col("direccion", "dirección", "dir"),
    contacto: col("contacto", "persona contacto"),
  };

  return rows.slice(1).flatMap((row) => {
    const get = (i) =>
      i >= 0 && row[i] !== undefined ? String(row[i]).trim() : "";
    const idproveedor = get(idx.id);
    if (!idproveedor) return [];
    return [
      {
        idproveedor: toDbScalar(idproveedor),
        nombre: get(idx.nombre) || idproveedor,
        telefono: toDbScalar(get(idx.telefono)),
        email: get(idx.email) || null,
        direccion: get(idx.direccion) || null,
        contacto: get(idx.contacto) || null,
      },
    ];
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

  const proveedores = await getProveedoresFromSheets();
  console.log(`Leídos ${proveedores.length} proveedores de Google Sheets`);

  const supabase = createClient(url, key);
  let inserted = 0;
  const batchSize = 50;

  for (let i = 0; i < proveedores.length; i += batchSize) {
    const batch = proveedores.slice(i, i + batchSize);
    const { error } = await supabase.from("proveedores").upsert(batch, {
      onConflict: "idproveedor",
    });
    if (error) {
      console.error("Error en lote:", error.message);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`  ${inserted}/${proveedores.length}`);
  }

  console.log("Migración de proveedores completada.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
