import type {
  CategoriaMaterial,
  Material,
  PecaMaterial,
  PecaProjeto,
  UnidadeControle,
} from "./types";
import { UNIDADES_CONTROLE } from "./types";

export function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatNumber(value: unknown, decimals = 1): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(num(value));
}

export function formatMeters(value: unknown, decimals = 1): string {
  return `${formatNumber(value, decimals)} m`;
}

export function formatCurrency(value: unknown): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num(value));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Sem data";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .replace(".", "");
}

export function todayISO(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function categoriaDoMaterial(
  material: Material | null | undefined,
): CategoriaMaterial {
  if (material?.categoria === "tecido") return "tecido";
  if (material?.categoria === "aviamento") return "aviamento";
  return "fio_croche";
}

export function unidadeDoMaterial(material: Material): UnidadeControle {
  const categoria = categoriaDoMaterial(material);
  if (categoria === "tecido") return "metros";
  if (categoria === "aviamento") {
    const unidade = material.unidade_controle;
    if (
      unidade === "metros" ||
      unidade === "unidades" ||
      unidade === "pares" ||
      unidade === "gramas"
    ) {
      return unidade;
    }
    return "unidades";
  }
  return "metros";
}

export function unidadeInfo(material: Material): { value: UnidadeControle; label: string; short: string } {
  const unidade = unidadeDoMaterial(material);
  return UNIDADES_CONTROLE.find((item) => item.value === unidade)!;
}

/** Total disponível retornado pelo banco ou calculado como fallback. */
export function totalDisponivel(material: Material): number {
  const saldoGerado = material.metragem_total_disponivel ?? material.saldo_total_disponivel;
  if (saldoGerado !== null && saldoGerado !== undefined) {
    return Math.max(0, num(saldoGerado));
  }

  const categoria = categoriaDoMaterial(material);
  if (categoria === "tecido") {
    return Math.max(0, num(material.metragem_avulsa));
  }
  if (categoria === "aviamento") {
    return Math.max(0, num(material.quantidade_unidades) + num(material.metragem_avulsa));
  }
  return Math.max(
    0,
    num(material.quantidade_unidades) * num(material.metragem_por_unidade) +
      num(material.metragem_avulsa),
  );
}

/** Formata o saldo de um material na unidade correta (m, un, pares, g). */
export function formatSaldo(material: Material, value?: unknown): string {
  const categoria = categoriaDoMaterial(material);
  const saldo = value === undefined ? totalDisponivel(material) : num(value);
  if (categoria === "fio_croche" || categoria === "tecido") {
    return formatMeters(saldo, categoria === "tecido" ? 2 : 1);
  }
  return `${formatNumber(saldo, 2)} ${unidadeInfo(material).short}`;
}

/** Formata uma quantidade necessária/baixada na unidade correta do material. */
export function formatQuantidade(material: Material | undefined, value: unknown): string {
  if (!material) return formatNumber(value, 2);
  if (categoriaDoMaterial(material) === "aviamento") {
    return `${formatNumber(value, 2)} ${unidadeInfo(material).short}`;
  }
  return formatMeters(value, 2);
}

export function estoqueBaixo(material: Material): boolean {
  const minimo = num(material.estoque_minimo);
  return minimo > 0 && totalDisponivel(material) <= minimo;
}

/** Saldo local otimista após alterar novelos/metragem avulsa. */
export function saldoCalculado(
  material: Material,
  quantidade_unidades: number,
  metragem_avulsa: number,
): number {
  const categoria = categoriaDoMaterial(material);
  if (categoria === "tecido") return Math.max(0, metragem_avulsa);
  if (categoria === "aviamento") return Math.max(0, quantidade_unidades);
  return Math.max(
    0,
    quantidade_unidades * num(material.metragem_por_unidade) + metragem_avulsa,
  );
}

export function metrosPorPeso(pesoGramas: number, material: Material): number {
  const pesoPorUnidade = num(material.peso_por_unidade);
  if (pesoPorUnidade <= 0) return 0;
  return round((pesoGramas / pesoPorUnidade) * num(material.metragem_por_unidade), 2);
}

export function pesoPorMetros(metros: number, material: Material): number {
  const metragemPorUnidade = num(material.metragem_por_unidade);
  if (metragemPorUnidade <= 0) return 0;
  return round((metros / metragemPorUnidade) * num(material.peso_por_unidade), 2);
}

export type AjusteEstoque = {
  quantidade_unidades: number;
  metragem_avulsa: number;
};

/**
 * Recalcula novelos inteiros + sobra avulsa a partir da metragem restante.
 * Ex.: 3 novelos de 100 m e uso de 250 m => 0 novelos + 50 m avulsos.
 */
export function calcularBaixa(material: Material, quantidadeUsada: number): AjusteEstoque {
  const categoria = categoriaDoMaterial(material);
  const usado = Math.max(0, quantidadeUsada);
  const restante = Math.max(0, totalDisponivel(material) - usado);

  if (categoria === "tecido") {
    return { quantidade_unidades: 0, metragem_avulsa: round(restante, 2) };
  }

  if (categoria === "aviamento") {
    return { quantidade_unidades: round(restante, 2), metragem_avulsa: 0 };
  }

  const metragemPorUnidade = num(material.metragem_por_unidade);
  if (metragemPorUnidade <= 0) {
    return {
      quantidade_unidades: 0,
      metragem_avulsa: round(restante, 2),
    };
  }

  let unidades = Math.floor((restante + 0.0001) / metragemPorUnidade);
  let avulsa = restante - unidades * metragemPorUnidade;

  // Evita sobras residuais por imprecisão de ponto flutuante.
  if (avulsa < 0.05) {
    avulsa = 0;
  } else if (metragemPorUnidade - avulsa < 0.05) {
    unidades += 1;
    avulsa = 0;
  }

  return {
    quantidade_unidades: Math.max(0, unidades),
    metragem_avulsa: round(avulsa, 2),
  };
}

export function novelosParaCobrir(faltaMetros: number, metragemPorUnidade: number): number {
  if (metragemPorUnidade <= 0) return 0;
  return Math.ceil(Math.max(0, faltaMetros) / metragemPorUnidade);
}

export function custoMaterialPeca(
  material: Material | undefined,
  quantidadeNecessaria: number,
): number {
  if (!material) return 0;
  const custoUnitario = num(material.custo_unitario);
  const categoria = categoriaDoMaterial(material);
  const quantidade = Math.max(0, num(quantidadeNecessaria));

  // Aviamentos e tecidos guardam o custo por unidade/metro em custo_unitario.
  if (categoria === "aviamento" || categoria === "tecido") {
    return quantidade * custoUnitario;
  }

  const metragemPorUnidade = num(material.metragem_por_unidade);
  if (metragemPorUnidade <= 0) return 0;
  return (quantidade / metragemPorUnidade) * custoUnitario;
}

export function custoTotalPeca(
  pecaMateriais: PecaMaterial[],
  materiais: Material[],
): number {
  return pecaMateriais.reduce((total, item) => {
    const material = materiais.find((m) => m.id === item.material_id);
    return total + custoMaterialPeca(material, num(item.metragem_necessaria));
  }, 0);
}

export function nomeMaterial(material?: Material | null): string {
  if (!material) return "Material não vinculado";
  return material.nome;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function pedidoTemPeca(peca?: PecaProjeto | null): boolean {
  return Boolean(peca);
}
