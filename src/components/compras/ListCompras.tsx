"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import type { CompraList, ArticuloCompra, Proveedor } from "@/lib/google-sheets";
import { formatPrecio } from "@/lib/formato";
import { contienePalabraCompleta } from "@/lib/filtro";
import FormCompras from "./FormCompras";

interface ModalVerCompraProps {
  compra: CompraList;
  onCerrar: () => void;
  onEditar: () => void;
}

function ModalVerCompra({ compra, onCerrar, onEditar }: ModalVerCompraProps) {
  const articulos = compra.articulos ?? [];
  const tieneArticulos = articulos.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl my-8 overflow-hidden">
        <div className="bg-red-600 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Detalle de compra #{compra.idcompra}
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
              <span className="font-medium text-slate-800">{compra.fecha || "-"}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Proveedor</span>
              <span className="font-medium text-slate-800">{compra.proveedor || "-"}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Factura</span>
              <span className="font-medium text-slate-800">{compra.factura || "-"}</span>
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
                    {articulos.map((a: ArticuloCompra, i: number) => {
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
                {compra.articulo || "Sin detalle de artículos (compra legacy)"}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <span className="text-base font-semibold text-slate-700">Total de la compra</span>
            <span className="text-xl font-bold text-red-600">
              {formatPrecio(compra.total)}
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="btn-secondary flex-1">
              Cerrar
            </button>
            <button type="button" onClick={onEditar} className="flex-1 rounded-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors">
              Editar compra
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ListComprasProps {
  compras: CompraList[];
  proveedores: Proveedor[];
  onMutate?: () => void;
}

export default function ListCompras({
  compras,
  proveedores,
  onMutate,
}: ListComprasProps) {
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [compraEditando, setCompraEditando] = useState<CompraList | null>(null);
  const [compraViendo, setCompraViendo] = useState<CompraList | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [ocultarSinFactura, setOcultarSinFactura] = useState(false);
  const [ocultarConFactura, setOcultarConFactura] = useState(false);
  const skipNextSave = useRef(true);

  useEffect(() => {
    const stored = localStorage.getItem("listComprasCheckboxes");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.ocultarSinFactura !== undefined) setOcultarSinFactura(parsed.ocultarSinFactura);
        if (parsed.ocultarConFactura !== undefined) setOcultarConFactura(parsed.ocultarConFactura);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    localStorage.setItem(
      "listComprasCheckboxes",
      JSON.stringify({ ocultarSinFactura, ocultarConFactura })
    );
  }, [ocultarSinFactura, ocultarConFactura]);

  const comprasFiltradas = compras.filter((c) => {
    if (ocultarSinFactura) {
      if (!c.factura?.trim()) return false;
    }
    if (ocultarConFactura) {
      if (c.factura?.trim()) return false;
    }
    const fechaCompra = (c.fecha || "").trim();
    if (fechaDesde && fechaCompra && fechaCompra < fechaDesde) return false;
    if (fechaHasta && fechaCompra && fechaCompra > fechaHasta) return false;
    if (filtro.trim()) {
      const texto = filtro.trim();
      const matchId = contienePalabraCompleta(c.idcompra, texto);
      const matchFecha = contienePalabraCompleta(c.fecha || "", texto);
      const matchProveedor = contienePalabraCompleta(c.proveedor || "", texto);
      const matchFactura = contienePalabraCompleta(c.factura || "", texto);
      const matchTotal = contienePalabraCompleta(c.total.toString(), texto);
      const matchArticulo = contienePalabraCompleta(c.articulo || "", texto);
      const matchArticulos = c.articulos?.some(
        (a) =>
          contienePalabraCompleta(a.nombre || "", texto) ||
          contienePalabraCompleta(a.idarticulo || "", texto)
      );
      if (!(matchId || matchFecha || matchProveedor || matchFactura || matchArticulo || matchTotal || matchArticulos)) return false;
    }
    return true;
  });

  const totalComprasFiltradas = comprasFiltradas.reduce((sum, c) => sum + (c.total ?? 0), 0);

  function descargarExcel() {
    const descripcionArticulos = (c: CompraList) =>
      c.articulos?.length
        ? c.articulos
            .map((a) =>
              a.cantidad > 0
                ? `${a.nombre} (${a.cantidad} × ${formatPrecio(a.total / a.cantidad)})`
                : a.nombre
            )
            .join(" · ")
        : c.articulo || "-";

    const rows = comprasFiltradas.map((c) => ({
      "ID Compra": c.idcompra,
      Fecha: c.fecha || "",
      Proveedor: c.proveedor || "-",
      Factura: c.factura || "-",
      Artículos: descripcionArticulos(c),
      Total: c.total ?? 0,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compras");
    const nombre = `compras_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, nombre);
  }

  function abrirCrear() {
    setCompraEditando(null);
    setMostrarForm(true);
  }

  function abrirEditar(c: CompraList) {
    setCompraEditando(c);
    setMostrarForm(true);
  }

  function cerrarForm() {
    setMostrarForm(false);
    setCompraEditando(null);
  }

  function abrirVer(c: CompraList) {
    setCompraViendo(c);
  }

  function cerrarVer() {
    setCompraViendo(null);
  }

  async function handleEliminar(idcompra: string) {
    const compra = compras.find((c) => c.idcompra === idcompra);
    const desc = compra?.articulos?.length
      ? compra.articulos.map((a) => a.nombre).join(", ")
      : compra?.articulo;
    if (!confirm(`¿Eliminar la compra ${idcompra}${desc ? ` (${desc})` : ""}?`))
      return;
    setEliminando(idcompra);
    try {
      const res = await fetch(
        `/api/compras/${encodeURIComponent(idcompra)}`,
        { method: "DELETE" }
      );
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
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="btn-secondary mb-4 sm:mb-6 w-fit">
          ← Volver al inicio
        </Link>
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">
            Lista de compras
          </h1>
          <button
            type="button"
            onClick={abrirCrear}
            className="btn-primary w-fit"
          >
            + Nueva compra
          </button>
        </div>
        {mostrarForm && (
          <FormCompras
            onCerrar={cerrarForm}
            compra={compraEditando}
            proveedores={proveedores}
            onMutate={onMutate}
          />
        )}
        {compraViendo && (
          <ModalVerCompra
            compra={compraViendo}
            onCerrar={cerrarVer}
            onEditar={() => {
              cerrarVer();
              abrirEditar(compraViendo);
            }}
          />
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
            placeholder="Filtrar por id, fecha, proveedor, factura, artículos..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:max-w-xs"
          />
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
            <input
              type="checkbox"
              checked={ocultarSinFactura}
              onChange={(e) => setOcultarSinFactura(e.target.checked)}
              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            Ocultar sin factura
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
            <input
              type="checkbox"
              checked={ocultarConFactura}
              onChange={(e) => setOcultarConFactura(e.target.checked)}
              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            Ocultar con factura
          </label>
        </div>
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-red-800">
            {comprasFiltradas.length} compra{comprasFiltradas.length !== 1 ? "s" : ""} mostrada{comprasFiltradas.length !== 1 ? "s" : ""}
            {(fechaDesde || fechaHasta || filtro.trim() || ocultarSinFactura || ocultarConFactura) && " (filtradas)"}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-bold text-red-700">
              Total: {formatPrecio(totalComprasFiltradas)}
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
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="bg-red-100">
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">ID Compra</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">Fecha</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">Proveedor</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">Factura</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">Artículos</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">Total</th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">Act</th>
                </tr>
              </thead>
              <tbody>
                {comprasFiltradas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="bg-white px-4 py-12 text-center text-slate-500"
                    >
                      {compras.length === 0
                        ? "No hay compras disponibles"
                        : "Ninguna compra coincide con el filtro o rango de fechas"}
                    </td>
                  </tr>
                ) : (
                  comprasFiltradas.map((c, i) => {
                    const descripcionArticulos = c.articulos?.length
                      ? c.articulos
                          .map((a) =>
                            a.cantidad > 0
                              ? `${a.nombre} (${a.cantidad} × ${formatPrecio(a.total / a.cantidad)})`
                              : a.nombre
                          )
                          .join(" · ")
                      : c.articulo || "-";
                    return (
                      <tr
                        key={c.idcompra || `compra-${i}`}
                        className="border-t border-slate-100 bg-white transition-colors hover:bg-red-50/50"
                      >
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{c.idcompra}</td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{c.fecha}</td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{c.proveedor}</td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{c.factura || "-"}</td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis" title={descripcionArticulos}>{descripcionArticulos}</td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-700 font-medium whitespace-nowrap overflow-hidden text-ellipsis">{formatPrecio(c.total)}</td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex flex-nowrap gap-1">
                            <button
                              type="button"
                              onClick={() => abrirVer(c)}
                              className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                            >
                              Ver
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirEditar(c)}
                              className="rounded-lg bg-green-50 px-2 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEliminar(c.idcompra)}
                              disabled={eliminando === c.idcompra}
                              className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                            >
                              {eliminando === c.idcompra ? "…" : "Eliminar"}
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
