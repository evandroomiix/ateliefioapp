import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pedidos",
  description: "Encomendas do ateliê por cliente, status e data de entrega.",
};

export default function PedidosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
