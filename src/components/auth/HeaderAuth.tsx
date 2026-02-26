"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function HeaderAuth() {
  const { usuario, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-slate-600">
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
