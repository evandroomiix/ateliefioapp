import Link from "next/link";
import { Scissors } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <span className="grid h-20 w-20 place-items-center rounded-[2rem] bg-rose-50 text-rose-400">
        <Scissors className="h-9 w-9" />
      </span>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-600">
        Ponto perdido
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-stone-900">
        Esta página não existe
      </h1>
      <p className="mt-2 max-w-sm text-sm text-stone-500">
        Volte ao estoque para continuar cuidando dos seus fios.
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-11 items-center rounded-2xl bg-rose-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-rose-700"
      >
        Voltar ao estoque
      </Link>
    </div>
  );
}
