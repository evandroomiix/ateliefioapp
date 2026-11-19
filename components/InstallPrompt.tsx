"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("ateliefio:install-dismissed") === "1") {
      setDismissed(true);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!promptEvent || dismissed) return null;

  const install = async () => {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setPromptEvent(null);
  };

  const close = () => {
    window.localStorage.setItem("ateliefio:install-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="install-safe fixed inset-x-4 z-50 mx-auto max-w-md animate-sheet-in rounded-2xl border border-rose-200 bg-white p-3 shadow-xl shadow-rose-950/10">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-stone-900">Instale o AteliêFio</p>
          <p className="text-xs leading-snug text-stone-500">
            Acesso rápido na tela inicial, como um app.
          </p>
        </div>
        <button
          type="button"
          onClick={install}
          className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={close}
          className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100"
          aria-label="Dispensar convite de instalação"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
