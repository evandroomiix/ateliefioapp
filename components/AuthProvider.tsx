"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Loja, Papel, Perfil } from "@/lib/types";

const LOJA_STORAGE_KEY = "ateliefio:loja-ativa";

type LojaComPapel = {
  loja: Loja;
  papel: Papel;
};

type AuthContextValue = {
  carregando: boolean;
  configurado: boolean;
  user: User | null;
  perfil: Perfil | null;
  lojas: LojaComPapel[];
  lojaAtiva: Loja | null;
  papel: Papel | null;
  podeGerenciar: boolean;
  isAdmin: boolean;
  erro: string;
  trocarLoja: (lojaId: string) => void;
  criarLoja: (nome: string) => Promise<Loja | null>;
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [lojas, setLojas] = useState<LojaComPapel[]>([]);
  const [lojaId, setLojaId] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setCarregando(false);
      return;
    }

    setErro("");
    const {
      data: { user: usuario },
    } = await supabase.auth.getUser();

    if (!usuario) {
      setUser(null);
      setPerfil(null);
      setLojas([]);
      setLojaId(null);
      setCarregando(false);
      return;
    }

    setUser(usuario);

    // Vincula convites pendentes enviados para o e-mail desta conta.
    await supabase.rpc("resgatar_convites");

    const [perfilRes, membrosRes] = await Promise.all([
      supabase
        .from("perfis")
        .select("id, nome, email, avatar_url")
        .eq("id", usuario.id)
        .maybeSingle(),
      supabase
        .from("membros_loja")
        .select("loja_id, papel, lojas (id, nome, criada_por)")
        .eq("user_id", usuario.id),
    ]);

    let lista: LojaComPapel[] = (membrosRes.data ?? [])
      .map((membro) => {
        const loja = Array.isArray(membro.lojas) ? membro.lojas[0] : membro.lojas;
        if (!loja) return null;
        return { loja: loja as Loja, papel: membro.papel as Papel };
      })
      .filter((item): item is LojaComPapel => Boolean(item));

    // Primeiro acesso sem loja (por exemplo, se o trigger não existia): cria.
    if (lista.length === 0) {
      const { data: nova } = await supabase.rpc("criar_loja", {
        p_nome: "Meu ateliê",
      });
      if (nova) {
        await supabase
          .from("perfis")
          .upsert({
            id: usuario.id,
            nome:
              (usuario.user_metadata?.full_name as string | undefined) ||
              usuario.email?.split("@")[0] ||
              null,
            email: usuario.email ?? null,
            avatar_url:
              (usuario.user_metadata?.avatar_url as string | undefined) || null,
          })
          .select()
          .maybeSingle();

        const { data: membros } = await supabase
          .from("membros_loja")
          .select("loja_id, papel, lojas (id, nome, criada_por)")
          .eq("user_id", usuario.id);

        lista = (membros ?? [])
          .map((membro) => {
            const loja = Array.isArray(membro.lojas)
              ? membro.lojas[0]
              : membro.lojas;
            if (!loja) return null;
            return { loja: loja as Loja, papel: membro.papel as Papel };
          })
          .filter((item): item is LojaComPapel => Boolean(item));
      }
    }

    const perfilData = perfilRes.data as Perfil | null;
    setPerfil(
      perfilData ?? {
        id: usuario.id,
        nome:
          (usuario.user_metadata?.full_name as string | undefined) ||
          usuario.email?.split("@")[0] ||
          null,
        email: usuario.email ?? null,
        avatar_url:
          (usuario.user_metadata?.avatar_url as string | undefined) || null,
      },
    );

    if (membrosRes.error) setErro(membrosRes.error.message);

    setLojas(lista);

    if (lista.length === 0) {
      setLojaId(null);
    } else {
      const salva =
        typeof window !== "undefined"
          ? window.localStorage.getItem(LOJA_STORAGE_KEY)
          : null;
      const ativa = lista.find((item) => item.loja.id === salva) ?? lista[0];
      setLojaId(ativa.loja.id);
    }

    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const trocarLoja = useCallback((novoId: string) => {
    setLojaId(novoId);
    try {
      window.localStorage.setItem(LOJA_STORAGE_KEY, novoId);
    } catch {
      // Ignora navegadores sem localStorage.
    }
  }, []);

  const criarLoja = useCallback(
    async (nome: string) => {
      const { data, error } = await supabase.rpc("criar_loja", {
        p_nome: nome,
      });
      if (error || !data) {
        setErro(error?.message || "Não foi possível criar a loja.");
        return null;
      }
      await carregar();
      const nova = (data as string) || null;
      if (nova) trocarLoja(nova);
      return nova ? ({ id: nova, nome, criada_por: null } as Loja) : null;
    },
    [carregar, trocarLoja],
  );

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LOJA_STORAGE_KEY);
    }
    router.replace("/login");
    router.refresh();
  }, [router]);

  const { lojaAtiva, papel } = useMemo(() => {
    const ativa = lojas.find((item) => item.loja.id === lojaId) ?? null;
    return { lojaAtiva: ativa?.loja ?? null, papel: ativa?.papel ?? null };
  }, [lojas, lojaId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      carregando,
      configurado: isSupabaseConfigured,
      user,
      perfil,
      lojas,
      lojaAtiva,
      papel,
      podeGerenciar: papel === "administrador" || papel === "gerente",
      isAdmin: papel === "administrador",
      erro,
      trocarLoja,
      criarLoja,
      recarregar: carregar,
      sair,
    }),
    [
      carregando,
      user,
      perfil,
      lojas,
      lojaAtiva,
      papel,
      erro,
      trocarLoja,
      criarLoja,
      carregar,
      sair,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider.");
  }
  return context;
}
