"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import type { Articulo } from "@/lib/google-sheets";
import { formatPrecio } from "@/lib/formato";
import { contienePalabraCompleta } from "@/lib/filtro";
import FormArticulos from "./FormArticulos";

interface ListaArticulosProps {
  articulos: Articulo[];
  onMutate?: () => void;
}

export default function ListaArticulos({ articulos, onMutate }: ListaArticulosProps) {
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [articuloEditando, setArticuloEditando] = useState<Articulo | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  const articulosFiltrados = filtro.trim()
    ? articulos.filter((art) => {
        const texto = filtro.trim();
        const matchCodBarra = contienePalabraCompleta(art.codbarra, texto);
        const matchId = contienePalabraCompleta(art.idarticulo || "", texto);
        const matchNombre = contienePalabraCompleta(art.nombre, texto);
        const matchDesc = contienePalabraCompleta(art.descripcion || "", texto);
        return matchCodBarra || matchId || matchNombre || matchDesc;
      })
    : articulos;

  function descargarExcel() {
    const rows = articulosFiltrados.map((art) => ({
      "Cod barra": art.codbarra,
      "ID Artículo": art.idarticulo,
      Nombre: art.nombre,
      Descripción: art.descripcion ?? "",
      Precio: art.precio,
      Stock: art.stock,
      Categoría: art.categoria ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Artículos");
    const nombre = `articulos_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, nombre);
  }

  function abrirCrear() {
    setArticuloEditando(null);
    setMostrarForm(true);
  }

  function abrirEditar(art: Articulo) {
    setArticuloEditando(art);
    setMostrarForm(true);
  }

  function cerrarForm() {
    setMostrarForm(false);
    setArticuloEditando(null);
  }

  async function handleEliminar(id: string) {
    if (!confirm(`¿Eliminar el artículo "${articulos.find((a) => a.idarticulo === id)?.nombre}"?`)) return;
    setEliminando(id);
    try {
      const res = await fetch(`/api/articulos/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }
      onMutate?.() ?? router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setEliminando(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="btn-secondary mb-4 sm:mb-6 w-fit">
          ← Volver al inicio
        </Link>
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">
            Lista de artículos
          </h1>
          <button
            type="button"
            onClick={abrirCrear}
            className="btn-primary w-fit"
          >
            + Crear artículo
          </button>
        </div>
        {mostrarForm && (
          <FormArticulos
            onCerrar={cerrarForm}
            articulo={articuloEditando}
            onMutate={onMutate}
          />
        )}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por código, nombre..."
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="button"
            onClick={descargarExcel}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Descargar a Excel
          </button>
        </div>
        <div className="rounded-xl shadow-sm border border-slate-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="bg-sky-100">
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800 whitespace-nowrap">Cod barra</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800 whitespace-nowrap">ID Artículo</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800 whitespace-nowrap">Nombre</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800 whitespace-nowrap">Precio</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800 whitespace-nowrap">Stock</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-sky-800 whitespace-nowrap">Act</th>
                </tr>
              </thead>
              <tbody>
                {articulosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-slate-500 bg-white"
                    >
                      {articulos.length === 0
                        ? "No hay artículos disponibles"
                        : "Ningún artículo coincide con el filtro"}
                    </td>
                  </tr>
                ) : (
                  articulosFiltrados.map((art, i) => (
                    <tr
                      key={art.idarticulo || `art-${i}`}
                      className="border-t border-slate-100 bg-white hover:bg-sky-50/50 transition-colors"
                    >
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{art.codbarra}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{art.idarticulo}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">{art.nombre}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">{formatPrecio(art.precio)}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">{art.stock}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex flex-nowrap gap-1">
                          <button
                            type="button"
                            onClick={() => abrirEditar(art)}
                            className="rounded-lg bg-sky-50 px-2 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(art.idarticulo)}
                            disabled={eliminando === art.idarticulo}
                            className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {eliminando === art.idarticulo ? "…" : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
