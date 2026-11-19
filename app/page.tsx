"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Boxes,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Ruler,
  Scissors,
  Search,
  SearchX,
  X,
} from "lucide-react";
import type { CategoriaMaterial, Material } from "@/lib/types";
import { CATEGORIAS_MATERIAL, CATEGORIA_MATERIAL } from "@/lib/types";
import {
  categoriaDoMaterial,
  estoqueBaixo,
  formatNumber,
  num,
  round,
  saldoCalculado,
  unidadeInfo,
} from "@/lib/format";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { mensagemErro } from "@/lib/upload";
import { useToast } from "@/components/ToastProvider";
import { MaterialCard } from "@/components/MaterialCard";
import { MaterialForm } from "@/components/MaterialForm";
import { AjusteModal } from "@/components/AjusteModal";
import { SetupNotice } from "@/components/SetupNotice";
import { PageHeader, StatCard } from "@/components/ui/Layout";
import { Button } from "@/components/ui/Button";
import { CardSkeleton, EmptyState, Skeleton } from "@/components/ui/Feedback";
import { useAuth } from "@/components/AuthProvider";

type FiltroCampo = "todas" | "cor" | "marca" | "tex";

const filtros: { id: FiltroCampo; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "cor", label: "Cor" },
  { id: "marca", label: "Marca" },
  { id: "tex", label: "Tex" },
];

function normalizar(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export default function EstoquePage() {
  const { toast } = useToast();
  const {
    carregando: authCarregando,
    configurado,
    lojaAtiva,
    papel,
    podeGerenciar,
    erro: authErro,
    recarregar,
  } = useAuth();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<"todas" | CategoriaMaterial>(
    "todas",
  );
  const [campo, setCampo] = useState<FiltroCampo>("todas");
  const [valorFiltro, setValorFiltro] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Material | null>(null);
  const [ajustando, setAjustando] = useState<Material | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
    const { data, error } = await supabase
      .from("materiais")
      .select("*")
      .eq("loja_id", lojaAtiva.id)
      .order("nome", { ascending: true });

    if (error) {
      setErro(mensagemErro(error));
      setMateriais([]);
    } else {
      setMateriais((data ?? []) as Material[]);
    }
    setLoading(false);
  }, [configurado, lojaAtiva]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    setValorFiltro("");
  }, [campo]);

  const valoresDisponiveis = useMemo(() => {
    if (campo === "todas") return [];
    const values = materiais
      .filter(
        (material) =>
          categoriaFiltro === "todas" ||
          categoriaDoMaterial(material) === categoriaFiltro,
      )
      .map((material) => {
        if (campo === "cor") return material.cor_nome;
        if (campo === "marca") return material.marca;
        return material.tex != null ? String(material.tex) : null;
      })
      .filter((value): value is string => Boolean(value && value.trim()));
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [campo, categoriaFiltro, materiais]);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return materiais.filter((material) => {
      if (
        categoriaFiltro !== "todas" &&
        categoriaDoMaterial(material) !== categoriaFiltro
      ) {
        return false;
      }
      if (campo !== "todas" && valorFiltro) {
        const value =
          campo === "cor"
            ? material.cor_nome
            : campo === "marca"
              ? material.marca
              : material.tex != null
                ? String(material.tex)
                : null;
        if (value !== valorFiltro) return false;
      }
      if (!termo) return true;
      const haystack = [
        material.nome,
        material.marca,
        material.cor_nome,
        material.cor_codigo,
        material.lote,
        material.tex,
        material.composicao,
        material.agulha_recomendada,
        material.tamanho_especificacao,
        material.largura_tecido_cm,
        material.categoria,
        material.unidade_controle,
      ]
        .filter(Boolean)
        .join(" ");
      return normalizar(haystack).includes(termo);
    });
  }, [busca, campo, categoriaFiltro, materiais, valorFiltro]);

  const contagens = useMemo(() => {
    let fios = 0;
    let tecidos = 0;
    let aviamentos = 0;
    let baixos = 0;

    materiais.forEach((material) => {
      const categoria = categoriaDoMaterial(material);
      if (categoria === "fio_croche") fios += 1;
      else if (categoria === "tecido") tecidos += 1;
      else aviamentos += 1;
      if (estoqueBaixo(material)) baixos += 1;
    });

    return { fios, tecidos, aviamentos, baixos };
  }, [materiais]);

  const ajustarRapido = async (material: Material, delta: number) => {
    if (!podeGerenciar) {
      toast("Apenas administradores e gerentes podem ajustar o estoque.", "info");
      return;
    }
    const categoria = categoriaDoMaterial(material);
    const isFio = categoria === "fio_croche";
    const isTecido = categoria === "tecido";

    const anteriorQtd = num(material.quantidade_unidades);
    const anteriorAvulsa = num(material.metragem_avulsa);
    const proximaQtd =
      categoria === "tecido"
        ? anteriorQtd
        : isFio
          ? Math.max(0, Math.round(anteriorQtd + delta))
          : Math.max(0, round(anteriorQtd + delta, 2));
    const proximaAvulsa = isTecido
      ? Math.max(0, round(anteriorAvulsa + delta, 2))
      : anteriorAvulsa;

    if (isFio && proximaQtd === anteriorQtd) return;
    if (isTecido && proximaAvulsa === anteriorAvulsa) return;

    setBusyId(material.id);
    setMateriais((current) =>
      current.map((item) =>
        item.id === material.id
          ? {
              ...item,
              quantidade_unidades: proximaQtd,
              metragem_avulsa: proximaAvulsa,
              metragem_total_disponivel: saldoCalculado(
                item,
                proximaQtd,
                proximaAvulsa,
              ),
              saldo_total_disponivel: saldoCalculado(
                item,
                proximaQtd,
                proximaAvulsa,
              ),
            }
          : item,
      ),
    );

    const payload = isTecido
      ? { metragem_avulsa: proximaAvulsa }
      : { quantidade_unidades: proximaQtd };

    const { error } = await supabase
      .from("materiais")
      .update(payload)
      .eq("id", material.id);

    if (error) {
      setMateriais((current) =>
        current.map((item) =>
          item.id === material.id
            ? {
                ...item,
                quantidade_unidades: material.quantidade_unidades,
                metragem_avulsa: material.metragem_avulsa,
                metragem_total_disponivel: material.metragem_total_disponivel,
                saldo_total_disponivel: material.saldo_total_disponivel,
              }
            : item,
        ),
      );
      toast(mensagemErro(error), "error");
    } else {
      const sinal = delta > 0 ? "+1" : "-1";
      toast(
        isFio
          ? `${material.nome}: ${sinal} novelo (${proximaQtd} fechado${
              proximaQtd === 1 ? "" : "s"
            }).`
          : isTecido
            ? `${material.nome}: ${sinal} m de tecido (${formatNumber(
                proximaAvulsa,
                2,
              )} m no rolo).`
            : `${material.nome}: ${sinal} ${
                unidadeInfo(material).short
              } (${formatNumber(proximaQtd, 2)} em estoque).`,
        "success",
      );
    }
    setBusyId(null);
  };

  const abrirNovo = () => {
    if (!podeGerenciar) {
      toast("Apenas administradores e gerentes podem cadastrar materiais.", "info");
      return;
    }
    setEditando(null);
    setFormOpen(true);
  };

  const abrirEdicao = (material: Material) => {
    if (!podeGerenciar) {
      toast("Apenas administradores e gerentes podem editar materiais.", "info");
      return;
    }
    setEditando(material);
    setFormOpen(true);
  };

  const salvarMaterial = async (payload: any, material: Material | null) => {
    const request = material
      ? supabase.from("materiais").update(payload).eq("id", material.id)
      : supabase.from("materiais").insert({ ...payload, loja_id: lojaAtiva!.id });
    const { error } = await request;
    if (error) throw error;
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
            eyebrow={`Aba 1 · Estoque — ${lojaAtiva.nome}`}
            title="Fios, tecidos & aviamentos"
            description="Tudo o que você tem no ateliê — fios em metros, tecidos em rolos e aviamentos por unidade."
            action={
              <Button
                size="sm"
                onClick={abrirNovo}
                className="hidden sm:inline-flex"
                icon={<Plus className="h-4 w-4" />}
                disabled={!podeGerenciar}
              >
                Novo material
              </Button>
            }
          />

          {!configurado ? <SetupNotice /> : null}

          {configurado ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <StatCard
                  label="Fios"
                  value={loading ? "—" : formatNumber(contagens.fios, 0)}
                  icon={<Layers className="h-3.5 w-3.5" />}
                />
                <StatCard
                  label="Tecidos"
                  value={loading ? "—" : formatNumber(contagens.tecidos, 0)}
                  icon={<Ruler className="h-3.5 w-3.5" />}
                />
                <StatCard
                  label="Aviamentos"
                  value={loading ? "—" : formatNumber(contagens.aviamentos, 0)}
                  icon={<Boxes className="h-3.5 w-3.5" />}
                />
              </div>

              {!loading && contagens.baixos > 0 ? (
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <p className="text-[11px] font-semibold leading-relaxed text-rose-800">
                    {contagens.baixos}{" "}
                    {contagens.baixos === 1
                      ? "material precisa"
                      : "materiais precisam"}{" "}
                    de reposição — saldo igual ou abaixo do estoque mínimo.
                  </p>
                </div>
              ) : null}

              <div className="mt-5 space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    type="search"
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Buscar fio, tecido, aviamento, cor ou lote..."
                    className="input-base h-12 pl-10 pr-10"
                    aria-label="Buscar materiais"
                  />
                  {busca ? (
                    <button
                      type="button"
                      onClick={() => setBusca("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-stone-400 hover:bg-stone-100"
                      aria-label="Limpar busca"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCategoriaFiltro("todas");
                        setCampo("todas");
                        setValorFiltro("");
                      }}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                        categoriaFiltro === "todas"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "border border-stone-200 bg-white text-stone-500 hover:border-rose-200"
                      }`}
                    >
                      Todos ({materiais.length})
                    </button>
                    {CATEGORIAS_MATERIAL.map((categoria) => {
                      const ativo = categoriaFiltro === categoria;
                      const Icone =
                        categoria === "fio_croche"
                          ? Scissors
                          : categoria === "tecido"
                            ? Layers
                            : Boxes;
                      const total =
                        categoria === "fio_croche"
                          ? contagens.fios
                          : categoria === "tecido"
                            ? contagens.tecidos
                            : contagens.aviamentos;
                      return (
                        <button
                          key={categoria}
                          type="button"
                          onClick={() => {
                            setCategoriaFiltro(categoria);
                            setValorFiltro("");
                          }}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                            ativo
                              ? "bg-rose-600 text-white shadow-sm"
                              : "border border-stone-200 bg-white text-stone-500 hover:border-rose-200"
                          }`}
                        >
                          <Icone className="h-3.5 w-3.5" />
                          {CATEGORIA_MATERIAL[categoria].plural} ({total})
                        </button>
                      );
                    })}
                  </div>

                  <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
                    {filtros.map((filtro) => (
                      <button
                        key={filtro.id}
                        type="button"
                        onClick={() => setCampo(filtro.id)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                          campo === filtro.id
                            ? "bg-stone-900 text-white shadow-sm"
                            : "border border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                        }`}
                      >
                        {filtro.label}
                      </button>
                    ))}
                  </div>

                  {campo !== "todas" && valoresDisponiveis.length > 0 ? (
                    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
                      <button
                        type="button"
                        onClick={() => setValorFiltro("")}
                        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                          !valorFiltro
                            ? "bg-rose-100 text-rose-800"
                            : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                        }`}
                      >
                        Qualquer {campo}
                      </button>
                      {valoresDisponiveis.map((valor) => (
                        <button
                          key={valor}
                          type="button"
                          onClick={() => setValorFiltro(valor)}
                          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                            valorFiltro === valor
                              ? "bg-rose-100 text-rose-800"
                              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                          }`}
                        >
                          {valor}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {!loading && !erro && materiais.length > 0 ? (
                <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-stone-400">
                  <span>
                    {filtrados.length} de {materiais.length}{" "}
                    {materiais.length === 1 ? "material" : "materiais"}
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
              ) : null}

              <section className="mt-3">
                {loading ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                  </div>
                ) : erro ? (
                  <div className="card p-6 text-center">
                    <AlertCircle className="mx-auto h-9 w-9 text-rose-500" />
                    <h3 className="mt-3 font-display text-lg font-semibold text-stone-900">
                      Não foi possível carregar o estoque
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">{erro}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-4"
                      onClick={() => carregar()}
                      icon={<RefreshCw className="h-3.5 w-3.5" />}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                ) : materiais.length === 0 ? (
                  <EmptyState
                    icon={<Package className="h-7 w-7" />}
                    title="Seu ateliê está pronto para o primeiro material"
                    description="Cadastre fios, tecidos de forro ou aviamentos com foto, lote e saldo para acompanhar tudo com precisão."
                    action={
                      <Button onClick={abrirNovo} icon={<Plus className="h-4 w-4" />}>
                        Cadastrar primeiro material
                      </Button>
                    }
                  />
                ) : filtrados.length === 0 ? (
                  <EmptyState
                    icon={<SearchX className="h-7 w-7" />}
                    title={
                      categoriaFiltro === "todas"
                        ? "Nenhum material encontrado"
                        : `Nenhum ${CATEGORIA_MATERIAL[categoriaFiltro].singular.toLowerCase()} encontrado`
                    }
                    description="Tente outro termo de busca ou limpe os filtros para ver todo o estoque."
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setBusca("");
                          setCategoriaFiltro("todas");
                          setCampo("todas");
                          setValorFiltro("");
                        }}
                      >
                        Limpar filtros
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filtrados.map((material) => (
                      <MaterialCard
                        key={material.id}
                        material={material}
                        busy={busyId === material.id}
                        onEdit={abrirEdicao}
                        onAdjust={setAjustando}
                        onQuickAdjust={ajustarRapido}
                      />
                    ))}
                  </div>
                )}
              </section>

              {!loading && !erro ? (
                <p className="mt-6 text-center text-[11px] leading-relaxed text-stone-400">
                  O saldo total é recalculado pelo banco a cada ajuste de novelos, metragem ou
                  quantidade.
                </p>
              ) : null}
            </>
          ) : (
            <div className="mt-5 space-y-3">
              <Skeleton className="h-24 w-full rounded-3xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          )}

          <button
            type="button"
            onClick={abrirNovo}
            disabled={!podeGerenciar}
            className="fab-safe fixed right-4 z-40 inline-flex h-14 items-center gap-2 rounded-2xl bg-rose-600 pl-4 pr-5 text-sm font-bold text-white shadow-float transition active:scale-95 disabled:opacity-50 sm:hidden"
          >
            <Plus className="h-5 w-5" />
            Novo material
          </button>

          <MaterialForm
            open={formOpen}
            material={editando}
            onClose={() => setFormOpen(false)}
            onSaved={() => carregar(false)}
          />
          <AjusteModal
            open={Boolean(ajustando)}
            material={ajustando}
            onClose={() => setAjustando(null)}
            onSaved={() => carregar(false)}
          />
        </>
      )}
    </div>
  );
}
