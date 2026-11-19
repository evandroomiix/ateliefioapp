"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Layers, Minus, Package, Plus, Ruler, Scale } from "lucide-react";
import type { Material } from "@/lib/types";
import {
  categoriaDoMaterial,
  formatMeters,
  formatNumber,
  formatSaldo,
  metrosPorPeso,
  num,
  round,
  totalDisponivel,
  unidadeInfo,
} from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { mensagemErro } from "@/lib/upload";
import { useToast } from "@/components/ToastProvider";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/FormControls";

type AjusteModalProps = {
  material: Material | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function AjusteModal({ material, open, onClose, onSaved }: AjusteModalProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"novelos" | "sobra">("novelos");
  const [novelos, setNovelos] = useState(0);
  const [modo, setModo] = useState<"metros" | "gramas">("metros");
  const [sobraInput, setSobraInput] = useState("0");
  const [quantidade, setQuantidade] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !material) return;
    setTab("novelos");
    setNovelos(Math.max(0, Math.round(num(material.quantidade_unidades))));
    setModo("metros");
    setSobraInput(String(num(material.metragem_avulsa)));
    setQuantidade(String(totalDisponivel(material)));
    setError("");
  }, [open, material]);

  const categoria = material ? categoriaDoMaterial(material) : "fio_croche";
  const isFio = categoria === "fio_croche";
  const isTecido = categoria === "tecido";
  const unidade = material ? unidadeInfo(material) : null;

  const metrosSobra = useMemo(() => {
    if (!material) return 0;
    const value = Math.max(0, num(sobraInput));
    return modo === "gramas" ? metrosPorPeso(value, material) : value;
  }, [material, modo, sobraInput]);

  const totalDepois = useMemo(() => {
    if (!material) return 0;
    if (isFio) {
      if (tab === "novelos") {
        return novelos * num(material.metragem_por_unidade) + num(material.metragem_avulsa);
      }
      return num(material.quantidade_unidades) * num(material.metragem_por_unidade) + metrosSobra;
    }
    return Math.max(0, num(quantidade));
  }, [isFio, material, metrosSobra, novelos, quantidade, tab]);

  if (!material) return null;

  const salvar = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = isFio
        ? tab === "novelos"
          ? { quantidade_unidades: Math.max(0, Math.round(novelos)) }
          : { metragem_avulsa: round(Math.max(0, metrosSobra), 2) }
        : isTecido
          ? { quantidade_unidades: 0, metragem_avulsa: round(Math.max(0, num(quantidade)), 2) }
          : { quantidade_unidades: round(Math.max(0, num(quantidade)), 2), metragem_avulsa: 0 };

      const { error: saveError } = await supabase
        .from("materiais")
        .update(payload)
        .eq("id", material.id);

      if (saveError) throw saveError;

      toast(
        isFio
          ? tab === "novelos"
            ? "Contagem de novelos atualizada."
            : "Sobra do fio atualizada."
          : isTecido
            ? "Metragem do tecido atualizada."
            : "Quantidade do aviamento atualizada.",
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

  const podeConverter = num(material.peso_por_unidade) > 0;
  const passo = unidade && (unidade.value === "unidades" || unidade.value === "pares") ? 1 : 0.1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajustar estoque"
      description={material.nome}
    >
      {isFio ? (
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => setTab("novelos")}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
              tab === "novelos"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Novelos
          </button>
          <button
            type="button"
            onClick={() => setTab("sobra")}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
              tab === "sobra"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <Ruler className="h-3.5 w-3.5" />
            Sobra avulsa
          </button>
        </div>
      ) : null}

      {isFio && tab === "novelos" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-center text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Novelos fechados
            </p>
            <div className="mt-3 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setNovelos((value) => Math.max(0, value - 1))}
                className="grid h-12 w-12 place-items-center rounded-2xl border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:border-rose-200 hover:text-rose-600"
                aria-label="Diminuir um novelo"
              >
                <Minus className="h-5 w-5" />
              </button>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={novelos}
                onChange={(event) => setNovelos(Math.max(0, Math.round(num(event.target.value))))}
                className="w-24 border-0 bg-transparent text-center font-display text-4xl font-semibold text-stone-900 outline-none"
                aria-label="Quantidade de novelos"
              />
              <button
                type="button"
                onClick={() => setNovelos((value) => value + 1)}
                className="grid h-12 w-12 place-items-center rounded-2xl border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:border-rose-200 hover:text-rose-600"
                aria-label="Aumentar um novelo"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-stone-500">
              {formatNumber(material.metragem_por_unidade)} m por novelo · antes:{" "}
              {formatNumber(material.quantidade_unidades, 0)} novelo(s)
            </p>
          </div>
        </div>
      ) : isFio ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-stone-200 p-1">
            <button
              type="button"
              onClick={() => setModo("metros")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                modo === "metros" ? "bg-rose-600 text-white" : "text-stone-500"
              }`}
            >
              Metros
            </button>
            <button
              type="button"
              onClick={() => setModo("gramas")}
              disabled={!podeConverter}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                modo === "gramas" ? "bg-rose-600 text-white" : "text-stone-500"
              }`}
            >
              Gramas
            </button>
          </div>

          <Field
            label={modo === "metros" ? "Sobra em metros" : "Peso da sobra (g)"}
            hint={modo === "gramas" ? "conversão automática" : undefined}
          >
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={sobraInput}
              onChange={(event) => setSobraInput(event.target.value)}
              autoFocus
            />
          </Field>

          {modo === "gramas" ? (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3">
              <Scale className="h-5 w-5 shrink-0 text-rose-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                  Conversão automática
                </p>
                <p className="text-sm text-stone-700">
                  {formatNumber(sobraInput, 0)} g ÷ {formatNumber(material.peso_por_unidade)} g ×{" "}
                  {formatNumber(material.metragem_por_unidade)} m ={" "}
                  <strong>{formatMeters(metrosSobra, 2)}</strong>
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex items-start gap-2 rounded-xl bg-stone-50 px-3 py-2.5 text-[11px] leading-relaxed text-stone-500">
            <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              O peso é convertido usando a metragem e o peso por novelo cadastrados. A sobra
              fica disponível sem descontar novelos fechados.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center justify-center gap-1.5 text-stone-500">
              {isTecido ? <Layers className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
              <p className="text-[11px] font-bold uppercase tracking-wider">
                {isTecido ? "Metragem do rolo" : "Quantidade em estoque"}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setQuantidade(String(Math.max(0, round(num(quantidade) - passo, 2))))}
                className="grid h-12 w-12 place-items-center rounded-2xl border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:border-rose-200 hover:text-rose-600"
                aria-label={`Diminuir ${passo} ${unidade?.short ?? ""}`}
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  min={0}
                  step={passo}
                  inputMode="decimal"
                  value={quantidade}
                  onChange={(event) => setQuantidade(event.target.value)}
                  className="w-24 border-0 bg-transparent text-center font-display text-4xl font-semibold text-stone-900 outline-none"
                  aria-label="Quantidade em estoque"
                />
                <span className="text-sm font-bold text-stone-400">
                  {isTecido ? "m" : unidade?.short}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuantidade(String(round(num(quantidade) + passo, 2)))}
                className="grid h-12 w-12 place-items-center rounded-2xl border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:border-rose-200 hover:text-rose-600"
                aria-label={`Aumentar ${passo} ${unidade?.short ?? ""}`}
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-stone-500">
              {isTecido
                ? `Largura do rolo: ${
                    num(material.largura_tecido_cm) > 0
                      ? `${formatNumber(num(material.largura_tecido_cm) / 100, 2)} m`
                      : "não informada"
                  }`
                : `Unidade de controle: ${unidade?.label ?? "unidades"}`}
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-stone-50 px-3 py-2.5 text-[11px] leading-relaxed text-stone-500">
            <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              {isTecido
                ? "Informe a metragem total que ainda resta no rolo. O saldo do tecido passa a ser esse valor."
                : "Informe a quantidade real disponível. O saldo do aviamento passa a ser esse valor."}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
          Total após ajuste
        </span>
        <span className="font-display text-xl font-semibold text-amber-900">
          {formatSaldo(material, totalDepois)}
        </span>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={salvar} loading={saving} className="flex-1">
          {saving ? "Salvando..." : "Salvar ajuste"}
        </Button>
      </div>
    </Modal>
  );
}
