"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import HeaderAuth from "./HeaderAuth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { estaAutenticado, cargando } = useAuth();

  const esRutaLogin = pathname === "/login";

  useEffect(() => {
    if (cargando) return;
    if (esRutaLogin) return;
    if (!estaAutenticado) {
      router.replace("/login");
    }
  }, [cargando, estaAutenticado, esRutaLogin, router]);

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-slate-600">Cargando…</div>
      </div>
    );
  }

  if (esRutaLogin) {
    return <>{children}</>;
  }

  if (!estaAutenticado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-slate-600">Redirigiendo al login…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="/" className="text-lg font-semibold text-slate-800">
            Bokadillo
          </a>
          <HeaderAuth />
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
