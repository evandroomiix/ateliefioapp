"use client";

import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/ui/Layout";
import { Button } from "@/components/ui/Button";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { mensagemErro } from "@/lib/upload";
import { useToast } from "@/components/ToastProvider";
import { Plus, Mail, UserPlus, Shield, Users, LogOut, RotateCcw } from "lucide-react";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/FormControls";
import { Select } from "@/components/ui/FormControls";
import { PAPEL_LABEL } from "@/lib/types";

type Membro = {
  user_id: string;
  papel: string;
  email: string;
  nome: string | null;
  avatar_url: string | null;
};

export default function LojaPage() {
  const {
    lojaAtiva,
    papel,
    podeGerenciar,
    isAdmin,
    trocarLoja,
    criarLoja,
    lojas,
    recarregar,
    perfil,
    sair,
  } = useAuth();
  const { toast } = useToast();

  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);
  const [conviteOpen, setConviteOpen] = useState(false);
  const [conviteEmail, setConviteEmail] = useState("");
  const [convitePapel, setConvitePapel] = useState<"usuario" | "gerente" | "administrador">("usuario");
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const [novaLojaOpen, setNovaLojaOpen] = useState(false);
  const [novaLojaNome, setNovaLojaNome] = useState("");

  const carregarMembros = useCallback(async () => {
    if (!lojaAtiva) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("membros_loja")
      .select("user_id, papel, perfis (nome, email, avatar_url)")
      .eq("loja_id", lojaAtiva.id);

    if (error) {
      toast(mensagemErro(error), "error");
    } else {
      setMembros(
        (data ?? []).map((m: any) => ({
          user_id: m.user_id,
          papel: m.papel,
          email: m.perfis?.[0]?.email || "",
          nome: m.perfis?.[0]?.nome || null,
          avatar_url: m.perfis?.[0]?.avatar_url || null,
        })),
      );
    }
    setLoading(false);
  }, [lojaAtiva, toast]);

  useEffect(() => {
    carregarMembros();
  }, [carregarMembros]);

  const enviarConvite = async () => {
    if (!lojaAtiva) return;
    setEnviandoConvite(true);
    try {
      const { error } = await supabase.from("convites_loja").insert({
        loja_id: lojaAtiva.id,
        email: conviteEmail.trim(),
        papel: convitePapel,
      });
      if (error) throw error;
      toast("Convite enviado com sucesso!", "success");
      setConviteEmail("");
      setConvitePapel("usuario");
      setConviteOpen(false);
      await carregarMembros();
    } catch (err) {
      toast(mensagemErro(err), "error");
    } finally {
      setEnviandoConvite(false);
    }
  };

  const alterarPapel = async (membro: Membro, novoPapel: string) => {
    if (!lojaAtiva) return;
    const { error } = await supabase
      .from("membros_loja")
      .update({ papel: novoPapel })
      .eq("loja_id", lojaAtiva.id)
      .eq("user_id", membro.user_id);
    if (error) {
      toast(mensagemErro(error), "error");
    } else {
      toast("Papel atualizado.", "success");
      await carregarMembros();
    }
  };

  const removerMembro = async (membro: Membro) => {
    if (!lojaAtiva || !confirm(`Remover ${membro.nome || membro.email} da loja?`)) return;
    const { error } = await supabase
      .from("membros_loja")
      .delete()
      .eq("loja_id", lojaAtiva.id)
      .eq("user_id", membro.user_id);
    if (error) {
      toast(mensagemErro(error), "error");
    } else {
      toast("Membro removido.", "success");
      await carregarMembros();
    }
  };

  const criarNovaLoja = async () => {
    const nova = await criarLoja(novaLojaNome.trim());
    if (nova) {
      setNovaLojaNome("");
      setNovaLojaOpen(false);
      toast("Nova loja criada!", "success");
    }
  };

  if (!lojaAtiva) {
    return (
      <main className="min-h-dvh bg-artisan-grain px-4 py-10">
        <PageHeader
          eyebrow="Minha loja"
          title="Sem loja ativa"
          description="Você ainda não possui uma loja. Crie uma para começar a usar o AteliêFio."
        />
        <div className="card mx-auto mt-6 max-w-md p-6 text-center">
          <p className="text-sm text-stone-500">
            Você ainda não possui uma loja. Crie uma para começar a usar o AteliêFio.
          </p>
          <Button
            className="mt-6"
            onClick={() => setNovaLojaOpen(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            Criar minha loja
          </Button>
        </div>
        <Modal open={novaLojaOpen} onClose={() => setNovaLojaOpen(false)} title="Nova loja">
          <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
              Nome da loja
            </label>
            <Input
              value={novaLojaNome}
              onChange={(e) => setNovaLojaNome(e.target.value)}
              placeholder="Ex: Meu Ateliê de Crochê"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" size="sm" onClick={() => setNovaLojaOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={criarNovaLoja} disabled={!novaLojaNome.trim()}>
              Criar
            </Button>
          </div>
        </Modal>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-artisan-grain px-4 py-10">
      <PageHeader
        eyebrow={`Minha loja — ${lojaAtiva.nome}`}
        title="Equipe & convites"
        description="Gerencie quem tem acesso ao estoque desta loja e com qual papel."
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setNovaLojaOpen(true)}
              icon={<Plus className="h-3 w-3" />}
              disabled={!podeGerenciar}
            >
              Nova loja
            </Button>
            <Button
              size="sm"
              onClick={() => setConviteOpen(true)}
              icon={<UserPlus className="h-3 w-3" />}
              disabled={!podeGerenciar}
            >
              Convidar
            </Button>
            <Button
              size="sm"
              onClick={recarregar}
              icon={<RotateCcw className="h-3 w-3" />}
            >
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={sair}
              icon={<LogOut className="h-3 w-3" />}
              variant="secondary"
            >
              Sair
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="mt-6 flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {membros.map((membro) => {
              const eOwner = membro.user_id === lojaAtiva.criada_por;
              return (
                <article
                  key={membro.user_id}
                  className="card p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold text-xs">
                      {(membro.nome || membro.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">
                        {membro.nome || membro.email}
                      </p>
                      <p className="text-[10px] text-stone-500 truncate">
                        {membro.email}
                      </p>
                    </div>
                    {eOwner && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50/50 px-2 py-0.5 rounded">
                        Dona da loja
                      </span>
                    )}
                  </div>
                  {podeGerenciar && membro.user_id !== (perfil?.id ?? "") ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={membro.papel}
                        onChange={(e) => alterarPapel(membro, e.target.value)}
                        className="flex-1 text-xs"
                      >
                        <option value="administrador">Administrador</option>
                        <option value="gerente">Gerente</option>
                        <option value="usuario">Usuário</option>
                      </Select>
                      <button
                        type="button"
                        onClick={() => removerMembro(membro)}
                        className="h-8 w-8 rounded-xl border border-stone-200 text-stone-500 transition hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Remover membro"
                      >
                        <span className="text-[10px]">×</span>
                      </button>
                    </div>
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      membro.papel === "administrador"
                        ? "bg-rose-50 text-rose-600"
                        : membro.papel === "gerente"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-stone-100 text-stone-500"
                    }`}>
                      {PAPEL_LABEL[membro.papel as keyof typeof PAPEL_LABEL]}
                    </span>
                  )}
                </article>
              );
            })}
            {membros.length === 0 && podeGerenciar && (
              <EmptyState
                icon={<Users className="h-7 w-7" />}
                title="Nenhum membro convidado ainda"
                description="Convide pessoas por e-mail para acessar o estoque desta loja."
                action={
                  <Button onClick={() => setConviteOpen(true)} icon={<UserPlus className="h-4 w-4" />}>
                    Convidar primeira pessoa
                  </Button>
                }
              />
            )}
          </div>

          {podeGerenciar && membros.length > 0 && (
            <div className="mt-6 p-4 rounded-2xl border border-stone-200 bg-stone-50">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3">
                Como funcionam os papéis
              </p>
              <div className="space-y-1 text-xs text-stone-600">
                <p>
                  <Shield className="mr-1 h-3 w-3" />{' '}
                  <strong>Administrador:</strong> controla tudo, inclusive equipe e exclusões.
                </p>
                <p>
                  <UserPlus className="mr-1 h-3 w-3" />{' '}
                  <strong>Gerente:</strong> cadastra materiais, ajusta estoque e edita peças.
                </p>
                <p>
                  <Users className="mr-1 h-3 w-3" />{' '}
                  <strong>Usuário:</strong> consulta o estoque e registra pedidos e baixas.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={conviteOpen} onClose={() => setConviteOpen(false)} title="Convidar pessoa para a loja">
        <div className="space-y-3">
          <p className="text-sm text-stone-500">
            Informe o e-mail da pessoa e o papel que ela terá nesta loja. Ela receberá um convite e, ao aceitar, terá acesso aos dados desta loja.
          </p>
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
              E-mail
            </label>
            <Input
              value={conviteEmail}
              onChange={(e) => setConviteEmail(e.target.value)}
              placeholder="amiga@exemplo.com"
            />
            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
              Papel
            </label>
            <Select
              value={convitePapel}
              onChange={(e) => setConvitePapel(e.target.value as any)}
              className="w-full"
            >
              <option value="usuario">Usuário</option>
              <option value="gerente">Gerente</option>
              <option value="administrador">Administrador</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" size="sm" onClick={() => setConviteOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={enviarConvite}
              disabled={enviandoConvite || !conviteEmail.trim()}
            >
              {enviandoConvite ? "Enviando…" : "Enviar convite"}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
