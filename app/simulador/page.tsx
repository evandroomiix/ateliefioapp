"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Layers,
  PackageMinus,
  Plus,
  RefreshCw,
  Ruler,
  Scissors,
  Trash2,
} from "lucide-react";
import type { Material, PecaMaterial, PecaProjeto } from "@/lib/types";
import { CATEGORIA_MATERIAL } from "@/lib/types";
import {
  calcularBaixa,
  categoriaDoMaterial,
  formatMeters,
  formatNumber,
  formatQuantidade,
  novelosParaCobrir,
  num,
  saldoCalculado,
  totalDisponivel,
  unidadeInfo,
} from "@/lib/format";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { mensagemErro } from "@/lib/upload";
import { useToast } from "@/components/ToastProvider";
import { Modal } from "@/components/Modal";
import { SetupNotice } from "@/components/SetupNotice";
import { PageHeader } from "@/components/ui/Layout";
import { Button } from "@/components/ui/Button";
import { EmptyState, ListSkeleton, Skeleton } from "@/components/ui/Feedback";
import { useAuth } from "@/components/AuthProvider";

type Modo = "peca" | "avulsa";

type Linha = {
  id: string;
  materialId: string;
  metros: string;
  requisito: string | null;
};

type Agregado = {
  material: Material;
  quantidadeNecessaria: number;
  disponivel: number;
  falta: number;
  sobra: number;
  novelosFaltantes: number;
};

function novaChave(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function linhaVazia(requisito: string | null = null, materialId = "", metros = ""): Linha {
  return { id: novaChave(), materialId, metros, requisito };
}

/** Junta quantidades de materiais de mesma unidade em um texto amigável. */
function resumoPorUnidade(
  itens: Agregado[],
  seletor: (item: Agregado) => number,
): string {
  const grupos = new Map<string, number>();

  itens.forEach((item) => {
    const valor = seletor(item);
    if (valor <= 0) return;
    const categoria = categoriaDoMaterial(item.material);
    const chave = categoria === "aviamento" ? unidadeInfo(item.material).short : "m";
    grupos.set(chave, (grupos.get(chave) ?? 0) + valor);
  });

  const partes = Array.from(grupos.entries())
    .filter(([, valor]) => valor > 0)
    .map(([unidade, valor]) =>
      unidade === "m"
        ? formatMeters(valor, 2)
        : `${formatNumber(valor, 2)} ${unidade}`,
    );

  return partes.join(" + ");
}

function rotuloLinha(material: Material | undefined, index: number): string {
  if (!material) return `Material ${index + 1}`;
  return `${CATEGORIA_MATERIAL[categoriaDoMaterial(material)].singular} ${index + 1}`;
}

export default function SimuladorPage() {
  const { toast } = useToast();
  const {
    carregando: authCarregando,
    configurado,
    lojaAtiva,
    podeGerenciar,
    erro: authErro,
  } = useAuth();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [pecas, setPecas] = useState<PecaProjeto[]>([]);
  const [relacoes, setRelacoes] = useState<PecaMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [modo, setModo] = useState<Modo>("peca");
  const [pecaId, setPecaId] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [baixaFeita, setBaixaFeita] = useState("");

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

    const [materiaisRes, pecasRes, relacoesRes] = await Promise.all([
      supabase
        .from("materiais")
        .select("*")
        .eq("loja_id", lojaAtiva.id)
        .order("nome", { ascending: true }),
      supabase
        .from("pecas_projetos")
        .select("*")
        .eq("loja_id", lojaAtiva.id)
        .order("nome", { ascending: true }),
      supabase.from("peca_materiais").select("*"),
    ]);

    const firstError = materiaisRes.error || pecasRes.error || relacoesRes.error;
    if (firstError) {
      setErro(mensagemErro(firstError));
    } else {
      setMateriais((materiaisRes.data ?? []) as Material[]);
      setPecas((pecasRes.data ?? []) as PecaProjeto[]);
      setRelacoes((relacoesRes.data ?? []) as PecaMaterial[]);
    }
    setLoading(false);
  }, [configurado, lojaAtiva]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const materiaisPorId = useMemo(() => {
    return new Map(materiais.map((material) => [material.id, material]));
  }, [materiais]);

  const materiaisAgrupados = useMemo(() => {
    return (["fio_croche", "tecido", "aviamento"] as const).map((categoria) => ({
      categoria,
      itens: materiais.filter((material) => categoriaDoMaterial(material) === categoria),
    }));
  }, [materiais]);

  const pecaSelecionada = pecas.find((peca) => peca.id === pecaId) ?? null;

  const selecionarPeca = (id: string) => {
    setPecaId(id);
    setBaixaFeita("");
    if (!id) {
      setLinhas([]);
      return;
    }
    const requisitos = relacoes.filter((relacao) => relacao.peca_id === id);
    if (requisitos.length > 0) {
      setLinhas(
        requisitos.map((relacao) =>
          linhaVazia(
            relacao.descricao_requisito || "Material da receita",
            relacao.material_id || "",
            relacao.metragem_necessaria != null ? String(relacao.metragem_necessaria) : "",
          ),
        ),
      );
    } else {
      setLinhas([linhaVazia()]);
      toast(
        "Esta peça ainda não tem materiais na receita. Adicione um material abaixo.",
        "info",
      );
    }
  };

  const mudarModo = (novoModo: Modo) => {
    setModo(novoModo);
    setBaixaFeita("");
    if (novoModo === "avulsa") {
      setPecaId("");
      setLinhas([linhaVazia()]);
    } else if (pecaId) {
      selecionarPeca(pecaId);
    } else {
      setLinhas([]);
    }
  };

  const atualizarLinha = (id: string, patch: Partial<Linha>) => {
    setLinhas((current) =>
      current.map((linha) => (linha.id === id ? { ...linha, ...patch } : linha)),
    );
    setBaixaFeita("");
  };

  const removerLinha = (id: string) => {
    setLinhas((current) => current.filter((linha) => linha.id !== id));
  };

  const agregados = useMemo<Agregado[]>(() => {
    const mapa = new Map<string, { material: Material; quantidade: number }>();

    linhas.forEach((linha) => {
      const material = materiaisPorId.get(linha.materialId);
      const quantidade = Math.max(0, num(linha.metros));
      if (!material || quantidade <= 0) return;
      const atual = mapa.get(material.id);
      if (atual) {
        atual.quantidade += quantidade;
      } else {
        mapa.set(material.id, { material, quantidade });
      }
    });

    return Array.from(mapa.values()).map(({ material, quantidade }) => {
      const disponivel = totalDisponivel(material);
      const falta = Math.max(0, quantidade - disponivel);
      return {
        material,
        quantidadeNecessaria: quantidade,
        disponivel,
        falta,
        sobra: Math.max(0, disponivel - quantidade),
        novelosFaltantes:
          categoriaDoMaterial(material) === "fio_croche"
            ? novelosParaCobrir(falta, num(material.metragem_por_unidade))
            : 0,
      };
    });
  }, [linhas, materiaisPorId]);

  const totalNecessario = resumoPorUnidade(agregados, (item) => item.quantidadeNecessaria);
  const totalFalta = resumoPorUnidade(agregados, (item) => item.falta);
  const totalSobra = resumoPorUnidade(agregados, (item) => item.sobra);
  const totalNovelos = agregados.reduce((total, item) => total + item.novelosFaltantes, 0);
  const faltas = agregados.filter((item) => item.falta > 0);
  const temLinhasValidas = agregados.length > 0;
  const suficiente = temLinhasValidas && faltas.length === 0;

  const darBaixa = async () => {
    if (!suficiente) return;
    if (!podeGerenciar) return;
    setProcessando(true);

    try {
      const atualizacoes = agregados.map((item) => ({
        material: item.material,
        quantidade: item.quantidadeNecessaria,
        ...calcularBaixa(item.material, item.quantidadeNecessaria),
      }));

      for (const atualizacao of atualizacoes) {
        const { error } = await supabase
          .from("materiais")
          .update({
            quantidade_unidades: atualizacao.quantidade_unidades,
            metragem_avulsa: atualizacao.metragem_avulsa,
          })
          .eq("id", atualizacao.material.id);

        if (error) throw error;
      }

      setMateriais((current) =>
        current.map((material) => {
          const alteracao = atualizacoes.find(
            (item) => item.material.id === material.id,
          );
          if (!alteracao) return material;
          const saldo = saldoCalculado(
            material,
            alteracao.quantidade_unidades,
            alteracao.metragem_avulsa,
          );
          return {
            ...material,
            quantidade_unidades: alteracao.quantidade_unidades,
            metragem_avulsa: alteracao.metragem_avulsa,
            metragem_total_disponivel: saldo,
            saldo_total_disponivel: saldo,
          };
        }),
      );

      const resumo = `${totalNecessario} reservados de ${
        agregados.length
      } material${agregados.length === 1 ? "" : "is"}. Sobraram ${totalSobra} no ateliê.`;

      setConfirmOpen(false);
      setLinhas([]);
      setBaixaFeita(resumo);
      toast("Baixa no estoque realizada com sucesso!", "success");
      carregar(false);
    } catch (err) {
      toast(`A baixa não foi concluída: ${mensagemErro(err)}`, "error");
    } finally {
      setProcessando(false);
    }
  };

  const semMateriais = !loading && materiais.length === 0;

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
            eyebrow={`Aba 2 · Simulador — ${lojaAtiva.nome}`}
            title="Dá pra fazer?"
            description="Combine fios em metros, tecido de forro e aviamentos na mesma peça antes de começar."
          />

          {!configurado ? <SetupNotice /> : null}

          {configurado ? (
            <>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full rounded-3xl" />
                  <Skeleton className="h-40 w-full rounded-3xl" />
                  <ListSkeleton rows={2} />
                </div>
              ) : erro ? (
                <div className="card p-6 text-center">
                  <AlertCircle className="mx-auto h-9 w-9 text-rose-500" />
                  <h3 className="mt-3 font-display text-lg font-semibold text-stone-900">
                    Não foi possível abrir o simulador
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
              ) : semMateriais ? (
                <EmptyState
                  icon={<Layers className="h-7 w-7" />}
                  title="Cadastre um material para simular"
                  description="O simulador precisa de fios, tecidos ou aviamentos no estoque para comparar com a peça."
                  action={
                    <Link href="/">
                      <Button icon={<Plus className="h-4 w-4" />}>Ir para o estoque</Button>
                    </Link>
                  }
                />
              ) : (
                <>
                  {baixaFeita ? (
                    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      <div className="flex-1">
                        <p className="text-sm font-bold">Baixa realizada!</p>
                        <p className="text-xs leading-relaxed">{baixaFeita}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModo("peca")}
                      className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                        modo === "peca"
                          ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                          : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                      }`}
                    >
                      <Scissors className="h-3.5 w-3.5" />
                      Peça da receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setModo("avulsa")}
                      className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                        modo === "avulsa"
                          ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                          : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Materiais avulsos
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 sm:mt-0.5">
                        Selecionar peça
                      </label>
                      <select
                        value={pecaId}
                        onChange={(e) => {
                          mudarModo("peca");
                          setPecaId(e.target.value);
                        }}
                        className="flex-1 input-base h-12 text-xs pr-8"
                      >
                        <option value="">Escolha uma peça…</option>
                        {pecas.map((peca) => (
                          <option key={peca.id} value={peca.id}>
                            {peca.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {linhas.map((linha) => {
                      const material = materiaisPorId.get(linha.materialId);
                      const disponivel = material ? totalDisponivel(material) : 0;
                      const categoria = material ? categoriaDoMaterial(material) : null;
                      const unidade = material ? unidadeInfo(material) : null;
                      const agregado = agregados.find((a) => a.material.id === linha.materialId);
                      const falta = agregado ? agregado.falta : 0;

                      return (
                        <div
                          key={linha.id}
                          className="card flex flex-col sm:flex-row items-center justify-between gap-2 p-3"
                        >
                          <div className="flex-1 min-w-0 flex flex-col sm:flex-row items-center gap-2">
                            <select
                              value={linha.materialId}
                              onChange={(e) =>
                                atualizarLinha(linha.id, { materialId: e.target.value })
                              }
                              className="input-base h-10 text-xs pr-8 flex-1 sm:flex-1"
                            >
                              <option value="">Escolha o material…</option>
                              {materiaisAgrupados.map((grupo) => (
                                <optgroup
                                  key={grupo.categoria}
                                  label={
                                    CATEGORIA_MATERIAL[grupo.categoria].label
                                  }
                                >
                                  {grupo.itens.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.nome}{m.marca ? ` · ${m.marca}` : ""}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                            {material && (
                              <span className="mt-1 sm:mt-0 text-[10px] text-stone-400">
                                {disponivel > 0
                                  ? `Disponível: ${formatNumber(disponivel, 1)}${
                                      unidade?.short || ""
                                    }`
                                  : "Sem estoque"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-1 sm:flex-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={linha.metros}
                              onChange={(e) =>
                                atualizarLinha(linha.id, { metros: e.target.value })
                              }
                              placeholder="0,00"
                              className="input-base h-10 text-xs"
                              aria-label={`Quantidade de ${material?.nome || "material"}`}
                            />
                            <button
                              type="button"
                              onClick={() => removerLinha(linha.id)}
                              className="h-10 w-10 rounded-xl border border-stone-200 text-stone-500 transition hover:bg-rose-50 hover:text-rose-600"
                              aria-label="Remover linha"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {falta > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 whitespace-nowrap">
                              Falta {formatNumber(falta, 2)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {linhas.length === 0 && (
                      <p className="text-[11px] text-center text-stone-400">
                        Nenhum material adicionado ainda.
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-stone-200">
                    <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-xl bg-stone-50 px-3 py-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                          Total necessário
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-stone-800">
                          {totalNecessario || "—"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-amber-50 px-3 py-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-amber-800">
                          Total em falta
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-amber-900">
                          {totalFalta || "—"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 px-3 py-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                          Sobra estimada
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-emerald-900">
                          {totalSobra || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmOpen(true)}
                        disabled={!suficiente || !podeGerenciar || processando}
                        className="flex-1 h-11 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-700"
                      >
                        {processando ? "Processando…" : "Dar baixa no estoque"}
                      </button>
                    </div>

                    {!suficiente && temLinhasValidas && podeGerenciar ? (
                      <p className="mt-2 text-[11px] text-rose-600">
                        Não há estoque suficiente para alguns materiais.
                      </p>
                    ) : null}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="mt-5 space-y-3">
              <Skeleton className="h-24 w-full rounded-3xl" />
              <Skeleton className="h-40 w-full rounded-3xl" />
              <ListSkeleton rows={2} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
