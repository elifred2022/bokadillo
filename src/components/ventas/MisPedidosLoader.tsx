"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import MisPedidos from "./MisPedidos";
import type { VentaList } from "@/lib/google-sheets";

export default function MisPedidosLoader() {
  const { usuario } = useAuth();
  const [ventas, setVentas] = useState<VentaList[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVentas = useCallback(() => {
    return fetch("/api/ventas", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar pedidos");
        return res.json();
      })
      .then((data) => {
        const todas: VentaList[] = data.ventas ?? [];
        const nombreUsuario = usuario?.nombre?.trim().toLowerCase() ?? "";
        const filtradas = nombreUsuario
          ? todas.filter(
              (v) =>
                (v.cliente ?? "").trim().toLowerCase() === nombreUsuario
            )
          : [];
        setVentas(filtradas);
      })
      .catch((err) => setError(err.message ?? "Error de conexión"));
  }, [usuario?.nombre]);

  useEffect(() => {
    if (!usuario) return;
    fetchVentas();
  }, [usuario, fetchVentas]);

  if (error) {
    return (
      <div className="min-h-screen bg-red-50/80 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <a href="/mis-pedidos" className="text-red-600 underline">
            Reintentar
          </a>
        </div>
      </div>
    );
  }

  if (ventas === null) {
    return (
      <div className="min-h-screen bg-red-50/80 p-6 flex items-center justify-center">
        <p className="text-slate-500">Cargando tus pedidos...</p>
      </div>
    );
  }

  return <MisPedidos ventas={ventas} onMutate={fetchVentas} />;
}
