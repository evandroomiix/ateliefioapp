"use client";

import {
  AlertTriangle,
  Boxes,
  Hash,
  Layers,
  Loader2,
  Minus,
  Package,
  Pencil,
  Plus,
  Ruler,
  SlidersHorizontal,
} from "lucide-react";
import type { Material } from "@/lib/types";
import { CATEGORIA_MATERIAL } from "@/lib/types";
import {
  categoriaDoMaterial,
  estoqueBaixo,
  formatMeters,
  formatNumber,
  formatSaldo,
  num,
  totalDisponivel,
  unidadeInfo,
} from "@/lib/format";
import { YarnLogo } from "@/components/YarnLogo";

type MaterialCardProps = {
  material: Material;
  busy?: boolean;
  onEdit: (material: Material) => void;
  onAdjust: (material: Material) => void;
  onQuickAdjust?: (material: Material, delta: number) => void;
};

function formatLargura(material: Material): string {
  const largura = num(material.largura_tecido_cm);
  if (largura <= 0) return "Largura não informada";
  return `Largura ${formatNumber(largura / 100, 2)} m`;
}

export function MaterialCard({
  material,
  busy = false,
  onEdit,
  onAdjust,
  onQuickAdjust,
}: MaterialCardProps) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(material.cor_hex || "")
    ? material.cor_hex!
    : "#d6a6a6";
  const categoria = categoriaDoMaterial(material);
  const categoriaInfo = CATEGORIA_MATERIAL[categoria];
  const unidade = unidadeInfo(material);
  const total = totalDisponivel(material);
  const novelos = Math.max(0, Math.round(num(material.quantidade_unidades)));
  const sobra = Math.max(0, num(material.metragem_avulsa));
  const baixo = estoqueBaixo(material);
  const isFio = categoria === "fio_croche";
  const isTecido = categoria === "tecido";
  const isAviamento = categoria === "aviamento";

  const linhasTecnicas = isFio
    ? [
        material.tex ? `TEX ${material.tex}` : null,
        material.agulha_recomendada ? `Ag. ${material.agulha_recomendada}` : null,
        material.lote ? `Lote ${material.lote}` : null,
      ].filter(Boolean)
    : isTecido
      ? [
          formatLargura(material),
          material.composicao,
          material.cor_nome,
        ].filter(Boolean)
      : [
          material.tamanho_especificacao,
          unidade.label,
          material.marca,
        ].filter(Boolean);

  const IconePlaceholder = isFio ? YarnLogo : isTecido ? Layers : Boxes;
  const rotuloUnidade = isFio ? "novelo" : isTecido ? "metro" : unidade.short;

  return (
    <article className="card group flex flex-col overflow-hidden">
      <div className="relative h-36 shrink-0 overflow-hidden bg-stone-100">
        {material.foto_amostra_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={material.foto_amostra_url}
              alt={`Amostra de ${material.nome}`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/35 via-transparent to-transparent" />
          </>
        ) : (
          <div
            className="relative flex h-full items-center justify-center overflow-hidden"
            style={{
              background: `radial-gradient(circle at 70% 20%, ${hex}55, transparent 45%), linear-gradient(135deg, ${hex}22, #fafaf9 70%)`,
            }}
          >
            <div
              className="absolute -bottom-12 -right-7 h-32 w-32 rounded-full opacity-50 blur-2xl"
              style={{ backgroundColor: hex }}
            />
            <IconePlaceholder className="h-16 w-16 text-stone-500/40" />
            <span className="absolute bottom-3 left-3 text-[10px] font-bold uppercase tracking-[0.17em] text-stone-500/70">
              sem foto da amostra
            </span>
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-stone-700 shadow-sm backdrop-blur">
            <span
              className="h-2.5 w-2.5 rounded-full ring-1 ring-stone-900/10"
              style={{ backgroundColor: hex }}
            />
            {material.cor_nome || "Sem cor"}
          </span>
          {material.cor_codigo ? (
            <span className="rounded-full bg-stone-900/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
              {material.cor_codigo}
            </span>
          ) : null}
        </div>

        {material.lote && !isTecido ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-stone-600 shadow-sm backdrop-blur">
            <Hash className="h-3 w-3" />
            {material.lote}
          </span>
        ) : null}

        {baixo ? (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
            <AlertTriangle className="h-3 w-3" />
            Estoque Baixo
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-rose-500">
          {categoriaInfo.singular}
        </p>

        <div className="mt-0.5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[1.1rem] font-semibold leading-tight text-stone-900">
              {material.nome}
            </h3>
            <p className="mt-0.5 truncate text-xs text-stone-500">
              {[material.marca, isFio || isTecido ? material.composicao : null]
                .filter(Boolean)
                .join(" · ") ||
                (isAviamento
                  ? material.tamanho_especificacao || "Aviamento do ateliê"
                  : "Marca e composição não informadas")}
            </p>
          </div>
          {isFio && material.tex ? (
            <span className="shrink-0 rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-500">
              TEX {material.tex}
            </span>
          ) : null}
        </div>

        {linhasTecnicas.length > 0 ? (
          <p className="mt-2 line-clamp-1 text-[10px] font-semibold text-stone-400">
            {linhasTecnicas.join(" • ")}
          </p>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          {isFio ? (
            <>
              <div className="rounded-xl bg-stone-50 px-3 py-2">
                <div className="flex items-center gap-1 text-stone-400">
                  <Package className="h-3 w-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    Novelos
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-bold text-stone-800">
                  {novelos}{" "}
                  <span className="text-[10px] font-medium text-stone-400">fechados</span>
                </p>
              </div>
              <div className="rounded-xl bg-stone-50 px-3 py-2">
                <div className="flex items-center gap-1 text-stone-400">
                  <Layers className="h-3 w-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    Sobra
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-bold text-stone-800">
                  {formatMeters(sobra)}
                </p>
              </div>
            </>
          ) : isTecido ? (
            <>
              <div className="rounded-xl bg-stone-50 px-3 py-2">
                <div className="flex items-center gap-1 text-stone-400">
                  <Ruler className="h-3 w-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    Largura
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm font-bold text-stone-800">
                  {num(material.largura_tecido_cm) > 0
                    ? `${formatNumber(num(material.largura_tecido_cm) / 100, 2)} m`
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-stone-50 px-3 py-2">
                <div className="flex items-center gap-1 text-stone-400">
                  <Layers className="h-3 w-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    Estoque mín.
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-bold text-stone-800">
                  {num(material.estoque_minimo) > 0
                    ? formatSaldo(material, material.estoque_minimo)
                    : "—"}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-stone-50 px-3 py-2">
                <div className="flex items-center gap-1 text-stone-400">
                  <Boxes className="h-3 w-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    Especificação
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm font-bold text-stone-800">
                  {material.tamanho_especificacao || "—"}
                </p>
              </div>
              <div className="rounded-xl bg-stone-50 px-3 py-2">
                <div className="flex items-center gap-1 text-stone-400">
                  <Package className="h-3 w-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    Unidade
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-bold text-stone-800">{unidade.short}</p>
              </div>
            </>
          )}
        </div>

        <div
          className={`mt-2.5 flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
            baixo
              ? "border-rose-200 bg-rose-50"
              : "border-amber-200/70 bg-amber-50"
          }`}
        >
          <div
            className={`flex items-center gap-1.5 ${
              baixo ? "text-rose-700" : "text-amber-800"
            }`}
          >
            <Ruler className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Disponível
            </span>
          </div>
          <p
            className={`font-display text-xl font-semibold leading-none ${
              baixo ? "text-rose-900" : "text-amber-900"
            }`}
          >
            {formatSaldo(material)}
          </p>
        </div>

        <div className="mt-auto flex items-center gap-1.5 pt-3">
          <div className="flex h-9 items-center rounded-xl border border-stone-200 bg-white">
            <button
              type="button"
              onClick={() => onQuickAdjust?.(material, -1)}
              disabled={busy || total <= 0 || !onQuickAdjust}
              className="grid h-full w-8 place-items-center rounded-l-xl text-stone-500 transition hover:bg-stone-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={`Remover um ${rotuloUnidade} de ${material.nome}`}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-7 px-1 text-center text-xs font-bold text-stone-700">
              {busy ? (
                <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
              ) : isFio ? (
                formatNumber(novelos, 0)
              ) : isTecido ? (
                `${formatNumber(total, 1)}m`
              ) : (
                `${formatNumber(total, 1)} ${unidade.short}`
              )}
            </span>
            <button
              type="button"
              onClick={() => onQuickAdjust?.(material, 1)}
              disabled={busy || !onQuickAdjust}
              className="grid h-full w-8 place-items-center rounded-r-xl text-stone-500 transition hover:bg-stone-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={`Adicionar um ${rotuloUnidade} de ${material.nome}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onAdjust(material)}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-2 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Ajustar
          </button>
          <button
            type="button"
            onClick={() => onEdit(material)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-stone-200 text-stone-500 transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-800"
            aria-label={`Editar ${material.nome}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
