import Link from "next/link";
import { Sparkles } from "lucide-react";
import { YarnLogo } from "./YarnLogo";

export function BrandHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-stone-50/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="AteliêFio — início">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-rose-600 text-white shadow-sm shadow-rose-600/20 transition group-hover:rotate-6">
            <YarnLogo className="h-6 w-6" />
          </span>
          <span className="leading-none">
            <span className="block font-display text-[1.35rem] font-semibold tracking-tight text-stone-900">
              AteliêFio
            </span>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">
              gestão do ateliê
            </span>
          </span>
        </Link>

        <span className="hidden items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800 sm:inline-flex">
          <Sparkles className="h-3.5 w-3.5" />
          Feito à mão, organizado
        </span>
      </div>
    </header>
  );
}
