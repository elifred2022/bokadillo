"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import type { VentaList, CompraList, ArticuloVenta } from "@/lib/google-sheets";
import { formatPrecio } from "@/lib/formato";

interface ListaIndicadoresProps {
  ventas: VentaList[];
  compras: CompraList[];
  onMutate?: () => void;
}

function enRango(fecha: string, desde: string, hasta: string): boolean {
  if (!desde && !hasta) return true;
  if (desde && fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
}

export default function ListaIndicadores({
  ventas,
  compras,
}: ListaIndicadoresProps) {
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const hayConsultaFecha = Boolean(fechaDesde.trim() || fechaHasta.trim());

  const ventasFiltradas = useMemo(() => {
    if (!hayConsultaFecha) return [];
    return ventas.filter((v) => enRango(v.fecha ?? "", fechaDesde, fechaHasta));
  }, [ventas, fechaDesde, fechaHasta, hayConsultaFecha]);

  const comprasFiltradas = useMemo(() => {
    if (!hayConsultaFecha) return [];
    return compras.filter((c) => enRango(c.fecha ?? "", fechaDesde, fechaHasta));
  }, [compras, fechaDesde, fechaHasta, hayConsultaFecha]);

  const totalVentas = ventasFiltradas.reduce((sum, v) => sum + (v.total ?? 0), 0);
  const totalCompras = comprasFiltradas.reduce((sum, c) => sum + (c.total ?? 0), 0);
  const diferencia = totalVentas - totalCompras;

  function descargarExcel() {
    if (!hayConsultaFecha) {
      alert("Seleccione al menos una fecha (desde o hasta) para exportar los indicadores.");
      return;
    }
    const descripcionArticulosVenta = (v: VentaList) =>
      v.articulos?.length
        ? v.articulos
            .map((a: ArticuloVenta) =>
              a.cantidad > 0
                ? `${a.nombre} (${a.cantidad} × ${formatPrecio(a.total / a.cantidad)})`
                : a.nombre
            )
            .join(" · ")
        : v.nombre || "-";

    const descripcionArticulosCompra = (c: CompraList) =>
      c.articulos?.length
        ? c.articulos
            .map((a) =>
              a.cantidad > 0
                ? `${a.nombre} (${a.cantidad} × ${formatPrecio(a.total / a.cantidad)})`
                : a.nombre
            )
            .join(" · ")
        : c.articulo || "-";

    const wb = XLSX.utils.book_new();

    const wsResumen = XLSX.utils.json_to_sheet([
      { Concepto: "Fecha desde", Valor: fechaDesde || "Todo" },
      { Concepto: "Fecha hasta", Valor: fechaHasta || "Todo" },
      { Concepto: "Total ventas", Valor: totalVentas },
      { Concepto: "Total compras", Valor: totalCompras },
      { Concepto: "Diferencia", Valor: diferencia },
      { Concepto: "Cant. ventas", Valor: ventasFiltradas.length },
      { Concepto: "Cant. compras", Valor: comprasFiltradas.length },
    ]);
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    const rowsVentas = ventasFiltradas.map((v) => ({
      "ID Venta": v.idventa,
      Fecha: v.fecha || "",
      Cliente: v.cliente || "-",
      Artículos: descripcionArticulosVenta(v),
      Total: v.total ?? 0,
    }));
    const wsVentas = XLSX.utils.json_to_sheet(rowsVentas);
    XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas");

    const rowsCompras = comprasFiltradas.map((c) => ({
      "ID Compra": c.idcompra,
      Fecha: c.fecha || "",
      Proveedor: c.proveedor || "-",
      Factura: c.factura || "-",
      Artículos: descripcionArticulosCompra(c),
      Total: c.total ?? 0,
    }));
    const wsCompras = XLSX.utils.json_to_sheet(rowsCompras);
    XLSX.utils.book_append_sheet(wb, wsCompras, "Compras");

    const hoy = new Date().toISOString().slice(0, 10);
    const sufijo =
      fechaDesde || fechaHasta
        ? "_" + (fechaDesde || "inicio") + "_" + (fechaHasta || "fin")
        : "_" + hoy;
    XLSX.writeFile(wb, "indicadores" + sufijo + ".xlsx");
  }

  return (
    <div className="min-h-screen bg-red-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">Indicadores</h1>
          <Link href="/" className="btn-secondary">
            Volver al inicio
          </Link>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-500">
              Consulta por fecha
            </h2>
            <p className="mb-3 text-xs text-slate-600">
              Elija una fecha desde, hasta o ambas para ver el resumen y exportar.
            </p>
            <div className="mb-4 flex flex-wrap gap-3 items-end">
              <div>
                <label htmlFor="fechaDesde" className="mb-1 block text-xs font-medium text-slate-600">
                  Desde
                </label>
                <input
                  id="fechaDesde"
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label htmlFor="fechaHasta" className="mb-1 block text-xs font-medium text-slate-600">
                  Hasta
                </label>
                <input
                  id="fechaHasta"
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              {hayConsultaFecha && (
                <button
                  type="button"
                  onClick={() => {
                    setFechaDesde("");
                    setFechaHasta("");
                  }}
                  className="h-12 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Reset consulta
                </button>
              )}
              <button
                type="button"
                onClick={descargarExcel}
                disabled={!hayConsultaFecha}
                className="flex h-12 items-center gap-2 rounded-full px-5 font-medium text-white transition-colors bg-[#217346] hover:bg-[#185c37] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#217346]"
              >
                <span>Descargar Excel</span>
                <span aria-hidden>📥</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-500">
              Resumen comparativo
            </h2>
            {!hayConsultaFecha ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-600">
                  Sin consulta por fecha
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Indique al menos una fecha arriba para mostrar ventas, compras y la diferencia en este período.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                    <p className="mb-1 text-sm font-medium text-green-800">
                      Total ventas
                    </p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatPrecio(totalVentas)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ventasFiltradas.length} venta(s)
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <p className="mb-1 text-sm font-medium text-amber-800">
                      Total compras
                    </p>
                    <p className="text-2xl font-bold text-amber-700">
                      {formatPrecio(totalCompras)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {comprasFiltradas.length} compra(s)
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <p className="mb-1 text-sm font-medium text-slate-700">
                    Diferencia (ventas − compras)
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      diferencia >= 0 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {formatPrecio(diferencia)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {diferencia >= 0
                      ? "Margen positivo"
                      : "Compras superan a ventas"}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Link
              href="/listaventas"
              className="btn-primary flex-1 text-center"
            >
              Ver ventas
            </Link>
            <Link
              href="/listacompras"
              className="btn-secondary flex-1 text-center"
            >
              Ver compras
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
