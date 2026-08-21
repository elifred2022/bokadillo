import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function envVal(name: string): string {
  let v = process.env[name]?.trim() ?? "";
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/**
 * Cliente Supabase con service role para API routes del servidor.
 * No usar en el navegador.
 */
export function createAdminClient(): SupabaseClient {
  // Bracket access: Next no incrusta NEXT_PUBLIC_* en build (Vercel Sensitive).
  let url =
    envVal("SUPABASE_URL") || envVal("NEXT_PUBLIC_SUPABASE_URL");
  url = url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");

  const key =
    envVal("SUPABASE_SERVICE_ROLE_KEY") ||
    envVal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    envVal("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY");

  if (!url || !key) {
    const faltan = [
      !url ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !key ? "SUPABASE_SERVICE_ROLE_KEY" : null,
    ].filter(Boolean);
    throw new Error(
      `Faltan variables de Supabase en el servidor: ${faltan.join(", ")}. En Vercel hay que agregarlas y hacer Redeploy.`
    );
  }

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { "x-client-info": "bokadillo-server" },
      },
    });
  }

  return adminClient;
}

export function mensajeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Error desconocido";
}
