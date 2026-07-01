import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/**
 * Cliente Supabase con service role para API routes del servidor.
 * No usar en el navegador.
 */
export function createAdminClient(): SupabaseClient {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  // Corrige URL mal copiada desde la API REST
  url = url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Faltan variables de Supabase. Agrega NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local (reinicia npm run dev después)."
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
