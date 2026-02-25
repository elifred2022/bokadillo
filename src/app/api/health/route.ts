import { NextResponse } from "next/server";
import { getGoogleSheetsClient } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

/**
 * Verifica la conexión con Google Sheets (proyecto Bokadillo).
 * GET /api/health → prueba credenciales y acceso al spreadsheet.
 */
export async function GET() {
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId =
      process.env.GOOGLE_SHEET_ID?.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] ??
      process.env.GOOGLE_SHEET_ID ??
      "";

    if (!spreadsheetId) {
      return NextResponse.json(
        {
          ok: false,
          error: "GOOGLE_SHEET_ID no configurado",
        },
        { status: 500 }
      );
    }

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const titulo = spreadsheet.data.properties?.title ?? "Sin título";
    const hojas =
      spreadsheet.data.sheets?.map((s) => s.properties?.title).filter(Boolean) ?? [];

    return NextResponse.json({
      ok: true,
      mensaje: "Conexión con Google Sheets exitosa",
      proyecto: "Bokadillo",
      spreadsheet: {
        id: spreadsheetId,
        titulo,
        hojas,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error en /api/health (Google Sheets):", err);

    let mensaje = "Error desconocido";
    let detalle = err.message;

    if (err.message?.includes("Faltan credenciales")) {
      mensaje = "Credenciales de Google no configuradas";
    } else if (err.message?.includes("invalid_grant") || err.message?.includes("unauthorized")) {
      mensaje = "Credenciales inválidas o expiradas";
    } else if (err.message?.includes("404") || err.message?.includes("not found")) {
      mensaje = "Spreadsheet no encontrado. Verifica GOOGLE_SHEET_ID y que la cuenta de servicio tenga acceso.";
    } else if (err.message?.includes("403") || err.message?.includes("permission")) {
      mensaje = "Sin permiso para acceder al spreadsheet. Comparte la hoja con el email de la cuenta de servicio.";
    }

    return NextResponse.json(
      {
        ok: false,
        error: mensaje,
        detalle,
      },
      { status: 500 }
    );
  }
}
