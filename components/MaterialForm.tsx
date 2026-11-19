"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, Layers, Loader2, Save, Scissors } from "lucide-react";
import type {
  CategoriaMaterial,
  Material,
  PresetFio,
  UnidadeControle,
} from "@/lib/types";
import {
  CATEGORIAS_MATERIAL,
  CATEGORIA_MATERIAL,
  UNIDADES_CONTROLE,
} from "@/lib/types";
import {
  categoriaDoMaterial,
  formatMeters,
  formatNumber,
  num,
  totalDisponivel,
} from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { mensagemErro, uploadImagem } from "@/lib/upload";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/components/AuthProvider";
import { Modal } from "@/components/Modal";
import { PhotoField } from "@/components/PhotoField";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FormSection,
  Input,
  Select,
} from "@/components/ui/FormControls";

type MaterialFormProps = {
  open: boolean;
  material?: Material | null;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  categoria: CategoriaMaterial;
  nome: string;
  marca: string;
  composicao: string;
  tex: string;
  agulha_recomendada: string;
  cor_nome: string;
  cor_codigo: string;
  cor_hex: string;
  lote: string;
  metragem_por_unidade: string;
  peso_por_unidade: string;
  quantidade_unidades: string;
  metragem_avulsa: string;
  custo_unitario: string;
  largura_tecido_cm: string;
  tamanho_especificacao: string;
  unidade_controle: UnidadeControle;
  estoque_minimo: string;
};

const COMPOSICOES = [
  "100% Algodão Mercerizado",
  "100% Algodão",
  "85% Algodão / 15% Outras Fibras",
  "100% Acrílico",
  "100% Poliéster",
  "Polipropileno",
  "Fio de Malha",
];

const AGULHAS = [
  "1,25 mm",
  "1,50 mm",
  "1,75 mm",
  "2,00 mm",
  "2,25 mm",
  "2,50 mm",
  "3,00 mm",
  "3,50 mm",
  "4,00 mm",
  "4,50 mm",
  "5,00 mm",
  "5,50 mm",
  "6,00 mm",
  "6,50 mm",
  "7,00 mm",
  "8,00 mm",
];

const TIPOS_AVIAMENTO = [
  "Zíper",
  "Botão",
  "Olho c/ Trava",
  "Alça de Bolsa",
  "Fecho Imantado",
  "Bojo",
  "Elástico",
  "Fibra Siliconada",
];

const LARGURAS_RAPIDAS = [140, 150, 280];

const PRESETS_PADRAO: PresetFio[] = [
  {
    id: "padrao-amigurumi",
    nome_exibicao: "Amigurumi",
    marca: "Círculo",
    composicao: "100% Algodão Mercerizado",
    tex: "492",
    agulha_recomendada: "2,0 mm a 4,0 mm",
    metragem_padrao: 254,
    peso_padrao: 125,
  },
  {
    id: "padrao-amigurumi-pelucia",
    nome_exibicao: "Amigurumi Pelúcia",
    marca: "Círculo",
    composicao: "100% Poliéster",
    tex: "643",
    agulha_recomendada: "3,0 mm a 4,5 mm",
    metragem_padrao: 131,
    peso_padrao: 85,
  },
  {
    id: "padrao-anne-500",
    nome_exibicao: "Anne 500",
    marca: "Círculo",
    composicao: "100% Algodão Mercerizado",
    tex: "295",
    agulha_recomendada: "1,75 mm",
    metragem_padrao: 500,
    peso_padrao: 147,
  },
  {
    id: "padrao-barroco-4",
    nome_exibicao: "Barroco Maxcolor Nº 4 (200g)",
    marca: "Círculo",
    composicao: "100% Algodão",
    tex: "590",
    agulha_recomendada: "2,5 mm a 3,5 mm",
    metragem_padrao: 338,
    peso_padrao: 200,
  },
  {
    id: "padrao-barroco-6",
    nome_exibicao: "Barroco Maxcolor Nº 6 (400g)",
    marca: "Círculo",
    composicao: "100% Algodão",
    tex: "885",
    agulha_recomendada: "3,5 mm a 5,0 mm",
    metragem_padrao: 452,
    peso_padrao: 400,
  },
  {
    id: "padrao-charme",
    nome_exibicao: "Charme",
    marca: "Círculo",
    composicao: "100% Algodão Mercerizado",
    tex: "378",
    agulha_recomendada: "2,5 mm a 3,0 mm",
    metragem_padrao: 396,
    peso_padrao: 150,
  },
  {
    id: "padrao-clea-1000",
    nome_exibicao: "Cléa 1000",
    marca: "Círculo",
    composicao: "100% Algodão Mercerizado",
    tex: "151",
    agulha_recomendada: "1,25 mm",
    metragem_padrao: 1000,
    peso_padrao: 151,
  },
  {
    id: "padrao-clea-5",
    nome_exibicao: "Cléa 5",
    marca: "Círculo",
    composicao: "100% Algodão Mercerizado",
    tex: "196",
    agulha_recomendada: "1,50 mm",
    metragem_padrao: 750,
    peso_padrao: 147,
  },
  {
    id: "padrao-duna",
    nome_exibicao: "Duna",
    marca: "Círculo",
    composicao: "100% Algodão Mercerizado",
    tex: "590",
    agulha_recomendada: "2,5 mm a 3,5 mm",
    metragem_padrao: 170,
    peso_padrao: 100,
  },
  {
    id: "padrao-euroma-6",
    nome_exibicao: "EuroRoma Barbante Nº 6 (600g)",
    marca: "EuroRoma",
    composicao: "85% Algodão / 15% Outras Fibras",
    tex: "984",
    agulha_recomendada: "3,5 mm",
    metragem_padrao: 610,
    peso_padrao: 600,
  },
  {
    id: "padrao-euroma-8",
    nome_exibicao: "EuroRoma Barbante Nº 8 (600g)",
    marca: "EuroRoma",
    composicao: "85% Algodão / 15% Outras Fibras",
    tex: "1312",
    agulha_recomendada: "4,0 mm",
    metragem_padrao: 457,
    peso_padrao: 600,
  },
  {
    id: "padrao-malha-premium",
    nome_exibicao: "Fio de Malha Premium (140m)",
    marca: "Círculo",
    composicao: "94% Poliéster / 6% Elastano",
    tex: "1900",
    agulha_recomendada: "5,0 mm a 8,0 mm",
    metragem_padrao: 140,
    peso_padrao: 270,
  },
  {
    id: "padrao-nautico",
    nome_exibicao: "Fio Náutico 5mm (500g)",
    marca: "Círculo",
    composicao: "100% Polipropileno",
    tex: "2400",
    agulha_recomendada: "5,0 mm a 7,0 mm",
    metragem_padrao: 208,
    peso_padrao: 500,
  },
];

const emptyForm: FormState = {
  categoria: "fio_croche",
  nome: "",
  marca: "",
  composicao: "",
  tex: "",
  agulha_recomendada: "",
  cor_nome: "",
  cor_codigo: "",
  cor_hex: "#d6a6a6",
  lote: "",
  metragem_por_unidade: "100",
  peso_por_unidade: "100",
  quantidade_unidades: "1",
  metragem_avulsa: "0",
  custo_unitario: "",
  largura_tecido_cm: "150",
  tamanho_especificacao: "",
  unidade_controle: "unidades",
  estoque_minimo: "0",
};

const UNIDADES_VALIDAS: UnidadeControle[] = ["metros", "unidades", "pares", "gramas"];

function toForm(material?: Material | null): FormState {
  if (!material) return emptyForm;

  const categoria = categoriaDoMaterial(material);
  const unidade: UnidadeControle = UNIDADES_VALIDAS.includes(
    material.unidade_controle as UnidadeControle,
  )
    ? (material.unidade_controle as UnidadeControle)
    : "unidades";

  return {
    categoria,
    nome: material.nome ?? "",
    marca: material.marca ?? "",
    composicao: material.composicao ?? "",
    tex: material.tex != null ? String(material.tex) : "",
    agulha_recomendada: material.agulha_recomendada ?? "",
    cor_nome: material.cor_nome ?? "",
    cor_codigo: material.cor_codigo ?? "",
    cor_hex: material.cor_hex || "#d6a6a6",
    lote: material.lote ?? "",
    metragem_por_unidade: String(material.metragem_por_unidade ?? ""),
    peso_por_unidade: String(material.peso_por_unidade ?? ""),
    quantidade_unidades:
      categoria === "aviamento"
        ? String(totalDisponivel(material))
        : String(material.quantidade_unidades ?? 0),
    metragem_avulsa:
      categoria === "tecido"
        ? String(totalDisponivel(material))
        : String(material.metragem_avulsa ?? 0),
    custo_unitario: String(material.custo_unitario ?? ""),
    largura_tecido_cm: String(material.largura_tecido_cm ?? ""),
    tamanho_especificacao: material.tamanho_especificacao ?? "",
    unidade_controle: unidade,
    estoque_minimo: String(material.estoque_minimo ?? 0),
  };
}

function normalizarMedida(value: string): string {
  return value.replace(/\s+/g, "").replace(/mm/gi, "").replace(".", ",");
}

function agulhaPadrao(value: string): string | null {
  const alvo = normalizarMedida(value);
  if (!alvo) return null;

  const exato = AGULHAS.find((agulha) => normalizarMedida(agulha) === alvo);
  if (exato) return exato;

  const numero = Number(alvo.replace(",", "."));
  if (!Number.isFinite(numero)) return null;
  return (
    AGULHAS.find(
      (agulha) => Number(normalizarMedida(agulha).replace(",", ".")) === numero,
    ) ?? null
  );
}

export function MaterialForm({ open, material, onClose, onSaved }: MaterialFormProps) {
  const { toast } = useToast();
  const { lojaAtiva } = useAuth();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [presets, setPresets] = useState<PresetFio[]>(PRESETS_PADRAO);
  const [presetId, setPresetId] = useState("");
  const [composicaoOutra, setComposicaoOutra] = useState(false);
  const [agulhaOutra, setAgulhaOutra] = useState(false);
  const [tipoOutro, setTipoOutro] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [removeFoto, setRemoveFoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const inicial = toForm(material);
    setForm(inicial);
    setFile(null);
    setFotoUrl(material?.foto_amostra_url ?? null);
    setRemoveFoto(false);
    setError("");
    setPresetId("");
    setComposicaoOutra(
      Boolean(material?.composicao && !COMPOSICOES.includes(material.composicao)),
    );
    setAgulhaOutra(
      Boolean(
        material?.agulha_recomendada && !agulhaPadrao(material.agulha_recomendada),
      ),
    );
    setTipoOutro(
      Boolean(
        material &&
          inicial.categoria === "aviamento" &&
          material.nome &&
          !TIPOS_AVIAMENTO.includes(material.nome),
      ),
    );
  }, [open, material]);

  useEffect(() => {
    if (!open) return;
    let ativo = true;

    supabase
      .from("presets_fios")
      .select("*")
      .order("nome_exibicao", { ascending: true })
      .then(({ data, error: presetError }) => {
        if (!ativo || presetError) return;
        const lista = (data ?? []) as PresetFio[];
        if (lista.length > 0) setPresets(lista);
      });

    return () => {
      ativo = false;
    };
  }, [open]);

  const update = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const mudarCategoria = (categoria: CategoriaMaterial) => {
    setForm((current) => ({ ...current, categoria }));
    setError("");
    setPresetId("");
  };

  const aplicarPreset = (id: string) => {
    setPresetId(id);
    const preset = presets.find((item) => item.id === id);
    if (!preset) return;

    const agulha = preset.agulha_recomendada ?? "";
    const padrao = agulhaPadrao(agulha);

    setForm((current) => ({
      ...current,
      nome: preset.nome_exibicao,
      marca: preset.marca ?? "",
      composicao: preset.composicao ?? "",
      tex: preset.tex ?? "",
      agulha_recomendada: agulha,
      metragem_por_unidade:
        preset.metragem_padrao != null ? String(preset.metragem_padrao) : "",
      peso_por_unidade: preset.peso_padrao != null ? String(preset.peso_padrao) : "",
    }));
    setComposicaoOutra(
      Boolean(preset.composicao && !COMPOSICOES.includes(preset.composicao)),
    );
    setAgulhaOutra(Boolean(agulha && !padrao));
    toast(
      `Fio ${preset.nome_exibicao} aplicado. Informe a cor, o código, o lote e os novelos.`,
      "info",
    );
  };

  const categoria = form.categoria;
  const unidadeSelecionada =
    UNIDADES_CONTROLE.find((item) => item.value === form.unidade_controle) ??
    UNIDADES_CONTROLE[0];

  const totalPrevisto = useMemo(() => {
    if (categoria === "tecido") return Math.max(0, num(form.metragem_avulsa));
    if (categoria === "aviamento") return Math.max(0, num(form.quantidade_unidades));
    return (
      Math.max(0, num(form.quantidade_unidades)) *
        Math.max(0, num(form.metragem_por_unidade)) +
      Math.max(0, num(form.metragem_avulsa))
    );
  }, [
    categoria,
    form.metragem_avulsa,
    form.metragem_por_unidade,
    form.quantidade_unidades,
  ]);

  const composicaoSelect =
    composicaoOutra || (form.composicao && !COMPOSICOES.includes(form.composicao))
      ? "__outra__"
      : form.composicao;

  const agulhaSelect =
    agulhaOutra || (form.agulha_recomendada && !agulhaPadrao(form.agulha_recomendada))
      ? "__outra__"
      : agulhaPadrao(form.agulha_recomendada) ?? "";

  const tipoSelect =
    tipoOutro || (form.nome && !TIPOS_AVIAMENTO.includes(form.nome))
      ? "__outro__"
      : form.nome;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.nome.trim()) {
      setError(
        categoria === "aviamento"
          ? "Escolha o tipo de aviamento para continuar."
          : "Dê um nome ao material para continuar.",
      );
      return;
    }

    if (categoria === "fio_croche" && !form.cor_nome.trim()) {
      setError("Informe o nome da cor. Esse campo é obrigatório no banco.");
      return;
    }
    if (categoria === "fio_croche" && num(form.metragem_por_unidade) <= 0) {
      setError("Informe a metragem por novelo (maior que zero).");
      return;
    }
    if (
      num(form.quantidade_unidades) < 0 ||
      num(form.metragem_avulsa) < 0 ||
      num(form.estoque_minimo) < 0
    ) {
      setError("Quantidades e estoque mínimo não podem ser negativos.");
      return;
    }

    setSaving(true);
    try {
      let finalFoto = removeFoto ? null : fotoUrl;
      if (file) {
        finalFoto = await uploadImagem(file, "amostras");
      }

      const corNome =
        form.cor_nome.trim() || (categoria === "fio_croche" ? "" : "Sem cor");

      const comum = {
        nome: form.nome.trim(),
        marca: form.marca.trim(),
        cor_nome: corNome,
        cor_codigo: form.cor_codigo.trim(),
        cor_hex: form.cor_hex.trim() || "#d6a6a6",
        lote: categoria === "tecido" ? "" : form.lote.trim(),
        foto_amostra_url: finalFoto ?? "",
        custo_unitario: form.custo_unitario.trim()
          ? Math.max(0, num(form.custo_unitario))
          : 0,
        categoria,
        unidade_controle: categoria === "aviamento" ? form.unidade_controle : "metros",
        estoque_minimo: Math.max(0, num(form.estoque_minimo)),
      };

      const payload =
        categoria === "tecido"
          ? {
              ...comum,
              composicao: form.composicao.trim(),
              tex: "",
              agulha_recomendada: "",
              metragem_por_unidade: 0,
              peso_por_unidade: 0,
              quantidade_unidades: 0,
              metragem_avulsa: Math.max(0, num(form.metragem_avulsa)),
              largura_tecido_cm: Math.max(0, num(form.largura_tecido_cm)),
              tamanho_especificacao: "",
            }
          : categoria === "aviamento"
            ? {
                ...comum,
                composicao: "",
                tex: "",
                agulha_recomendada: "",
                metragem_por_unidade: 0,
                peso_por_unidade: 0,
                quantidade_unidades: Math.max(0, num(form.quantidade_unidades)),
                metragem_avulsa: 0,
                largura_tecido_cm: 0,
                tamanho_especificacao: form.tamanho_especificacao.trim(),
              }
            : {
                ...comum,
                composicao: form.composicao.trim(),
                tex: form.tex.trim(),
                agulha_recomendada: form.agulha_recomendada.trim(),
                metragem_por_unidade: Math.max(0, num(form.metragem_por_unidade)),
                peso_por_unidade: form.peso_por_unidade.trim()
                  ? Math.max(0, num(form.peso_por_unidade))
                  : 0,
                quantidade_unidades: Math.max(
                  0,
                  Math.round(num(form.quantidade_unidades)),
                ),
                metragem_avulsa: Math.max(0, num(form.metragem_avulsa)),
                largura_tecido_cm: 0,
                tamanho_especificacao: "",
              };

      const request = material
        ? supabase.from("materiais").update(payload).eq("id", material.id)
        : supabase.from("materiais").insert({ ...payload, loja_id: lojaAtiva!.id });

      const { error: saveError } = await request;
      if (saveError) throw saveError;

      toast(
        material
          ? "Material atualizado com carinho."
          : categoria === "tecido"
            ? "Novo tecido adicionado ao estoque!"
            : categoria === "aviamento"
              ? "Novo aviamento adicionado ao estoque!"
              : "Novo fio adicionado ao estoque!",
        "success",
      );
      onClose();
      onSaved();
    } catch (err) {
      const message = mensagemErro(err);
      setError(message);
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={material ? "Editar material" : "Novo material"}
      description={
        material
          ? "Atualize os dados e mantenha o estoque preciso."
          : "Cadastre fios, tecidos, forros e aviamentos no mesmo ateliê."
      }
      size="lg"
    >
      <form onSubmit={submit} className="space-y-1">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-stone-200 bg-white p-1 shadow-sm">
          {CATEGORIAS_MATERIAL.map((item) => {
            const ativo = categoria === item;
            const Icone =
              item === "fio_croche" ? Scissors : item === "tecido" ? Layers : Boxes;
            return (
              <button
                key={item}
                type="button"
                onClick={() => mudarCategoria(item)}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-[10px] font-bold transition ${
                  ativo
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-stone-500 hover:bg-stone-50"
                }`}
              >
                <Icone className="h-4 w-4" />
                {CATEGORIA_MATERIAL[item].singular}
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <PhotoField
            currentUrl={removeFoto ? null : fotoUrl}
            file={file}
            onFileChange={setFile}
            onRemoveCurrent={() => {
              setFotoUrl(null);
              setRemoveFoto(true);
            }}
            label={
              categoria === "aviamento"
                ? "Foto do aviamento"
                : categoria === "tecido"
                  ? "Foto da amostra de tecido"
                  : "Foto da amostra"
            }
            hint="A foto aparece em destaque no card do estoque."
          />
        </div>

        {categoria === "fio_croche" ? (
          <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-3.5">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-rose-900">
                Preencher automático a partir de fio conhecido
              </span>
              <Select value={presetId} onChange={(event) => aplicarPreset(event.target.value)}>
                <option value="">Escolher um fio conhecido...</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.nome_exibicao}
                    {preset.marca ? ` — ${preset.marca}` : ""}
                  </option>
                ))}
              </Select>
            </label>
            <p className="mt-1.5 text-[11px] leading-relaxed text-rose-700/80">
              Preenche nome, marca, composição, TEX, agulha, metragem e peso. Depois você só
              informa cor, código, lote, novelos e foto.
            </p>
          </div>
        ) : null}

        {categoria === "aviamento" ? (
          <FormSection title="Identificação do aviamento">
            <Field label="Tipo" required className="col-span-2">
              <Select
                value={tipoSelect}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "__outro__") {
                    setTipoOutro(true);
                    update("nome", "");
                  } else {
                    setTipoOutro(false);
                    update("nome", value);
                  }
                }}
              >
                <option value="">Selecione o tipo...</option>
                {TIPOS_AVIAMENTO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
                <option value="__outro__">Outro tipo...</option>
              </Select>
              {tipoOutro ? (
                <Input
                  className="mt-2"
                  value={form.nome}
                  onChange={(event) => update("nome", event.target.value)}
                  placeholder="Ex.: Aplicação de coração"
                />
              ) : null}
            </Field>

            <Field label="Tamanho / especificação" className="col-span-2">
              <Input
                value={form.tamanho_especificacao}
                onChange={(event) =>
                  update("tamanho_especificacao", event.target.value)
                }
                placeholder="Ex.: 20cm, 12mm, Tam M"
              />
            </Field>

            <Field label="Marca">
              <Input
                value={form.marca}
                onChange={(event) => update("marca", event.target.value)}
                placeholder="Ex.: Ykk"
              />
            </Field>

            <Field label="Unidade de controle" required>
              <Select
                value={form.unidade_controle}
                onChange={(event) =>
                  update("unidade_controle", event.target.value as UnidadeControle)
                }
              >
                {UNIDADES_CONTROLE.map((unidade) => (
                  <option key={unidade.value} value={unidade.value}>
                    {unidade.label}
                  </option>
                ))}
              </Select>
            </Field>
          </FormSection>
        ) : null}

        {categoria === "tecido" ? (
          <FormSection title="Identificação do tecido">
            <Field label="Nome do tecido" required className="col-span-2">
              <Input
                value={form.nome}
                onChange={(event) => update("nome", event.target.value)}
                placeholder="Ex.: Tricoline, Helanca para forro, Viscolinho"
                autoFocus
              />
            </Field>

            <Field label="Marca">
              <Input
                value={form.marca}
                onChange={(event) => update("marca", event.target.value)}
                placeholder="Ex.: Ateliê"
              />
            </Field>

            <Field label="Composição">
              <Select
                value={composicaoSelect}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "__outra__") {
                    setComposicaoOutra(true);
                    update("composicao", "");
                  } else {
                    setComposicaoOutra(false);
                    update("composicao", value);
                  }
                }}
              >
                <option value="">Selecione...</option>
                {COMPOSICOES.map((composicao) => (
                  <option key={composicao} value={composicao}>
                    {composicao}
                  </option>
                ))}
                <option value="__outra__">Outra composição...</option>
              </Select>
              {composicaoOutra ? (
                <Input
                  className="mt-2"
                  value={form.composicao}
                  onChange={(event) => update("composicao", event.target.value)}
                  placeholder="Ex.: 97% algodão / 3% elastano"
                />
              ) : null}
            </Field>
          </FormSection>
        ) : null}

        {categoria === "fio_croche" ? (
          <FormSection
            title="Identificação do fio"
            description="O TEX é a espessura técnica do fio."
          >
            <Field label="Nome do fio" required className="col-span-2">
              <Input
                value={form.nome}
                onChange={(event) => update("nome", event.target.value)}
                placeholder="Ex.: Amigurumi Soft"
                autoFocus
              />
            </Field>

            <Field label="Marca">
              <Input
                value={form.marca}
                onChange={(event) => update("marca", event.target.value)}
                placeholder="Ex.: Círculo"
              />
            </Field>

            <Field label="Tex">
              <Input
                value={form.tex}
                onChange={(event) => update("tex", event.target.value)}
                placeholder="Ex.: 492"
              />
            </Field>

            <Field label="Composição" className="col-span-2">
              <Select
                value={composicaoSelect}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "__outra__") {
                    setComposicaoOutra(true);
                    update("composicao", "");
                  } else {
                    setComposicaoOutra(false);
                    update("composicao", value);
                  }
                }}
              >
                <option value="">Selecione a composição...</option>
                {COMPOSICOES.map((composicao) => (
                  <option key={composicao} value={composicao}>
                    {composicao}
                  </option>
                ))}
                <option value="__outra__">Outra composição...</option>
              </Select>
              {composicaoOutra ? (
                <Input
                  className="mt-2"
                  value={form.composicao}
                  onChange={(event) => update("composicao", event.target.value)}
                  placeholder="Ex.: 60% algodão / 40% acrílico"
                />
              ) : null}
            </Field>

            <Field label="Agulha recomendada">
              <Select
                value={agulhaSelect}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "__outra__") {
                    setAgulhaOutra(true);
                    update("agulha_recomendada", "");
                  } else {
                    setAgulhaOutra(false);
                    update("agulha_recomendada", value);
                  }
                }}
              >
                <option value="">Selecione...</option>
                {AGULHAS.map((agulha) => (
                  <option key={agulha} value={agulha}>
                    {agulha}
                  </option>
                ))}
                <option value="__outra__">Outra medida...</option>
              </Select>
              {agulhaOutra ? (
                <Input
                  className="mt-2"
                  value={form.agulha_recomendada}
                  onChange={(event) =>
                    update("agulha_recomendada", event.target.value)
                  }
                  placeholder="Ex.: 2,0 mm a 4,0 mm"
                />
              ) : null}
            </Field>
          </FormSection>
        ) : null}

        {categoria !== "tecido" ? (
          <FormSection title="Cor e lote">
            <Field
              label={categoria === "aviamento" ? "Cor (opcional)" : "Nome da cor"}
              required={categoria === "fio_croche"}
            >
              <Input
                value={form.cor_nome}
                onChange={(event) => update("cor_nome", event.target.value)}
                placeholder={
                  categoria === "aviamento" ? "Ex.: Níquel, Preto" : "Ex.: Rosa poeira"
                }
              />
            </Field>

            <Field label="Código da cor">
              <Input
                value={form.cor_codigo}
                onChange={(event) => update("cor_codigo", event.target.value)}
                placeholder="Ex.: 4210"
              />
            </Field>

            <Field label="Cor (hex)">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={
                    /^#[0-9a-fA-F]{6}$/.test(form.cor_hex) ? form.cor_hex : "#d6a6a6"
                  }
                  onChange={(event) => update("cor_hex", event.target.value)}
                  className="h-11 w-12 shrink-0 cursor-pointer rounded-xl border border-stone-200 bg-white p-1"
                  aria-label="Selecionar cor"
                />
                <Input
                  value={form.cor_hex}
                  onChange={(event) => update("cor_hex", event.target.value)}
                  placeholder="#d6a6a6"
                  className="min-w-0"
                />
              </div>
            </Field>

            <Field label="Lote">
              <Input
                value={form.lote}
                onChange={(event) => update("lote", event.target.value)}
                placeholder="Ex.: L-2026-03"
              />
            </Field>
          </FormSection>
        ) : (
          <FormSection title="Cor / estampa">
            <Field label="Cor ou estampa">
              <Input
                value={form.cor_nome}
                onChange={(event) => update("cor_nome", event.target.value)}
                placeholder="Ex.: Floral azul"
              />
            </Field>

            <Field label="Código">
              <Input
                value={form.cor_codigo}
                onChange={(event) => update("cor_codigo", event.target.value)}
                placeholder="Ex.: TC-120"
              />
            </Field>

            <Field label="Cor (hex)" className="col-span-2">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={
                    /^#[0-9a-fA-F]{6}$/.test(form.cor_hex) ? form.cor_hex : "#d6a6a6"
                  }
                  onChange={(event) => update("cor_hex", event.target.value)}
                  className="h-11 w-12 shrink-0 cursor-pointer rounded-xl border border-stone-200 bg-white p-1"
                  aria-label="Selecionar cor"
                />
                <Input
                  value={form.cor_hex}
                  onChange={(event) => update("cor_hex", event.target.value)}
                  placeholder="#d6a6a6"
                  className="min-w-0"
                />
              </div>
            </Field>
          </FormSection>
        )}

        {categoria === "tecido" ? (
          <FormSection
            title="Rolo e metragem"
            description="A metragem disponível é o saldo atual do tecido."
          >
            <Field label="Largura do rolo (cm)" className="col-span-2">
              <div className="flex flex-wrap gap-1.5">
                {LARGURAS_RAPIDAS.map((largura) => (
                  <button
                    key={largura}
                    type="button"
                    onClick={() => update("largura_tecido_cm", String(largura))}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                      num(form.largura_tecido_cm) === largura
                        ? "bg-rose-600 text-white"
                        : "border border-stone-200 bg-white text-stone-500 hover:border-rose-200"
                    }`}
                  >
                    {largura} cm
                  </button>
                ))}
              </div>
              <Input
                className="mt-2"
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                value={form.largura_tecido_cm}
                onChange={(event) =>
                  update("largura_tecido_cm", event.target.value)
                }
                placeholder="Ex.: 150"
              />
            </Field>

            <Field label="Metragem disponível (m)" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.metragem_avulsa}
                onChange={(event) => update("metragem_avulsa", event.target.value)}
                placeholder="Ex.: 12,50"
              />
            </Field>

            <Field label="Custo por metro (R$)">
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.custo_unitario}
                onChange={(event) => update("custo_unitario", event.target.value)}
                placeholder="Ex.: 24,90"
              />
            </Field>
          </FormSection>
        ) : null}

        {categoria === "aviamento" ? (
          <FormSection
            title="Estoque do aviamento"
            description="A quantidade usa a unidade de controle escolhida."
          >
            <Field
              label={`Quantidade em estoque (${unidadeSelecionada.short})`}
              required
            >
              <Input
                type="number"
                min="0"
                step={
                  form.unidade_controle === "unidades" ||
                  form.unidade_controle === "pares"
                    ? "1"
                    : "0.01"
                }
                inputMode="decimal"
                value={form.quantidade_unidades}
                onChange={(event) =>
                  update("quantidade_unidades", event.target.value)
                }
                placeholder="Ex.: 10"
              />
            </Field>

            <Field label={`Custo por ${unidadeSelecionada.label.toLowerCase()} (R$)`}>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.custo_unitario}
                onChange={(event) => update("custo_unitario", event.target.value)}
                placeholder="Ex.: 2,50"
              />
            </Field>
          </FormSection>
        ) : null}

        {categoria === "fio_croche" ? (
          <FormSection
            title="Estoque e medidas"
            description="A metragem total é calculada automaticamente pelo banco."
          >
            <Field label="Metragem por novelo (m)" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.metragem_por_unidade}
                onChange={(event) =>
                  update("metragem_por_unidade", event.target.value)
                }
                placeholder="100"
              />
            </Field>
            <Field label="Peso por novelo (g)">
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.peso_por_unidade}
                onChange={(event) => update("peso_por_unidade", event.target.value)}
                placeholder="100"
              />
            </Field>
            <Field label="Novelos fechados">
              <Input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.quantidade_unidades}
                onChange={(event) =>
                  update("quantidade_unidades", event.target.value)
                }
              />
            </Field>
            <Field label="Sobra avulsa (m)">
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.metragem_avulsa}
                onChange={(event) => update("metragem_avulsa", event.target.value)}
              />
            </Field>
            <Field label="Custo por novelo (R$)" className="col-span-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.custo_unitario}
                onChange={(event) => update("custo_unitario", event.target.value)}
                placeholder="Ex.: 18,90"
              />
            </Field>
          </FormSection>
        ) : null}

        <FormSection
          title="Alerta de reposição"
          description="Mostra o selo vermelho quando o saldo ficar igual ou abaixo deste valor."
        >
          <Field
            label={`Estoque mínimo (${
              categoria === "aviamento" ? unidadeSelecionada.short : "m"
            })`}
            className="col-span-2"
            hint="Use 0 para desativar o alerta."
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.estoque_minimo}
              onChange={(event) => update("estoque_minimo", event.target.value)}
              placeholder="Ex.: 300"
            />
          </Field>
        </FormSection>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-amber-800">
              {categoria === "aviamento" ? "Quantidade disponível" : "Saldo total disponível"}
            </span>
            <span className="text-lg font-bold text-amber-900">
              {categoria === "aviamento"
                ? `${formatNumber(totalPrevisto, 2)} ${unidadeSelecionada.short}`
                : formatMeters(totalPrevisto, categoria === "tecido" ? 2 : 1)}
            </span>
          </div>
          <p className="text-[11px] text-amber-700/80">
            {categoria === "fio_croche" ? (
              <>
                {form.quantidade_unidades || 0} novelo(s) ×{" "}
                {form.metragem_por_unidade || 0} m + {form.metragem_avulsa || 0} m de
                sobra
              </>
            ) : categoria === "tecido" ? (
              <>
                Rolo de {form.largura_tecido_cm || 0} cm de largura ·{" "}
                {form.metragem_avulsa || 0} m disponíveis
              </>
            ) : (
              <>
                {form.quantidade_unidades || 0} {unidadeSelecionada.label.toLowerCase()} em
                estoque
              </>
            )}
          </p>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="sticky bottom-0 -mx-5 mt-3 flex gap-2 border-t border-stone-100 bg-white/95 px-5 py-3 backdrop-blur">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={saving}
            icon={saving ? <Loader2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            className="flex-1"
          >
            {saving ? "Salvando..." : material ? "Salvar alterações" : "Adicionar ao estoque"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
