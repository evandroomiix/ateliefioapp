import { supabase } from "./supabase";
import { slugify } from "./format";

/**
 * Envia a imagem para o bucket público "amostras" e devolve a URL pública.
 */
export async function uploadImagem(file: File, folder: "amostras" | "pecas"): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const baseName = slugify(file.name.replace(/\.[^.]+$/, "")) || "foto";
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${folder}/${baseName}-${unique}.${extension}`;

  const { error } = await supabase.storage.from("amostras").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || `image/${extension}`,
  });

  if (error) {
    throw new Error(
      error.message.includes("Bucket not found")
        ? "O bucket público 'amostras' não foi encontrado no Supabase Storage."
        : `Não foi possível enviar a foto: ${error.message}`,
    );
  }

  const { data } = supabase.storage.from("amostras").getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error("A foto foi enviada, mas não foi possível obter a URL pública.");
  }
  return data.publicUrl;
}

export function mensagemErro(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}
