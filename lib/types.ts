export type Papel = "administrador" | "gerente" | "usuario";

export const PAPEIS: Array<{
  value: Papel;
  label: string;
  descricao: string;
}> = [
  {
    value: "administrador",
    label: "Administrador",
    descricao: "Controla tudo, inclusive equipe, convites e exclusões.",
  },
  {
    value: "gerente",
    label: "Gerente",
    descricao: "Cuida dos cadastros, ajustes de estoque e exclusões.",
  },
  {
    value: "usuario",
    label: "Usuário",
    descricao: "Consulta o estoque e registra pedidos e baixas.",
  },
];

export const PAPEL_LABEL: Record<Papel, string> = {
  administrador: "Administrador",
  gerente: "Gerente",
  usuario: "Usuário",
};

export type Perfil = {
  id: string;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
};

export type Loja = {
  id: string;
  nome: string;
  criada_por: string | null;
  criada_em?: string | null;
};

export type MembroLoja = {
  loja_id: string;
  user_id: string;
  papel: Papel;
  criado_em?: string | null;
  lojas?: Loja | null;
  perfis?: Perfil | null;
};

export type ConviteLoja = {
  id: string;
  loja_id: string;
  email: string;
  papel: Papel;
  status: "pendente" | "aceito" | "cancelado";
  criado_em?: string | null;
};

export type CategoriaMaterial = "fio_croche" | "tecido" | "aviamento";

export type UnidadeControle = "metros" | "unidades" | "pares" | "gramas";

export type Material = {
  id: string;
  nome: string;
  marca: string | null;
  composicao: string | null;
  tex: string | number | null;
  cor_nome: string | null;
  cor_codigo: string | null;
  cor_hex: string | null;
  lote: string | null;
  foto_amostra_url: string | null;
  metragem_por_unidade: number | null;
  peso_por_unidade: number | null;
  quantidade_unidades: number | null;
  metragem_avulsa: number | null;
  custo_unitario: number | null;
  categoria: CategoriaMaterial | string | null;
  unidade_controle: UnidadeControle | string | null;
  agulha_recomendada: string | null;
  largura_tecido_cm: number | null;
  tamanho_especificacao: string | null;
  estoque_minimo: number | null;
  /** Presente no schema original informado. */
  metragem_total_disponivel?: number | null;
  /** Coluna calculada existente no projeto Supabase atual. */
  saldo_total_disponivel?: number | null;
};

export type PresetFio = {
  id: string;
  nome_exibicao: string;
  marca: string | null;
  composicao: string | null;
  tex: string | null;
  agulha_recomendada: string | null;
  metragem_padrao: number | null;
  peso_padrao: number | null;
};

export const CATEGORIAS_MATERIAL: CategoriaMaterial[] = [
  "fio_croche",
  "tecido",
  "aviamento",
];

export const CATEGORIA_MATERIAL: Record<
  CategoriaMaterial,
  { label: string; singular: string; plural: string }
> = {
  fio_croche: { label: "Fio / Linha", singular: "Fio", plural: "Fios" },
  tecido: { label: "Tecido / Forro", singular: "Tecido", plural: "Tecidos" },
  aviamento: { label: "Aviamento / Acessório", singular: "Aviamento", plural: "Aviamentos" },
};

export const UNIDADES_CONTROLE: Array<{
  value: UnidadeControle;
  label: string;
  short: string;
}> = [
  { value: "unidades", label: "Unidades", short: "un" },
  { value: "pares", label: "Pares", short: "pares" },
  { value: "metros", label: "Metros", short: "m" },
  { value: "gramas", label: "Gramas", short: "g" },
];

export type PecaProjeto = {
  id: string;
  nome: string;
  descricao: string | null;
  foto_peca_url: string | null;
  tempo_estimado_horas: number | null;
  preco_venda_sugerido: number | null;
};

export type PecaMaterial = {
  id: string;
  peca_id: string;
  material_id: string | null;
  descricao_requisito: string | null;
  metragem_necessaria: number | null;
};

export type StatusPedido = "orcamento" | "em_producao" | "concluido" | "entregue";

export type PedidoProducao = {
  id: string;
  cliente_nome: string;
  peca_id: string | null;
  status: StatusPedido;
  estoque_baixado: boolean | null;
  data_entrega: string | null;
  observacoes: string | null;
};

export const STATUS_PEDIDO: Record<
  StatusPedido,
  { label: string; badge: string; dot: string }
> = {
  orcamento: {
    label: "Orçamento",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
  },
  em_producao: {
    label: "Em produção",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
  concluido: {
    label: "Concluído",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  entregue: {
    label: "Entregue",
    badge: "bg-stone-100 text-stone-600 ring-stone-200",
    dot: "bg-stone-400",
  },
};

export const STATUS_ORDER: StatusPedido[] = [
  "orcamento",
  "em_producao",
  "concluido",
  "entregue",
];
