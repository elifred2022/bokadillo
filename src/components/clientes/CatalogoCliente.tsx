"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { Articulo } from "@/lib/types";
import { formatPrecio } from "@/lib/formato";
import { urlFotoArticulo } from "@/lib/storage/foto-url";
import {
  ID_ARTICULO_CANTIDAD_MINIMA,
  UMBRAL_CANTIDAD_123,
} from "@/lib/catalogo-cliente";

export default function CatalogoCliente() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});

  const fechaHoy = () =>
    new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    });

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    fetch("/api/articulos/catalogo-cliente", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar productos");
        return res.json();
      })
      .then((data) => {
        if (cancelado) return;
        const arts: Articulo[] = data.articulos ?? [];
        setArticulos(arts);
        setCantidades(
          Object.fromEntries(arts.map((a) => [a.idarticulo, 0]))
        );
      })
      .catch((err) => {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "Error de conexión");
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const lineas = useMemo(() => {
    return articulos
      .map((a) => {
        const cant = cantidades[a.idarticulo] ?? 0;
        return {
          idarticulo: a.idarticulo,
          nombre: a.nombre,
          cantidad: cant,
          total: cant * a.precio,
        };
      })
      .filter((l) => {
        if (l.cantidad <= 0) return false;
        if (
          l.idarticulo === ID_ARTICULO_CANTIDAD_MINIMA &&
          l.cantidad < UMBRAL_CANTIDAD_123
        ) {
          return false;
        }
        return true;
      });
  }, [articulos, cantidades]);

  const totalVenta = lineas.reduce((sum, l) => sum + l.total, 0);

  function actualizarCantidad(idarticulo: string, valor: number) {
    const num = Math.max(0, Math.floor(valor));
    setCantidades((prev) => ({ ...prev, [idarticulo]: num }));
    setError("");
    setOk("");
  }

  function abrirConfirmacion() {
    setError("");
    setOk("");
    if (lineas.length === 0) {
      setError("Elegí al menos un producto para armar el pedido");
      return;
    }
    if (!usuario?.nombre?.trim()) {
      setError("No se pudo identificar al usuario");
      return;
    }
    setMostrarConfirmacion(true);
  }

  function cerrarConfirmacion() {
    if (enviando) return;
    setMostrarConfirmacion(false);
  }

  async function handleConfirmar() {
    if (!usuario?.nombre?.trim()) {
      setError("No se pudo identificar al usuario");
      setMostrarConfirmacion(false);
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: fechaHoy(),
          cliente: usuario.nombre.trim(),
          idcliente: usuario.idcliente ?? "",
          articulos: lineas,
          total: totalVenta,
          pedidoFabricacion: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear el pedido");
      }
      setCantidades(
        Object.fromEntries(articulos.map((a) => [a.idarticulo, 0]))
      );
      setMostrarConfirmacion(false);
      setOk("Pedido enviado. Podés verlo en Mis pedidos.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      setMostrarConfirmacion(false);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-red-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">
              Productos
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {usuario?.nombre
                ? `Hola, ${usuario.nombre}. Elegí cantidades y confirmá tu pedido.`
                : "Elegí cantidades y confirmá tu pedido"}
            </p>
          </div>
          <Link href="/mis-pedidos" className="btn-secondary w-fit">
            Ver mis pedidos
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}
        {ok && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800 border border-green-200 flex flex-wrap items-center justify-between gap-2">
            <span>{ok}</span>
            <button
              type="button"
              onClick={() => router.push("/mis-pedidos")}
              className="font-medium underline"
            >
              Ir a mis pedidos
            </button>
          </div>
        )}

        {cargando ? (
          <p className="py-16 text-center text-slate-500">Cargando productos…</p>
        ) : articulos.length === 0 ? (
          <p className="py-16 text-center text-slate-500">
            No hay productos disponibles
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articulos.map((art) => {
              const fotoUrl = urlFotoArticulo(art.img_path);
              const cant = cantidades[art.idarticulo] ?? 0;
              const esMinimo = art.idarticulo === ID_ARTICULO_CANTIDAD_MINIMA;
              const faltaMinimo = esMinimo && cant > 0 && cant < UMBRAL_CANTIDAD_123;
              return (
                <article
                  key={art.idarticulo}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex h-44 items-center justify-center bg-slate-50">
                    {fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={fotoUrl}
                        alt={art.nombre}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-12 w-12 text-slate-300"
                        aria-hidden
                      >
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <circle cx="8.5" cy="10" r="1.5" />
                        <path d="M21 16.5 16 12l-4.5 4.5L9 14l-6 5" />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div>
                      <h2 className="font-semibold text-slate-800">{art.nombre}</h2>
                      {art.descripcion ? (
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                          {art.descripcion}
                        </p>
                      ) : null}
                      <p className="mt-2 text-lg font-bold text-red-700">
                        {formatPrecio(art.precio)}
                      </p>
                    </div>
                    {esMinimo && (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                        Pedido mínimo: {UMBRAL_CANTIDAD_123} unidades
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-lg border border-slate-300">
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(art.idarticulo, cant - 1)}
                          className="px-3 py-1.5 text-lg text-slate-700 hover:bg-slate-50"
                          aria-label="Menos"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={cant === 0 ? "" : cant}
                          onChange={(e) =>
                            actualizarCantidad(
                              art.idarticulo,
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="w-14 border-x border-slate-300 py-1.5 text-center text-sm text-slate-800 focus:outline-none"
                          placeholder="0"
                        />
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(art.idarticulo, cant + 1)}
                          className="px-3 py-1.5 text-lg text-slate-700 hover:bg-slate-50"
                          aria-label="Más"
                        >
                          +
                        </button>
                      </div>
                      {cant > 0 && (
                        <span className="text-sm font-medium text-slate-700">
                          {formatPrecio(cant * art.precio)}
                        </span>
                      )}
                    </div>
                    {faltaMinimo && (
                      <p className="text-xs text-amber-700">
                        No se incluirá hasta llegar a {UMBRAL_CANTIDAD_123}.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="sticky bottom-4 mt-6 rounded-xl border border-red-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-600">
                {lineas.length === 0
                  ? "Todavía no hay productos en el pedido"
                  : `${lineas.length} producto${lineas.length === 1 ? "" : "s"}`}
              </p>
              <p className="text-xl font-bold text-red-700">
                Total: {formatPrecio(totalVenta)}
              </p>
            </div>
            <button
              type="button"
              onClick={abrirConfirmacion}
              disabled={enviando || lineas.length === 0}
              className="btn-primary w-full sm:w-auto disabled:opacity-60"
            >
              Confirmar pedido
            </button>
          </div>
        </div>
      </div>

      {mostrarConfirmacion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          onClick={cerrarConfirmacion}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-confirmar-pedido"
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-xl my-8 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-red-600 px-4 py-3 flex items-center justify-between">
              <h2
                id="titulo-confirmar-pedido"
                className="text-lg font-semibold text-white"
              >
                ¿Confirmás el pedido?
              </h2>
              <button
                type="button"
                onClick={cerrarConfirmacion}
                disabled={enviando}
                className="text-white/90 hover:text-white p-1 rounded disabled:opacity-50"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-600">
                Revisá el detalle antes de enviar. Podés cancelar si hay algo
                para corregir.
              </p>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  Artículos
                </h3>
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
                      {lineas.map((l) => (
                        <tr
                          key={l.idarticulo}
                          className="border-t border-slate-100"
                        >
                          <td className="px-3 py-2 text-slate-800">{l.nombre}</td>
                          <td className="px-3 py-2 text-right text-slate-700">
                            {l.cantidad}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">
                            {formatPrecio(l.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="text-base font-semibold text-slate-700">
                  Total
                </span>
                <span className="text-xl font-bold text-red-600">
                  {formatPrecio(totalVenta)}
                </span>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarConfirmacion}
                  disabled={enviando}
                  className="btn-secondary w-full sm:w-auto disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmar}
                  disabled={enviando}
                  className="btn-primary w-full sm:w-auto disabled:opacity-60"
                >
                  {enviando ? "Enviando…" : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
