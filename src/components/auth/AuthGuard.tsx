"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import HeaderAuth from "./HeaderAuth";

const RUTAS_ADMIN = [
  "/",
  "/listaarticulos",
  "/listaventas",
  "/listaclientes",
  "/listacompras",
  "/listaproveedores",
];

function esRutaAdmin(pathname: string): boolean {
  return RUTAS_ADMIN.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { estaAutenticado, cargando, isAdmin } = useAuth();

  const esRutaLogin = pathname === "/login";

  useEffect(() => {
    if (cargando) return;
    if (esRutaLogin) return;
    if (!estaAutenticado) {
      router.replace("/login");
      return;
    }
    if (!isAdmin && esRutaAdmin(pathname)) {
      router.replace("/mis-pedidos");
    }
  }, [cargando, estaAutenticado, isAdmin, esRutaLogin, pathname, router]);

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50/80">
        <div className="text-slate-600">Cargando…</div>
      </div>
    );
  }

  if (esRutaLogin) {
    return <>{children}</>;
  }

  if (!estaAutenticado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50/80">
        <div className="text-slate-600">Redirigiendo al login…</div>
      </div>
    );
  }

  if (!isAdmin && esRutaAdmin(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50/80">
        <div className="text-slate-600">Redirigiendo a tus pedidos…</div>
      </div>
    );
  }

  const linkInicio = isAdmin ? "/" : "/mis-pedidos";

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href={linkInicio} className="text-lg font-semibold text-slate-800">
            Bokadillo
          </a>
          <HeaderAuth />
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
