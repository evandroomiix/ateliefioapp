import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulador",
  description: "Descubra se o fio disponível cobre a peça que você quer produzir.",
};

export default function SimuladorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
