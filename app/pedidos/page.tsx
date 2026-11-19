"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Package,
  PackageMinus,
  Pencil,
  Plus,
  RefreshCw,
  Scissors,
  User,
} from "lucide-react";
import type {
  Material,
  PecaMaterial,
  PecaProjeto,
  PedidoProducao,
  StatusPedido,
} from "@/lib/types";
import { STATUS_ORDER, STATUS_PEDIDO } from "@/lib/types";
import {
  calcularBaixa,
  categoriaDoMaterial,
  formatDate,
  formatMeters,
  formatNumber,
  formatQuantidade,
  novelosParaCobrir,
  num,
  saldoCalculado,
  todayISO,
  totalDisponivel,
  unidadeInfo,
} from "@/lib/format";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { mensagemErro } from "@/lib/upload";
import { PedidoForm } from "@/components/PedidoForm";
import { Modal } from "@/components/Modal";
import { SetupNotice } from "@/components/SetupNotice";
import { useToast } from "@/components/ToastProvider";
import { PageHeader, StatCard } from "@/components/ui/Layout";
import { Button } from "@/components/ui/Button";
import { EmptyState, ListSkeleton } from "@/components/ui/Feedback";
import { useAuth } from "@/components/AuthProvider";

const proximoStatus: Record<StatusPedido, StatusPedido | null> = {
  orcamento: "em_producao",
  em_producao: "concluido",
  concluido: "entregue",
  entregue: null,
};

const rotuloAcao: Record<StatusPedido, string> = {
  orcamento: "Iniciar produção",
  em_producao: "Concluir",
  concluido: "Marcar entregue",
  entregue: "",
};

const filtrosPedido: Array<"todos" | StatusPedido> = ["todos", ...STATUS_ORDER];

type ItemBaixa = {
  key: string;
  material: Material | undefined;
  quantidade: number;
  disponivel: number;
  falta: number;
  novelos: number;
};

export default function PedidosPage() {
  const { toast } = useToast();
  const {
    carregando: authCarregando,
    configurado,
    lojaAtiva,
    podeGerenciar,
    erro: authErro,
  } = useAuth();
  const [pedidos, setPedidos] = useState<PedidoProducao[]>([]);
  const [pecas, setPecas] = useState<PecaProjeto[]>([]);
  const [relacoes, setRelacoes] = useState<PecaMaterial[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<"todos" | StatusPedido>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<PedidoProducao | null>(null);
  const [baixaPedido, setBaixaPedido] = useState<PedidoProducao | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [processandoBaixa, setProcessandoBaixa] = useState(false);

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

    const [pedidosRes, pecasRes, relacoesRes, materiaisRes] = await Promise.all([
      supabase
        .from("pedidos_producao")
        .select("*")
        .eq("loja_id", lojaAtiva.id),
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

    const firstError =
      pedidosRes.error || pecasRes.error || relacoesRes.error || materiaisRes.error;

    if (firstError) {
      setErro(mensagemErro(firstError));
      setLoading(false);
      return;
    }

    setPedidos((pedidosRes.data ?? []) as PedidoProducao[]);
    setPecas((pecasRes.data ?? []) as PecaProjeto[]);
    setRelacoes((relacoesRes.data ?? []) as PecaMaterial[]);
    setMateriais((materiaisRes.data ?? []) as Material[]);
    setLoading(false);
  }, [configurado, lojaAtiva]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const pecasPorId = useMemo(() => new Map(pecas.map((peca) => [peca.id, peca])), [pecas]);
  const materiaisPorId = useMemo(
    () => new Map(materiais.map((material) => [material.id, material])),
    [materiais],
  );

  const contagens = useMemo(() => {
    return {
      todos: pedidos.length,
      orcamento: pedidos.filter((pedido) => pedido.status === "orcamento").length,
      em_producao: pedidos.filter((pedido) => pedido.status === "em_producao").length,
      concluido: pedidos.filter((pedido) => pedido.status === "concluido").length,
      entregue: pedidos.filter((pedido) => pedido.status === "entregue").length,
    };
  }, [pedidos]);

  const filtrados = useMemo(() => {
    return pedidos
      .filter((pedido) => filtro === "todos" || pedido.status === filtro)
      .sort((a, b) => {
        const dataA = a.data_entrega ?? "9999-12-31";
        const dataB = b.data_entrega ?? "9999-12-31";
        if (dataA !== dataB) return dataA.localeCompare(dataB);
        return a.cliente_nome.localeCompare(b.cliente_nome, "pt-BR");
      });
  }, [filtro, pedidos]);

  const abrirNovo = () => {
    if (!podeGerenciar) return;
    setEditando(null);
    setFormOpen(true);
  };

  const abrirEdicao = (pedido: PedidoProducao) => {
    if (!podeGerenciar) return;
    setEditando(pedido);
    setFormOpen(true);
  };

  const avancar = async (pedido: PedidoProducao) => {
    if (!podeGerenciar) return;
    const status = proximoStatus[pedido.status];
    if (!status) return;

    setBusyId(pedido.id);
    const { error } = await supabase
      .from("pedidos_producao")
      .update({ status })
      .eq("id", pedido.id);

    if (error) {
      toast(mensagemErro(error), "error");
    } else {
      setPedidos((current) =>
        current.map((item) => (item.id === pedido.id ? { ...item, status } : item)),
      );
      toast(
        status === "em_producao"
          ? `${pedido.cliente_nome}: produção iniciada.`
          : status === "concluido"
            ? `${pedido.cliente_nome}: pedido concluído!`
            : `${pedido.cliente_nome}: pedido entregue.`,
        "success",
      );
      if (
        status === "concluido" &&
        pedido.peca_id &&
        !pedido.estoque_baixado &&
        relacoes.some((relacao) => relacao.peca_id === pedido.peca_id)
      ) {
        toast("Se quiser, dê baixa nos materiais deste pedido.", "info");
      }
    }
    setBusyId(null);
  };

  const itensBaixa = useMemo<ItemBaixa[]>(() => {
    if (!baixaPedido?.peca_id) return [];

    const mapa = new Map<string, { materialId: string | null; quantidade: number }>();
    relacoes
      .filter((relacao) => relacao.peca_id === baixaPedido.peca_id)
      .forEach((relacao) => {
        const key = relacao.material_id ?? `sem-material-${relacao.id}`;
        const atual = mapa.get(key);
        const quantidade = Math.max(0, num(relacao.metragem_necessaria));
        if (atual) atual.quantidade += quantidade;
        else mapa.set(key, { materialId: relacao.material_id, quantidade });
      });

    return Array.from(mapa.entries()).map(([key, item]) => {
      const material = item.materialId ? materiaisPorId.get(item.materialId) : undefined;
      const disponivel = material ? totalDisponivel(material) : 0;
      const falta = Math.max(0, item.quantidade - disponivel);
      return {
        key,
        material,
        quantidade: item.quantidade,
        disponivel,
        falta,
        novelos:
          material && categoriaDoMaterial(material) === "fio_croche"
            ? novelosParaCobrir(falta, num(material.metragem_por_unidade))
            : 0,
      };
    });
  }, [baixaPedido, materiaisPorId, relacoes]);

  const itensComFalta = itensBaixa.filter((item) => item.falta > 0);
  const temFalta = itensComFalta.length > 0;

  const resumoFalta = useMemo(() => {
    const grupos = new Map<string, number>();
    itensComFalta.forEach((item) => {
      if (!item.material) return;
      const unidade =
        categoriaDoMaterial(item.material) === "aviamento"
          ? unidadeInfo(item.material).short
          : "m";
      grupos.set(unidade, (grupos.get(unidade) ?? 0) + item.falta);
    });
    return Array.from(grupos.entries())
      .map(([unidade, valor]) =>
        unidade === "m"
          ? formatMeters(valor, 2)
          : `${formatNumber(valor, 2)} ${unidade}`,
      )
      .join(" + ");
  }, [itensComFalta]);

  const podeBaixar =
    itensBaixa.length > 0 && itensBaixa.every((item) => item.material && item.falta <= 0);

  const confirmarBaixa = async () => {
    if (!baixaPedido || !podeBaixar) return;
    setProcessandoBaixa(true);

    try {
      const atualizacoes = itensBaixa
        .filter((item): item is ItemBaixa & { material: Material } => Boolean(item.material))
        .map((item) => ({
          id: item.material.id,
          material: item.material,
          ...calcularBaixa(item.material, item.quantidade),
        }));

      for (const atualizacao of atualizacoes) {
        const { error } = await supabase
          .from("materiais")
          .update({
            quantidade_unidades: atualizacao.quantidade_unidades,
            metragem_avulsa: atualizacao.metragem_avulsa,
          })
          .eq("id", atualizacao.id);
        if (error) throw error;
      }

      const { error: pedidoError } = await supabase
        .from("pedidos_producao")
        .update({ estoque_baixado: true })
        .eq("id", baixaPedido.id);
      if (pedidoError) throw pedidoError;

      setMateriais((current) =>
        current.map((material) => {
          const alteracao = atualizacoes.find((item) => item.id === material.id);
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

      setPedidos((current) =>
        current.map((pedido) =>
          pedido.id === baixaPedido.id ? { ...pedido, estoque_baixado: true } : pedido,
        ),
      );

      toast("Materiais do pedido descontados do estoque.", "success");
      setBaixaPedido(null);
      carregar(false);
    } catch (err) {
      toast(`Não foi possível dar baixa: ${mensagemErro(err)}`, "error");
    } finally {
      setProcessandoBaixa(false);
    }
  };

  const hoje = todayISO();
  const proximos = [...pedidos]
    .filter((pedido) => pedido.status === "em_producao" || pedido.status === "concluido")
    .sort((a, b) => (a.data_entrega ?? "9999").localeCompare(b.data_entrega ?? "9999"))
    .slice(0, 1)[0];

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
            eyebrow={`Aba 4 · Pedidos — ${lojaAtiva.nome}`}
            title="Encomendas"
            description="Acompanhe cada cliente do orçamento à entrega, sem perder um prazo."
            action={
              <Button
                size="sm"
                onClick={abrirNovo}
                className="hidden sm:inline-flex"
                icon={<Plus className="h-4 w-4" />}
                disabled={!podeGerenciar || !configurado}
              >
                Novo pedido
              </Button>
            }
          />

          {!configurado ? <SetupNotice /> : null}

          {configurado ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <StatCard
                  label="Em produção"
                  value={loading ? "—" : formatNumber(contagens.em_producao, 0)}
                  icon={<Scissors className="h-3.5 w-3.5" />}
                />
                <StatCard
                  label="Prontos"
                  value={loading ? "—" : formatNumber(contagens.concluido, 0)}
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                />
                <StatCard
                  label="Entregues"
                  value={loading ? "—" : formatNumber(contagens.entregue, 0)}
                  icon={<Package className="h-3.5 w-3.5" />}
                />
              </div>

              {!loading && proximos ? (
                <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-rose-100 bg-rose-50/60 px-3.5 py-2.5">
                  <CalendarDays className="h-4 w-4 shrink-0 text-rose-500" />
                  <p className="text-[11px] leading-snug text-rose-900">
                    Próximo prazo: <strong>{proximos.cliente_nome}</strong> ·{" "}
                    {formatDate(proximos.data_entrega)} ·{" "}
                    {proximos.status === "concluido" ? "pronto para entregar" : "em produção"}
                  </p>
                </div>
              ) : null}

              <div className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto pb-1">
                {filtrosPedido.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFiltro(status)}
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition ${
                      filtro === status
                        ? "bg-rose-600 text-white shadow-sm"
                        : "border border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                    }`}
                  >
                    {status === "todos"
                      ? "Todos"
                      : STATUS_PEDIDO[status].label} ({contagens[status]})
                  </button>
                ))}
              </div>

              {!loading && !erro && pedidos.length > 0 ? (
                <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-stone-400">
                  <span>
                    {filtrados.length} de {pedidos.length}{" "}
                    {pedidos.length === 1 ? "pedido" : "pedidos"}
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

              {!loading && !erro && pedidos.length === 0 ? (
                <EmptyState
                  icon={<ClipboardList className="h-7 w-7" />}
                  title="Sem encomendas ainda"
                  description="Registre o primeiro pedido para acompanhar prazos e baixar materiais automaticamente."
                  action={
                    <Button
                      onClick={abrirNovo}
                      icon={<Plus className="h-4 w-4" />}
                      disabled={!podeGerenciar}
                    >
                      Novo pedido
                    </Button>
                  }
                />
              ) : null}

              {!loading && !erro && filtrados.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {filtrados.map((pedido) => {
                    const peca = pecasPorId.get(pedido.peca_id ?? "");
                    const podeAvançar = proximoStatus[pedido.status] !== null;
                    const jaBaixado = pedido.estoque_baixado;

                    return (
                      <article
                        key={pedido.id}
                        className="card flex flex-col gap-2 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-stone-900 truncate md:max-w-[180px]">
                              {pedido.cliente_nome}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              STATUS_PEDIDO[pedido.status].badge
                            }`}>
                              {STATUS_PEDIDO[pedido.status].label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {pedido.data_entrega ? (
                              <span className="text-xs text-stone-400">
                                {formatDate(pedido.data_entrega)}
                              </span>
                            ) : null}
                            {podeAvançar && podeGerenciar ? (
                              <button
                                type="button"
                                onClick={() => avancar(pedido)}
                                disabled={busyId === pedido.id}
                                className="grid h-8 w-8 place-items-center rounded-xl border border-stone-200 text-stone-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                aria-label={rotuloAcao[pedido.status]}
                              >
                                {busyId === pedido.id ? (
                                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <Pencil className="h-3.5 w-3.5" />
                                )}
                              </button>
                            ) : null}
                            {!jaBaixado && pedido.status === "concluido" && podeGerenciar ? (
                              <button
                                type="button"
                                onClick={() => setBaixaPedido(pedido)}
                                className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 px-2 text-amber-700 transition hover:bg-amber-100"
                                aria-label="Dar baixa nos materiais"
                              >
                                <PackageMinus className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {peca && (
                          <div className="flex items-center justify-between text-xs text-stone-500">
                            <span>Peça: {peca.nome}</span>
                            <span>
                              {pedido.estoque_baixado
                                ? "Baixa realizada"
                                : "Baixa pendente"}
                            </span>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-5 space-y-3">
              <ListSkeleton />
              <ListSkeleton />
              <ListSkeleton />
            </div>
          )}
        </>
      )}
    </div>
  );
}
