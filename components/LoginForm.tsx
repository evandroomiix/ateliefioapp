"use client";

import { useState } from "react";
import { AlertCircle, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { mensagemErro } from "@/lib/upload";
import { YarnLogo } from "@/components/YarnLogo";

export function LoginForm({
  next,
  erroInicial,
}: {
  next: string;
  erroInicial?: string;
}) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(
    erroInicial === "callback"
      ? "Não foi possível concluir o login com o Google. Tente novamente."
      : "",
  );

  const entrarComGoogle = async () => {
    if (!isSupabaseConfigured) {
      setErro("Supabase não configurado no .env.local.");
      return;
    }

    setCarregando(true);
    setErro("");
    try {
      const destino = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        next || "/",
      )}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: destino,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (err) {
      setErro(mensagemErro(err));
      setCarregando(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-rose-600 text-white shadow-lg shadow-rose-600/25">
          <YarnLogo className="h-10 w-10" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-stone-900">
          AteliêFio
        </h1>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-stone-400">
          gestão do ateliê
        </p>
        <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-stone-500">
          Entre com sua conta Google para acessar o estoque, as receitas e os
          pedidos do seu ateliê.
        </p>
      </div>

      <div className="card mt-8 p-5">
        <button
          type="button"
          onClick={entrarComGoogle}
          disabled={carregando}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-bold text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 active:scale-[0.99] disabled:opacity-60"
        >
          {carregando ? (
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.86c2.26-2.09 3.56-5.17 3.56-8.87Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
              />
            </svg>
          )}
          {carregando ? "Abrindo o Google..." : "Entrar com Google"}
        </button>

        {erro ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold leading-relaxed text-rose-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {erro}
          </p>
        ) : null}

        <div className="mt-4 rounded-2xl bg-amber-50/80 p-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800">
            <Sparkles className="h-3.5 w-3.5" />
            No primeiro acesso
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-amber-900/80">
            Criamos automaticamente o seu ateliê. Depois você convida a equipe
            por e-mail e define quem é administrador, gerente ou usuário.
          </p>
        </div>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-stone-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        Seus dados ficam isolados por loja
      </p>
    </div>
  );
}
