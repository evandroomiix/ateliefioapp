"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Loader2, Save, Scissors, User } from "lucide-react";
import type { PecaProjeto, PedidoProducao, StatusPedido } from "@/lib/types";
import { STATUS_ORDER, STATUS_PEDIDO } from "@/lib/types";
import { formatNumber, num } from "@/lib/format";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { mensagemErro } from "@/lib/upload";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/components/AuthProvider";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/FormControls";

type PedidoFormProps = {
  open: boolean;
  pedido: PedidoProducao | null;
  pecas: PecaProjeto[];
  onClose: () => void;
  onSaved: () => void;
};

export function PedidoForm({ open, pedido, pecas, onClose, onSaved }: PedidoFormProps) {
  const { toast } = useToast();
  const { lojaAtiva } = useAuth();
  const [cliente, setCliente] = useState("");
  const [pecaId, setPecaId] = useState("");
  const [status, setStatus] = useState<StatusPedido>("orcamento");
  const [dataEntrega, setDataEntrega] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCliente(pedido?.cliente_nome ?? "");
    setPecaId(pedido?.peca_id ?? "");
    setStatus(pedido?.status ?? "orcamento");
    setDataEntrega(pedido?.data_entrega ? pedido.data_entrega.slice(0, 10) : "");
    setObservacoes(pedido?.observacoes ?? "");
    setError("");
  }, [open, pedido]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!cliente.trim()) {
      setError("Informe o nome da cliente para continuar.");
      return;
    }
    if (!pecaId) {
      setError("Escolha a peça do catálogo. O banco exige uma peça em cada pedido.");
      return;
    }

    setSaving(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error("Configure o Supabase no arquivo .env.local.");
      }

      const payload = {
        cliente_nome: cliente.trim(),
        peca_id: pecaId,
        status,
        data_entrega: dataEntrega || null,
        observacoes: observacoes.trim(),
      };

      const request = pedido
        ? supabase.from("pedidos_producao").update(payload).eq("id", pedido.id)
        : supabase.from("pedidos_producao").insert({ ...payload, loja_id: lojaAtiva!.id, estoque_baixado: false });

      const { error: saveError } = await request;
      if (saveError) throw saveError;

      toast(
        pedido ? "Pedido atualizado com sucesso." : "Nova encomenda registrada!",
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

  const pecaSelecionada = pecas.find((peca) => peca.id === pecaId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={pedido ? "Editar pedido" : "Nova encomenda"}
      description={
        pedido
          ? "Atualize os dados e o andamento da produção."
          : "Registre a cliente, a peça e o prazo de entrega."
      }
    >
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="Nome da cliente" required>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              value={cliente}
              onChange={(event) => setCliente(event.target.value)}
              placeholder="Ex.: Mariana Alves"
              className="pl-10"
              autoFocus
            />
          </div>
        </Field>

        <Field label="Peça do catálogo" required>
          <Select value={pecaId} onChange={(event) => setPecaId(event.target.value)}>
            <option value="" disabled>
              Selecione uma peça...
            </option>
            {pecas.map((peca) => (
              <option key={peca.id} value={peca.id}>
                {peca.nome}
              </option>
            ))}
          </Select>
        </Field>

        {pecas.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900">
            <p className="font-bold">Cadastre uma peça antes de criar pedidos.</p>
            <p className="mt-0.5">Todo pedido precisa estar vinculado a uma peça do catálogo.</p>
            <Link
              href="/pecas"
              className="mt-2 inline-flex items-center gap-1 font-bold text-rose-700 underline"
            >
              <Scissors className="h-3.5 w-3.5" />
              Ir para o catálogo de peças
            </Link>
          </div>
        ) : null}

        {pecaSelecionada ? (
          <div className="flex items-center gap-3 rounded-2xl bg-stone-50 p-2.5">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-stone-200">
              {pecaSelecionada.foto_peca_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pecaSelecionada.foto_peca_url}
                  alt={pecaSelecionada.nome}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-stone-400">
                  <Scissors className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-stone-800">
                {pecaSelecionada.nome}
              </p>
              <p className="text-[11px] text-stone-500">
                {num(pecaSelecionada.tempo_estimado_horas) > 0
                  ? `Prazo estimado de ${formatNumber(
                      pecaSelecionada.tempo_estimado_horas,
                    )} h`
                  : "Sem tempo estimado"}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusPedido)}
            >
              {STATUS_ORDER.map((option) => (
                <option key={option} value={option}>
                  {STATUS_PEDIDO[option].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data de entrega">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                type="date"
                value={dataEntrega}
                onChange={(event) => setDataEntrega(event.target.value)}
                className="pl-10"
              />
            </div>
          </Field>
        </div>

        <Field label="Observações">
          <Textarea
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
            placeholder="Cor desejada, detalhes de personalização, presente..."
            className="min-h-20"
          />
        </Field>

        {pedido?.estoque_baixado ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
            Os fios deste pedido já foram descontados do estoque.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-stone-100 bg-white/95 px-5 pb-1 pt-3 backdrop-blur">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={saving}
            disabled={pecas.length === 0}
            className="flex-1"
            icon={saving ? <Loader2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          >
            {saving ? "Salvando..." : pedido ? "Salvar pedido" : "Criar pedido"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
