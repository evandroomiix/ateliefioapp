import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("seu-projeto") &&
    !supabaseAnonKey.includes("sua-chave"),
);

let client: SupabaseClient | null = null;

/**
 * Cliente do navegador (com sessão persistida em cookie, para que o middleware
 * consiga validar o usuário no servidor).
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      supabaseUrl || "https://placeholder.supabase.co",
      supabaseAnonKey || "placeholder-anon-key",
    );
  }
  return client;
}

/**
 * Mantém a API antiga (`supabase.from(...)`) funcionando sem criar o cliente
 * durante a renderização no servidor.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const instance = getSupabase();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
