"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Clock,
  DollarSign,
  Pencil,
  Plus,
  RefreshCw,
  Scissors,
  Sparkles,
} from "lucide-react";
import type { Material, PecaMaterial, PecaProjeto } from "@/lib/types";
import {
  categoriaDoMaterial,
  custoTotalPeca,
  formatCurrency,
  formatNumber,
  formatQuantidade,
  num,
} from "@/lib/format";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { mensagemErro } from "@/lib/upload";
import { PecaForm } from "@/components/PecaForm";
import { SetupNotice } from "@/components/SetupNotice";
import { PageHeader } from "@/components/ui/Layout";
import { Button } from "@/components/ui/Button";
import { CardSkeleton, EmptyState, Skeleton } from "@/components/ui/Feedback";
import { useAuth } from "@/components/AuthProvider";

export default function PecasPage() {
  const {
    carregando: authCarregando,
    configurado,
    lojaAtiva,
    podeGerenciar,
    erro: authErro,
  } = useAuth();
  const [pecas, setPecas] = useState<PecaProjeto[]>([]);
  const [relacoes, setRelacoes] = useState<PecaMaterial[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<PecaProjeto | null>(null);

  const carregar = useCallback(async (mostrarLoader = true) => {
    if (!configurado) {
      setLoading(false);
      return;
    }
    if (!lojaAtiva) {
      setLoading(false);
      return;
    }
    if (mostrarLoader) setLoading(true);
    setErro("");

    const [pecasRes, relacoesRes, materiaisRes] = await Promise.all([
      supabase
        .from("pecas_projetos")
        .select("*")
        .eq("loja_id", lojaAtiva.id)
        .order("nome", { ascending: true }),
      supabase.from("peca_materiais").select("*"),
      supabase
        .from("materiais")
        .select("*")
        .eq("loja_id", lojaAtiva.id)
        .order("nome", { ascending: true }),
    ]);

    const firstError = pecasRes.error || relacoesRes.error || materiaisRes.error;
    if (firstError) {
      setErro(mensagemErro(firstError));
      setLoading(false);
      return;
    }

    setPecas((pecasRes.data ?? []) as PecaProjeto[]);
    setRelacoes((relacoesRes.data ?? []) as PecaMaterial[]);
    setMateriais((materiaisRes.data ?? []) as Material[]);
    setLoading(false);
  }, [configurado, lojaAtiva]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const relacoesPorPeca = useMemo(() => {
    const mapa = new Map<string, PecaMaterial[]>();
    relacoes.forEach((relacao) => {
      const lista = mapa.get(relacao.peca_id) ?? [];
      lista.push(relacao);
      mapa.set(relacao.peca_id, lista);
    });
    return mapa;
  }, [relacoes]);

  const custos = useMemo(() => {
    const mapa = new Map<string, number>();
    pecas.forEach((peca) => {
      mapa.set(
        peca.id,
        custoTotalPeca(relacoesPorPeca.get(peca.id) ?? [], materiais),
      );
    });
    return mapa;
  }, [materiais, pecas, relacoesPorPeca]);

  const abrirNova = () => {
    if (!podeGerenciar) {
      // toast não está disponível aqui, mas o PecaForm já trata via usoAuth
      return;
    }
    setEditando(null);
    setFormOpen(true);
  };

  const abrirEdicao = (peca: PecaProjeto) => {
    if (!podeGerenciar) return;
    setEditando(peca);
    setFormOpen(true);
  };

  return (
    <div>
      {authCarregando ? (
        <div className="min-h-dvh flex flex-col items-center justify-center px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
          <p className="mt-4 text-sm text-stone-500">Entrando no seu ateliê…</p>
        </div>
      ) : authErro ? (
        <div className="mt-6 text-center text-xs text-rose-500">{authErro}</div>
      ) : !lojaAtiva ? (
        <div className="mt-6 text-center">
          <p className="text-sm text-stone-500">
            Você ainda não possui uma loja. Faça login para começar.
          </p>
        </div>
      ) : (
        <>
          <PageHeader
            eyebrow={`Aba 3 · Catálogo — ${lojaAtiva.nome}`}
            title="Peças & receitas"
            description="Seus modelos favoritos, com tempo, materiais e custo sempre à mão."
            action={
              <Button
                size="sm"
                onClick={abrirNova}
                className="hidden sm:inline-flex"
                icon={<Plus className="h-4 w-4" />}
                disabled={!podeGerenciar || !configurado}
              >
                Nova peça
              </Button>
            }
          />

          {!configurado ? <SetupNotice /> : null}

          {configurado ? (
            <>
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : erro ? (
                <div className="card p-6 text-center">
                  <AlertCircle className="mx-auto h-9 w-9 text-rose-500" />
                  <h3 className="mt-3 font-display text-lg font-semibold text-stone-900">
                    Não foi possível carregar o catálogo
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">{erro}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={() => carregar()}
                    icon={<RefreshCw className="h-3 w-3" />}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : pecas.length === 0 ? (
                <EmptyState
                  icon={<Scissors className="h-7 w-7" />}
                  title="Seu catálogo começa com uma peça"
                  description="Cadastre um modelo com foto, tempo de produção e os materiais da receita para calcular o custo."
                  action={
                    <Button
                      onClick={abrirNova}
                      icon={<Plus className="h-4 w-4" />}
                      disabled={!podeGerenciar}
                    >
                      Cadastrar primeira peça
                    </Button>
                  }
                />
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between text-[11px] font-semibold text-stone-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      {pecas.length} peça{pecas.length === 1 ? "" : "s"} no catálogo
                    </span>
                    <button
                      type="button"
                      onClick={() => carregar(false)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-stone-100 hover:text-stone-600"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Atualizar
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {pecas.map((peca) => {
                      const itens = relacoesPorPeca.get(peca.id) ?? [];
                      const custo = custos.get(peca.id) ?? 0;
                      const preco = num(peca.preco_venda_sugerido);
                      const margem = preco - custo;

                      return (
                        <article
                          key={peca.id}
                          className="card group flex flex-col overflow-hidden"
                        >
                          <div className="relative h-44 shrink-0 overflow-hidden bg-stone-100">
                            {peca.foto_peca_url ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={peca.foto_peca_url}
                                  alt={`Foto da peça ${peca.nome}`}
                                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/50 via-transparent to-transparent" />
                              </>
                            ) : (
                              <div className="flex h-full items-center justify-center bg-gradient-to-br from-rose-100 via-rose-50 to-amber-50">
                                <Scissors className="h-10 w-10 text-rose-300" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-stone-950/5 to-transparent" />

                            {peca.tempo_estimado_horas ? (
                              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-stone-700 shadow-sm backdrop-blur">
                                <Clock className="h-3 w-3" />
                                {formatNumber(peca.tempo_estimado_horas, 1)} h
                              </span>
                            ) : null}

                            <div className="absolute inset-x-3 bottom-3">
                              <h3 className="font-display text-xl font-semibold leading-tight text-white drop-shadow-sm">
                                {peca.nome}
                              </h3>
                            </div>
                          </div>

                          <div className="flex flex-1 flex-col p-4">
                            {peca.descricao ? (
                              <p className="line-clamp-2 text-xs leading-relaxed text-stone-500">
                                {peca.descricao}
                              </p>
                            ) : (
                              <p className="text-xs italic text-stone-400">
                                Sem descrição adicionada.
                              </p>
                            )}

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-xl bg-stone-50 px-3 py-2">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                                  Custo material
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-stone-800">
                                  {formatCurrency(custo)}
                                </p>
                              </div>
                              <div className="rounded-xl bg-rose-50 px-3 py-2">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-rose-500">
                                  Venda sugerida
                                </p>
                                <p className="mt-0.5 text-sm font-bold text-rose-800">
                                  {preco > 0 ? formatCurrency(preco) : "A definir"}
                                </p>
                              </div>
                            </div>

                            {preco > 0 ? (
                              <p
                                className={`mt-1.5 text-right text-[10px] font-semibold ${
                                  margem < 0 ? "text-rose-600" : "text-emerald-700"
                                }`}
                              >
                                Margem de material: {formatCurrency(margem)}
                              </p>
                            ) : null}

                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-stone-500">
                                  {itens.length} material{
                                    itens.length !== 1 ? "is" : ""
                                  }
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => abrirEdicao(peca)}
                                  disabled={!podeGerenciar}
                                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-2 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Editar
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="mt-5 space-y-3">
              <Skeleton className="h-24 w-full rounded-3xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
