"use client";

import { useEffect, useMemo, useState } from "react";
import { DollarSign, Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { Material, PecaMaterial, PecaProjeto } from "@/lib/types";
import { CATEGORIA_MATERIAL } from "@/lib/types";
import {
  categoriaDoMaterial,
  custoMaterialPeca,
  formatCurrency,
  formatMeters,
  formatNumber,
  num,
  unidadeInfo,
} from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { mensagemErro, uploadImagem } from "@/lib/upload";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/components/AuthProvider";
import { Modal } from "@/components/Modal";
import { PhotoField } from "@/components/PhotoField";
import { Button } from "@/components/ui/Button";
import { Field, FormSection, Input, Textarea } from "@/components/ui/FormControls";

type ItemReceita = {
  key: string;
  materialId: string;
  descricao: string;
  quantidade: string;
};

type PecaFormProps = {
  open: boolean;
  peca: PecaProjeto | null;
  relacoes: PecaMaterial[];
  materiais: Material[];
  onClose: () => void;
  onSaved: () => void;
};

function chave(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function itemVazio(): ItemReceita {
  return { key: chave(), materialId: "", descricao: "", quantidade: "" };
}

/** Unidade e passo usados no campo de quantidade da receita. */
function unidadeReceita(material: Material | undefined): { label: string; step: string } {
  if (!material) return { label: "m", step: "0.01" };
  if (categoriaDoMaterial(material) === "aviamento") {
    const unidade = unidadeInfo(material);
    return {
      label: unidade.short,
      step: unidade.value === "unidades" || unidade.value === "pares" ? "1" : "0.01",
    };
  }
  return { label: "m", step: "0.01" };
}

export function PecaForm({
  open,
  peca,
  relacoes,
  materiais,
  onClose,
  onSaved,
}: PecaFormProps) {
  const { toast } = useToast();
  const { lojaAtiva } = useAuth();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [horas, setHoras] = useState("");
  const [preco, setPreco] = useState("");
  const [itens, setItens] = useState<ItemReceita[]>([itemVazio()]);
  const [file, setFile] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [removeFoto, setRemoveFoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setNome(peca?.nome ?? "");
    setDescricao(peca?.descricao ?? "");
    setHoras(peca?.tempo_estimado_horas != null ? String(peca.tempo_estimado_horas) : "");
    setPreco(peca?.preco_venda_sugerido != null ? String(peca.preco_venda_sugerido) : "");
    setFotoUrl(peca?.foto_peca_url ?? null);
    setFile(null);
    setRemoveFoto(false);
    setError("");

    const itensDaPeca = relacoes
      .filter((relacao) => relacao.peca_id === peca?.id)
      .map((relacao) => ({
        key: relacao.id,
        materialId: relacao.material_id ?? "",
        descricao: relacao.descricao_requisito ?? "",
        quantidade:
          relacao.metragem_necessaria != null ? String(relacao.metragem_necessaria) : "",
      }));

    setItens(itensDaPeca.length > 0 ? itensDaPeca : [itemVazio()]);
  }, [open, peca, relacoes]);

  const custoEstimado = useMemo(() => {
    return itens.reduce((total, item) => {
      const material = materiais.find((m) => m.id === item.materialId);
      return total + custoMaterialPeca(material, num(item.quantidade));
    }, 0);
  }, [itens, materiais]);

  const margem = num(preco) - custoEstimado;
  const margemPercentual = num(preco) > 0 ? (margem / num(preco)) * 100 : 0;

  const atualizarItem = (key: string, patch: Partial<ItemReceita>) => {
    setItens((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!nome.trim()) {
      setError("Dê um nome à peça para continuar.");
      return;
    }

    const itensValidos = itens.filter(
      (item) => item.materialId && num(item.quantidade) > 0,
    );
    if (itens.some((item) => item.materialId && num(item.quantidade) <= 0)) {
      setError("Toda linha com material precisa ter uma quantidade maior que zero.");
      return;
    }
    if (itens.some((item) => !item.materialId && num(item.quantidade) > 0)) {
      setError("Escolha o material correspondente para cada quantidade informada.");
      return;
    }

    setSaving(true);
    try {
      let finalFoto = removeFoto ? null : fotoUrl;
      if (file) {
        finalFoto = await uploadImagem(file, "pecas");
      }

      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        foto_peca_url: finalFoto ?? "",
        tempo_estimado_horas: horas.trim() ? Math.max(0, num(horas)) : 0,
        preco_venda_sugerido: preco.trim() ? Math.max(0, num(preco)) : 0,
      };

      let pecaId = peca?.id ?? "";

      if (peca) {
        const { error: updateError } = await supabase
          .from("pecas_projetos")
          .update(payload)
          .eq("id", peca.id);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("pecas_projetos")
          .insert({ ...payload, loja_id: lojaAtiva!.id })
          .select("id")
          .single();
        if (insertError) throw insertError;
        pecaId = data.id as string;
      }

      const { error: deleteError } = await supabase
        .from("peca_materiais")
        .delete()
        .eq("peca_id", pecaId);
      if (deleteError) throw deleteError;

      if (itensValidos.length > 0) {
        const { error: itensError } = await supabase.from("peca_materiais").insert(
          itensValidos.map((item) => ({
            peca_id: pecaId,
            material_id: item.materialId,
            descricao_requisito: item.descricao.trim(),
            metragem_necessaria: Math.max(0, num(item.quantidade)),
          })),
        );
        if (itensError) throw itensError;
      }

      toast(peca ? "Peça atualizada no catálogo." : "Nova peça adicionada ao catálogo!", "success");
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
      title={peca ? "Editar peça" : "Nova peça"}
      description="Monte a receita, estime o custo e defina o preço com segurança."
      size="lg"
    >
      <form onSubmit={submit}>
        <PhotoField
          currentUrl={removeFoto ? null : fotoUrl}
          file={file}
          onFileChange={setFile}
          onRemoveCurrent={() => {
            setFotoUrl(null);
            setRemoveFoto(true);
          }}
          label="Foto da peça"
          hint="Mostre o resultado final para reconhecer a peça rapidamente."
        />

        <FormSection title="Sobre a peça">
          <Field label="Nome da peça" required className="col-span-2">
            <Input
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex.: Bolsa Verão"
              autoFocus
            />
          </Field>
          <Field label="Descrição" className="col-span-2">
            <Textarea
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="Modelo, ponto, tamanho, detalhes..."
              className="min-h-20"
            />
          </Field>
          <Field label="Tempo estimado (horas)">
            <Input
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              value={horas}
              onChange={(event) => setHoras(event.target.value)}
              placeholder="Ex.: 8"
            />
          </Field>
          <Field label="Preço sugerido (R$)">
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={preco}
              onChange={(event) => setPreco(event.target.value)}
              placeholder="Ex.: 180,00"
            />
          </Field>
        </FormSection>

        <FormSection
          title="Materiais da receita"
          description="Informe a quantidade necessária de fios, tecidos e aviamentos."
        >
          <div className="col-span-2 space-y-2.5">
            {itens.map((item, index) => {
              const material = materiais.find((m) => m.id === item.materialId);
              const custo = custoMaterialPeca(material, num(item.quantidade));
              const unidade = unidadeReceita(material);
              const categoria = material ? categoriaDoMaterial(material) : null;

              return (
                <div
                  key={item.key}
                  className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      {material && categoria
                        ? `${CATEGORIA_MATERIAL[categoria].singular} ${index + 1}`
                        : `Material ${index + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setItens((current) =>
                          current.length > 1
                            ? current.filter((linha) => linha.key !== item.key)
                            : [itemVazio()],
                        )
                      }
                      className="rounded-lg p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Remover material da receita"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid gap-2">
                    <select
                      value={item.materialId}
                      onChange={(event) =>
                        atualizarItem(item.key, { materialId: event.target.value })
                      }
                      className="input-base"
                    >
                      <option value="">Selecione o material...</option>
                      {materiais.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.nome}
                          {option.cor_nome ? ` — ${option.cor_nome}` : ""}
                          {option.lote ? ` · ${option.lote}` : ""}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-[1fr_7rem] gap-2">
                      <Input
                        value={item.descricao}
                        onChange={(event) =>
                          atualizarItem(item.key, { descricao: event.target.value })
                        }
                        placeholder="Onde será usado (opcional)"
                      />
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step={unidade.step}
                          inputMode="decimal"
                          value={item.quantidade}
                          onChange={(event) =>
                            atualizarItem(item.key, { quantidade: event.target.value })
                          }
                          placeholder="0"
                          className="pr-9"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-stone-400">
                          {unidade.label}
                        </span>
                      </div>
                    </div>

                    {material ? (
                      <div className="flex items-center justify-between gap-2 px-0.5 text-[10px] text-stone-500">
                        <span className="truncate">
                          {categoria === "fio_croche"
                            ? `${formatMeters(material.metragem_por_unidade)} por novelo${
                                num(material.metragem_avulsa) > 0
                                  ? ` · ${formatMeters(material.metragem_avulsa)} de sobra`
                                  : ""
                              }`
                            : categoria === "tecido"
                              ? `Rolo de ${
                                  num(material.largura_tecido_cm) > 0
                                    ? `${formatNumber(
                                        num(material.largura_tecido_cm) / 100,
                                        2,
                                      )} m`
                                    : "largura não informada"
                                }`
                              : `${unidadeInfo(material).label} · ${
                                  material.tamanho_especificacao || "sem especificação"
                                }`}
                        </span>
                        <span className="shrink-0 font-semibold text-stone-600">
                          custo est.: {formatCurrency(custo)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setItens((current) => [...current, itemVazio()])}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 py-2 text-xs font-bold text-stone-500 hover:border-rose-300 hover:bg-rose-50/40 hover:text-rose-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar material
            </button>
          </div>
        </FormSection>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50 p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            <DollarSign className="h-3.5 w-3.5" />
            Custo de material calculado
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-amber-700/80">Custo estimado</p>
              <p className="text-lg font-bold text-amber-950">{formatCurrency(custoEstimado)}</p>
            </div>
            <div>
              <p className="text-[10px] text-amber-700/80">Margem sobre o preço</p>
              <p
                className={`text-lg font-bold ${
                  num(preco) > 0 && margem < 0 ? "text-rose-700" : "text-emerald-800"
                }`}
              >
                {num(preco) > 0 ? formatCurrency(margem) : "—"}
                {num(preco) > 0 ? (
                  <span className="ml-1 text-[10px] font-semibold">
                    ({margemPercentual.toFixed(0)}%)
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-amber-700/80">
            Calculado pelo custo de cada material: novelo ÷ metragem nos fios, custo por metro
            nos tecidos e custo por unidade nos aviamentos. Ajuste o preço sugerido para cobrir
            também o seu tempo de trabalho.
          </p>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="sticky bottom-0 -mx-5 mt-4 flex gap-2 border-t border-stone-100 bg-white/95 px-5 py-3 backdrop-blur">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={saving}
            className="flex-1"
            icon={saving ? <Loader2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          >
            {saving ? "Salvando..." : peca ? "Salvar alterações" : "Criar peça"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
