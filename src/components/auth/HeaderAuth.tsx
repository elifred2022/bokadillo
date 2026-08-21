"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function HeaderAuth() {
  const { usuario, logout, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.replace("/login");
    router.refresh();
  };

  const linkClass = (href: string) =>
    `text-sm font-medium ${
      pathname === href
        ? "text-red-700"
        : "text-slate-600 hover:text-slate-800"
    }`;

  return (
    <div className="flex items-center gap-3 sm:gap-5">
      {!isAdmin && usuario ? (
        <nav className="flex items-center gap-3 sm:gap-4">
          <Link href="/catalogo" className={linkClass("/catalogo")}>
            Productos
          </Link>
          <Link href="/mis-pedidos" className={linkClass("/mis-pedidos")}>
            Mis pedidos
          </Link>
        </nav>
      ) : null}
      <span className="max-w-[9rem] truncate text-sm text-slate-600 sm:max-w-none">
        {usuario ? (
          <>
            Hola, <strong>{usuario.nombre}</strong>
          </>
        ) : null}
      </span>
      <button
        type="button"
        onClick={handleLogout}
        className="text-sm text-slate-600 hover:text-slate-800 underline"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
