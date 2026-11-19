import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peças & receitas",
  description: "Catálogo de peças com materiais, tempo de produção e custo estimado.",
};

export default function PecasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
