import { Database, ExternalLink } from "lucide-react";

export function SetupNotice() {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-amber-100 bg-amber-50/80 px-5 py-4">
        <div className="flex items-center gap-2 text-amber-900">
          <Database className="h-5 w-5" />
          <h2 className="font-display text-lg font-semibold">Conecte o seu Supabase</h2>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-amber-800">
          O app já está pronto. Para carregar seus fios e projetos, informe as chaves do
          projeto no arquivo <code className="rounded bg-white/70 px-1 py-0.5">.env.local</code>.
        </p>
      </div>
      <div className="space-y-3 px-5 py-5 text-sm text-stone-600">
        <p className="font-semibold text-stone-800">No terminal, dentro da pasta do app:</p>
        <pre className="overflow-x-auto rounded-2xl bg-stone-900 p-4 text-xs leading-relaxed text-stone-100">
          <code>{`cp .env.local.example .env.local\nnpm run dev`}</code>
        </pre>
        <p>
          Preencha <strong>NEXT_PUBLIC_SUPABASE_URL</strong> e{" "}
          <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> com os dados de{" "}
          <em>Project Settings → API</em>.
        </p>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold text-rose-700 hover:text-rose-800"
        >
          Abrir painel do Supabase
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
