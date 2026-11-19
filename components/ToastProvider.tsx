"use client";

import { useCallback, createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastContextValue = {
  toast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<
  ToastKind,
  { container: string; icon: ReactNode }
> = {
  success: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />,
  },
  error: {
    container: "border-rose-200 bg-rose-50 text-rose-900",
    icon: <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />,
  },
  info: {
    container: "border-amber-200 bg-amber-50 text-amber-900",
    icon: <Info className="h-5 w-5 shrink-0 text-amber-700" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current.slice(-2), { id, kind, message }]);
      window.setTimeout(() => remove(id), 4800);
    },
    [remove],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex w-full max-w-md animate-toast-in items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg shadow-stone-900/5 ${toastStyles[item.kind].container}`}
          >
            {toastStyles[item.kind].icon}
            <p className="flex-1 leading-snug">{item.message}</p>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="-mr-1 rounded-full p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
              aria-label="Fechar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast precisa ser usado dentro de ToastProvider");
  }
  return context;
}
