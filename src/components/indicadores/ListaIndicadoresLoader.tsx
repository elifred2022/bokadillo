"use client";

import { useCallback, useEffect, useState } from "react";
import ListaIndicadores from "./ListaIndicadores";
import type { VentaList, CompraList } from "@/lib/google-sheets";

export default function ListaIndicadoresLoader() {
  const [ventas, setVentas] = useState<VentaList[] | null>(null);
  const [compras, setCompras] = useState<CompraList[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    const fetchVentas = fetch("/api/ventas", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar ventas");
        return res.json();
      })
      .then((data) => setVentas(data.ventas ?? []));

    const fetchCompras = fetch("/api/compras", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar compras");
        return res.json();
      })
      .then((data) => setCompras(data.compras ?? []));

    return Promise.all([fetchVentas, fetchCompras]).catch((err) =>
      setError(err.message ?? "Error de conexión")
    );
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50/80 p-6">
        <div className="text-center">
          <p className="mb-2 text-red-600">{error}</p>
          <a href="/" className="text-red-600 underline">
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  if (ventas === null || compras === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50/80 p-6">
        <p className="text-slate-500">Cargando indicadores...</p>
      </div>
    );
  }

  return (
    <ListaIndicadores
      ventas={ventas}
      compras={compras}
      onMutate={fetchData}
    />
  );
}
