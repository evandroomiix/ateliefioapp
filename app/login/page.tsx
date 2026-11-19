import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase";
import { LoginForm } from "@/components/LoginForm";
import { SetupNotice } from "@/components/SetupNotice";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string; erro?: string };
}) {
  const next = (searchParams?.next || "/").startsWith("/")
    ? searchParams?.next || "/"
    : "/";

  return (
    <main className="min-h-dvh bg-artisan-grain">
      {isSupabaseConfigured ? (
        <LoginForm next={next} erroInicial={searchParams?.erro} />
      ) : (
        <div className="mx-auto w-full max-w-md px-4 py-10">
          <SetupNotice />
        </div>
      )}
    </main>
  );
}
