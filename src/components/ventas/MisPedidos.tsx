"use client";

import { useState } from "react";
import type { VentaList, ArticuloVenta } from "@/lib/google-sheets";
import { formatPrecio } from "@/lib/formato";
import FormPedidoUsuario from "./FormPedidoUsuario";

interface ModalVerPedidoProps {
  venta: VentaList;
  onCerrar: () => void;
}

function ModalVerPedido({ venta, onCerrar }: ModalVerPedidoProps) {
  const articulos = venta.articulos ?? [];
  const tieneArticulos = articulos.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl my-8 overflow-hidden">
        <div className="bg-red-600 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Detalle del pedido #{venta.idventa}
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
              <span className="text-slate-500 block">Estado</span>
              <span
                className={`font-medium ${
                  (venta.entregado || "").toLowerCase() === "pendiente" || !venta.entregado
                    ? "text-red-600"
                    : (venta.entregado || "").toLowerCase() === "en preparacion" || (venta.entregado || "").toLowerCase() === "en reparto"
                      ? "text-orange-600"
                      : "text-green-600"
                }`}
              >
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
                      <th className="px-3 py-2 text-left font-medium text-slate-600">
                        Artículo
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">
                        Cant.
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {articulos.map((a: ArticuloVenta, i: number) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-800">{a.nombre}</td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {a.cantidad}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">
                          {formatPrecio(a.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-sm py-2">
                {venta.nombre || "Sin detalle de artículos"}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <span className="text-base font-semibold text-slate-700">Total</span>
            <span className="text-xl font-bold text-red-600">
              {formatPrecio(venta.total)}
            </span>
          </div>

          <button type="button" onClick={onCerrar} className="btn-primary w-full">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

interface MisPedidosProps {
  ventas: VentaList[];
  onMutate?: () => void;
}

export default function MisPedidos({ ventas, onMutate }: MisPedidosProps) {
  const [ventaViendo, setVentaViendo] = useState<VentaList | null>(null);
  const [mostrarFormPedido, setMostrarFormPedido] = useState(false);

  const ventasOrdenadas = [...ventas].sort((a, b) => {
    const fechaA = a.fecha || "";
    const fechaB = b.fecha || "";
    if (fechaA !== fechaB) return fechaB.localeCompare(fechaA);
    return (b.idventa || "").localeCompare(a.idventa || "");
  });

  const totalPedidos = ventasOrdenadas.reduce((sum, v) => sum + (v.total ?? 0), 0);

  return (
    <div className="min-h-screen bg-red-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">
            Mis pedidos
          </h1>
          <button
            type="button"
            onClick={() => setMostrarFormPedido(true)}
            className="btn-primary w-fit"
          >
            + Nuevo pedido
          </button>
        </div>

        {mostrarFormPedido && (
          <FormPedidoUsuario
            onCerrar={() => setMostrarFormPedido(false)}
            onMutate={onMutate}
          />
        )}

        {ventaViendo && (
          <ModalVerPedido
            venta={ventaViendo}
            onCerrar={() => setVentaViendo(null)}
          />
        )}

        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-red-800">
            {ventasOrdenadas.length} pedido{ventasOrdenadas.length !== 1 ? "s" : ""}
          </span>
          <span className="text-lg font-bold text-red-700">
            Total: {formatPrecio(totalPedidos)}
          </span>
        </div>

        <div className="rounded-xl shadow-sm border border-slate-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="bg-red-100">
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">
                    ID Pedido
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">
                    Fecha
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">
                    Artículos
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">
                    Total
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">
                    Estado
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-left text-xs sm:text-sm font-semibold text-red-800 whitespace-nowrap">
                    Ver
                  </th>
                </tr>
              </thead>
              <tbody>
                {ventasOrdenadas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-slate-500 bg-white"
                    >
                      No tienes pedidos registrados
                    </td>
                  </tr>
                ) : (
                  ventasOrdenadas.map((v, i) => {
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
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap">
                          {v.idventa}
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap">
                          {v.fecha}
                        </td>
                        <td
                          className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]"
                          title={descripcionArticulos}
                        >
                          {descripcionArticulos}
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm text-slate-700 font-medium whitespace-nowrap">
                          {formatPrecio(v.total ?? 0)}
                        </td>
                        <td
                          className={`px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap ${
                            (v.entregado ?? "").toLowerCase() === "pendiente" || !v.entregado
                              ? "text-red-600"
                              : (v.entregado ?? "").toLowerCase() === "en preparacion" || (v.entregado ?? "").toLowerCase() === "en reparto"
                                ? "text-orange-600"
                                : "text-green-600"
                          }`}
                        >
                          {/^\d{4}-\d{2}-\d{2}$/.test((v.entregado ?? "").trim())
                            ? `Entregado - ${(v.entregado ?? "").trim()}`
                            : (v.entregado ?? "").toLowerCase() === "pendiente" || !v.entregado
                              ? "Nuevo pedido"
                              : (v.entregado ?? "")}
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setVentaViendo(v)}
                            className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                          >
                            Ver detalle
                          </button>
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
