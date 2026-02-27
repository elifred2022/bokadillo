"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import type { VentaList, ArticuloVenta } from "@/lib/google-sheets";
import { formatPrecio } from "@/lib/formato";
import { contienePalabraCompleta } from "@/lib/filtro";
import FormVentas from "./FormVentas";

interface ModalVerVentaProps {
  venta: VentaList;
  onCerrar: () => void;
  onEditar: () => void;
}

function ModalVerVenta({ venta, onCerrar, onEditar }: ModalVerVentaProps) {
  const articulos = venta.articulos ?? [];
  const tieneArticulos = articulos.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl my-8 overflow-hidden">
        <div className="bg-red-600 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Detalle de venta #{venta.idventa}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            className="text-white/90 hover:text-white p-1 rounded"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500 block">Fecha</span>
              <span className="font-medium text-slate-800">{venta.fecha || "-"}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Cliente</span>
              <span className="font-medium text-slate-800">{venta.cliente || "-"}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Estado</span>
              <span className={`font-medium ${
                /^\d{4}-\d{2}-\d{2}$/.test((venta.entregado ?? "").trim())
                  ? "text-green-600"
                  : (venta.entregado ?? "").toLowerCase() === "pendiente" || !venta.entregado
                    ? "text-red-600"
                    : "text-amber-600"
              }`}>
                {/^\d{4}-\d{2}-\d{2}$/.test((venta.entregado ?? "").trim())
                  ? `Entregado - ${(venta.entregado ?? "").trim()}`
                  : (venta.entregado ?? "").toLowerCase() === "pendiente" || !venta.entregado
                    ? "Nuevo pedido"
                    : venta.entregado}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Artículos</h3>
            {tieneArticulos ? (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Artículo</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Cant.</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">P. unit.</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articulos.map((a: ArticuloVenta, i: number) => {
                      const precioUnit = a.cantidad > 0 ? a.total / a.cantidad : 0;
                      return (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-800">{a.nombre}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{a.cantidad}</td>
                          <td className="px-3 py-2 text-right text-slate-700">
                            {formatPrecio(precioUnit)}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">
                            {formatPrecio(a.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-sm py-2">
                {venta.nombre || "Sin detalle de artículos (venta legacy)"}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <span className="text-base font-semibold text-slate-700">Total de la venta</span>
            <span className="text-xl font-bold text-red-600">
              {formatPrecio(venta.total)}
            </span>
          </div>

         

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="btn-secondary flex-1"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={onEditar}
              className="flex-1 rounded-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              Editar venta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ListVentasProps {
  ventas: VentaList[];
  onMutate?: () => void;
}

export default function ListVentas({ ventas, onMutate }: ListVentasProps) {
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [ventaEditando, setVentaEditando] = useState<VentaList | null>(null);
  const [ventaViendo, setVentaViendo] = useState<VentaList | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [ocultarPendiente, setOcultarPendiente] = useState(false);
  const [ocultarEntregadas, setOcultarEntregadas] = useState(false);
  const skipNextSave = useRef(true);

  useEffect(() => {
    const stored = localStorage.getItem("listVentasCheckboxes");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.ocultarPendiente !== undefined) setOcultarPendiente(parsed.ocultarPendiente);
        if (parsed.ocultarEntregadas !== undefined) setOcultarEntregadas(parsed.ocultarEntregadas);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    localStorage.setItem(
      "listVentasCheckboxes",
      JSON.stringify({ ocultarPendiente, ocultarEntregadas })
    );
  }, [ocultarPendiente, ocultarEntregadas]);

  const ventasFiltradas = ventas.filter((v) => {
    if (ocultarPendiente) {
      const entregado = (v.entregado ?? "").toLowerCase();
      if (entregado === "pendiente" || !v.entregado) return false;
    }
    if (ocultarEntregadas) {
      const ent = (v.entregado ?? "").trim();
      const esFechaEntregado = /^\d{4}-\d{2}-\d{2}$/.test(ent);
      if (esFechaEntregado) return false;
    }
    const fechaVenta = (v.fecha || "").trim();
    if (fechaDesde && fechaVenta && fechaVenta < fechaDesde) return false;
    if (fechaHasta && fechaVenta && fechaVenta > fechaHasta) return false;
    if (filtro.trim()) {
      const texto = filtro.trim();
      const matchIdVenta = contienePalabraCompleta(v.idventa, texto);
      const matchFecha = contienePalabraCompleta(v.fecha || "", texto);
      const matchCliente = contienePalabraCompleta(v.cliente || "", texto);
      const matchTotal = contienePalabraCompleta(v.total.toString(), texto);
      const matchNombre = contienePalabraCompleta(v.nombre || "", texto);
      const matchArticulos = v.articulos?.some(
        (a) =>
          contienePalabraCompleta(a.nombre || "", texto) ||
          contienePalabraCompleta(a.idarticulo || "", texto)
      );
      if (!(matchIdVenta || matchFecha || matchCliente || matchNombre || matchTotal || matchArticulos)) return false;
    }
    return true;
  }).sort((a, b) => {
    const fechaA = a.fecha || "";
    const fechaB = b.fecha || "";
    if (fechaA !== fechaB) return fechaB.localeCompare(fechaA);
    return (b.idventa || "").localeCompare(a.idventa || "");
  });

  const totalVentasFiltradas = ventasFiltradas.reduce((sum, v) => sum + (v.total ?? 0), 0);

  function descargarExcel() {
    const descripcionArticulos = (v: VentaList) =>
      v.articulos?.length
        ? v.articulos
            .map((a) =>
              a.cantidad > 0
                ? `${a.nombre} (${a.cantidad} × ${formatPrecio(a.total / a.cantidad)})`
                : a.nombre
            )
            .join(" · ")
        : v.nombre || "-";

    const rows = ventasFiltradas.map((v) => ({
      "ID Venta": v.idventa,
      Fecha: v.fecha || "",
      Cliente: v.cliente || "-",
      Artículos: descripcionArticulos(v),
      Total: v.total ?? 0,
      Entregado: /^\d{4}-\d{2}-\d{2}$/.test((v.entregado ?? "").trim())
        ? `Entregado - ${(v.entregado ?? "").trim()}`
        : (v.entregado ?? "").toLowerCase() === "pendiente" || !v.entregado
          ? "Nuevo pedido"
          : (v.entregado ?? ""),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    const nombre = `ventas_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, nombre);
  }

  function abrirCrear() {
    setVentaEditando(null);
    setMostrarForm(true);
  }

  function abrirEditar(v: VentaList) {
    setVentaEditando(v);
    setMostrarForm(true);
  }

  function cerrarForm() {
    setMostrarForm(false);
    setVentaEditando(null);
  }

  function abrirVer(v: VentaList) {
    setVentaViendo(v);
  }

  function cerrarVer() {
    setVentaViendo(null);
  }

  async function handleEliminar(idventa: string) {
    const v = ventas.find((x) => x.idventa === idventa);
    const desc = v?.articulos?.length
      ? v.articulos.map((a) => a.nombre).join(", ")
      : v?.nombre;
    if (!confirm(`¿Eliminar la venta ${idventa}${desc ? ` (${desc})` : ""}?`)) return;
    setEliminando(idventa);
    try {
      const res = await fetch(`/api/ventas/${encodeURIComponent(idventa)}`, {
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
    <div className="min-h-screen bg-red-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="btn-secondary mb-4 sm:mb-6 w-fit">
          ← Volver al inicio
        </Link>
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">
            Lista de ventas
          </h1>
          <button
            type="button"
            onClick={abrirCrear}
            className="btn-primary w-fit"
          >
            + Nueva venta
          </button>
        </div>
        {mostrarForm && (
          <FormVentas onCerrar={cerrarForm} venta={ventaEditando} onMutate={onMutate} />
        )}
        {ventaViendo && (
          <ModalVerVenta venta={ventaViendo} onCerrar={cerrarVer} onEditar={() => { cerrarVer(); abrirEditar(ventaViendo); }} />
        )}
        <div className="mb-4 flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Consulta por fecha:</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              placeholder="Desde"
            />
            <span className="text-slate-500">—</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              placeholder="Hasta"
            />
            {(fechaDesde || fechaHasta) && (
              <button
                type="button"
                onClick={() => { setFechaDesde(""); setFechaHasta(""); }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Reset fechas
              </button>
            )}
          </div>
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por id, fecha, cliente, artículos..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:max-w-xs"
          />
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
            <input
              type="checkbox"
              checked={ocultarPendiente}
              onChange={(e) => setOcultarPendiente(e.target.checked)}
              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            Ocultar Nuevo pedido
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
            <input
              type="checkbox"
              checked={ocultarEntregadas}
              onChange={(e) => setOcultarEntregadas(e.target.checked)}
              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            Ocultar entregadas
          </label>
        </div>
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-red-800">
            {ventasFiltradas.length} venta{ventasFiltradas.length !== 1 ? "s" : ""} mostrada{ventasFiltradas.length !== 1 ? "s" : ""}
            {(fechaDesde || fechaHasta || filtro.trim() || ocultarPendiente || ocultarEntregadas) && " (filtradas)"}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-bold text-red-700">
              Total: {formatPrecio(totalVentasFiltradas)}
            </span>
            <button
              type="button"
              onClick={descargarExcel}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Descargar a Excel
            </button>
          </div>
        </div>
        <div className="rounded-xl shadow-sm border border-slate-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="bg-red-100">
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">
                    ID Venta
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">
                    Fecha
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">
                    Cliente
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">
                    Artículos
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">
                    Total
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">
                    Entregado
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">
                    Act
                  </th>
                </tr>
              </thead>
              <tbody>
                {ventasFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500 bg-white"
                    >
                      {ventas.length === 0
                        ? "No hay ventas disponibles"
                        : "Ninguna venta coincide con el filtro o rango de fechas"}
                    </td>
                  </tr>
                ) : (
                  ventasFiltradas.map((v, i) => {
                    const descripcionArticulos = v.articulos?.length
                      ? v.articulos
                          .map((a) =>
                            a.cantidad > 0
                              ? `${a.nombre} (${a.cantidad} × ${formatPrecio(a.total / a.cantidad)})`
                              : a.nombre
                          )
                          .join(" · ")
                      : v.nombre || "-";
                    return (
                      <tr
                        key={v.idventa || `venta-${i}`}
                        className="border-t border-slate-100 bg-white hover:bg-red-50/50 transition-colors"
                      >
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">
                          {v.idventa}
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">
                          {v.fecha}
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">
                          {v.cliente || "-"}
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis" title={descripcionArticulos}>
                          {descripcionArticulos}
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-700 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                          {formatPrecio(v.total ?? 0)}
                        </td>
                        <td className={`px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis ${
                          /^\d{4}-\d{2}-\d{2}$/.test((v.entregado ?? "").trim())
                            ? "text-green-600"
                            : (v.entregado ?? "").toLowerCase() === "pendiente" || !v.entregado
                              ? "text-red-600"
                              : "text-amber-600"
                        }`}>
                          {/^\d{4}-\d{2}-\d{2}$/.test((v.entregado ?? "").trim())
                            ? `Entregado - ${(v.entregado ?? "").trim()}`
                            : (v.entregado ?? "").toLowerCase() === "pendiente" || !v.entregado
                              ? "Nuevo pedido"
                              : (v.entregado ?? "")}
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex flex-nowrap gap-1">
                            <button
                              type="button"
                              onClick={() => abrirVer(v)}
                              className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                            >
                              Ver
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirEditar(v)}
                              className="rounded-lg bg-green-50 px-2 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEliminar(v.idventa)}
                              disabled={eliminando === v.idventa}
                              className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              {eliminando === v.idventa ? "…" : "Eliminar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
