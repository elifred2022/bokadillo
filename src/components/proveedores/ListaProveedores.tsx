"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Proveedor } from "@/lib/google-sheets";
import { contienePalabraCompleta } from "@/lib/filtro";
import FormProveedores from "./FormProveedores";

interface ListaProveedoresProps {
  proveedores: Proveedor[];
  onMutate?: () => void;
}

export default function ListaProveedores({
  proveedores,
  onMutate,
}: ListaProveedoresProps) {
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState<Proveedor | null>(
    null
  );
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  const proveedoresFiltrados = filtro.trim()
    ? proveedores.filter((prov) => {
        const texto = filtro.trim();
        const matchId = contienePalabraCompleta(prov.idproveedor || "", texto);
        const matchNombre = contienePalabraCompleta(prov.nombre, texto);
        const matchTel = contienePalabraCompleta(prov.telefono || "", texto);
        const matchEmail = contienePalabraCompleta(prov.email || "", texto);
        const matchDir = contienePalabraCompleta(prov.direccion || "", texto);
        const matchContacto = contienePalabraCompleta(prov.contacto || "", texto);
        return matchId || matchNombre || matchTel || matchEmail || matchDir || matchContacto;
      })
    : proveedores;

  function abrirCrear() {
    setProveedorEditando(null);
    setMostrarForm(true);
  }

  function abrirEditar(prov: Proveedor) {
    setProveedorEditando(prov);
    setMostrarForm(true);
  }

  function cerrarForm() {
    setMostrarForm(false);
    setProveedorEditando(null);
  }

  async function handleEliminar(id: string) {
    const nombre =
      proveedores.find((p) => p.idproveedor === id)?.nombre ?? "este proveedor";
    if (!confirm(`¿Eliminar el proveedor "${nombre}"?`)) return;
    setEliminando(id);
    try {
      const res = await fetch(
        `/api/proveedores/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }
      onMutate?.() ?? router.refresh();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Error al eliminar"
      );
    } finally {
      setEliminando(null);
    }
  }

  return (
    <div className="min-h-screen bg-red-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="btn-secondary mb-4 sm:mb-6 w-fit">
          ← Volver al inicio
        </Link>
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">
            Lista de proveedores
          </h1>
          <button
            type="button"
            onClick={abrirCrear}
            className="btn-primary w-fit"
          >
            + Crear proveedor
          </button>
        </div>
        {mostrarForm && (
          <FormProveedores
            onCerrar={cerrarForm}
            proveedor={proveedorEditando}
            onMutate={onMutate}
          />
        )}
        <div className="mb-4">
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por ID, nombre, teléfono..."
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div className="rounded-xl shadow-sm border border-slate-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="bg-red-100">
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">ID Proveedor</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">Nombre</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">Telefono</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">Email</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">Direccion</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">Contacto</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">Act</th>
                </tr>
              </thead>
              <tbody>
                {proveedoresFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500 bg-white"
                    >
                      {proveedores.length === 0
                        ? "No hay proveedores disponibles"
                        : "Ningún proveedor coincide con el filtro"}
                    </td>
                  </tr>
                ) : (
                  proveedoresFiltrados.map((prov, i) => (
                    <tr
                      key={prov.idproveedor || `prov-${i}`}
                      className="border-t border-slate-100 bg-white hover:bg-red-50/50 transition-colors"
                    >
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{prov.idproveedor}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">{prov.nombre}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{prov.telefono ?? "—"}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{prov.email ?? "—"}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{prov.direccion ?? "—"}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{prov.contacto ?? "—"}</td>
                      <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex flex-nowrap gap-1">
                          <button
                            type="button"
                            onClick={() => abrirEditar(prov)}
                            className="rounded-lg bg-green-50 px-2 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(prov.idproveedor)}
                            disabled={eliminando === prov.idproveedor}
                            className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {eliminando === prov.idproveedor ? "…" : "Eliminar"}
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
