"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, ClipboardList, Package, Scissors, Users } from "lucide-react";

const items = [
  { href: "/", label: "Estoque", icon: Package },
  { href: "/simulador", label: "Simulador", icon: Calculator },
  { href: "/pecas", label: "Peças", icon: Scissors },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/loja", label: "Loja", icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200/80 bg-white/95 shadow-[0_-8px_30px_-20px_rgba(68,64,60,.4)] backdrop-blur-xl">
      <div className="safe-bottom mx-auto grid w-full max-w-3xl grid-cols-5 px-2 pt-1.5">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex flex-col items-center gap-1 rounded-2xl px-1 pb-1.5 pt-1 transition ${
                active ? "text-rose-700" : "text-stone-400 hover:text-stone-600"
              }`}
            >
              <span
                className={`grid h-8 w-12 place-items-center rounded-2xl transition-all ${
                  active
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                    : "bg-transparent group-hover:bg-stone-100"
                }`}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
