"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { ArticuloVenta } from "@/lib/google-sheets";
import { formatPrecio } from "@/lib/formato";

const ID_ARTICULO_123 = "123";
const ID_ARTICULO_126 = "126";
const UMBRAL_TOTAL = 15;

interface ArticuloDisponible {
  idarticulo: string;
  nombre: string;
  precio: number;
}

interface FormPedidoUsuarioProps {
  onCerrar: () => void;
  onMutate?: () => void;
}

export default function FormPedidoUsuario({
  onCerrar,
  onMutate,
}: FormPedidoUsuarioProps) {
  const router = useRouter();
  const { usuario } = useAuth();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [articulos, setArticulos] = useState<ArticuloDisponible[]>([]);
  const [cargandoArticulos, setCargandoArticulos] = useState(true);
  const [cantidades, setCantidades] = useState<Record<string, number>>({
    [ID_ARTICULO_123]: 0,
    [ID_ARTICULO_126]: 0,
  });

  const fechaHoy = () =>
    new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    });

  const lineasCompletas = useMemo(() => {
    return articulos
      .filter((a) => (cantidades[a.idarticulo] ?? 0) > 0)
      .map((a) => {
        const cant = cantidades[a.idarticulo] ?? 0;
        return {
          idarticulo: a.idarticulo,
          nombre: a.nombre,
          cantidad: cant,
          total: cant * a.precio,
        };
      });
  }, [articulos, cantidades]);

  const cantidad123 = cantidades[ID_ARTICULO_123] ?? 0;
  const puedeIncluir123 = cantidad123 >= UMBRAL_TOTAL;

  const lineas = useMemo(() => {
    return lineasCompletas.filter(
      (l) => l.idarticulo !== ID_ARTICULO_123 || puedeIncluir123
    );
  }, [lineasCompletas, puedeIncluir123]);

  const totalVenta = lineas.reduce((sum, l) => sum + l.total, 0);

  useEffect(() => {
    const cargarArticulos = async () => {
      setCargandoArticulos(true);
      setError("");
      try {
        const [res123, res126] = await Promise.all([
          fetch(`/api/articulos/buscar?id=${encodeURIComponent(ID_ARTICULO_123)}`),
          fetch(`/api/articulos/buscar?id=${encodeURIComponent(ID_ARTICULO_126)}`),
        ]);
        const data123 = await res123.json();
        const data126 = await res126.json();
        const arts: ArticuloDisponible[] = [];
        const a123 = data123.articulo;
        const a126 = data126.articulo;
        if (a126) {
          arts.push({
            idarticulo: a126.idarticulo ?? a126.id ?? ID_ARTICULO_126,
            nombre: a126.nombre ?? `Artículo ${ID_ARTICULO_126}`,
            precio: a126.precio ?? 0,
          });
        }
        if (a123) {
          arts.push({
            idarticulo: a123.idarticulo ?? a123.id ?? ID_ARTICULO_123,
            nombre: a123.nombre ?? `Artículo ${ID_ARTICULO_123}`,
            precio: a123.precio ?? 0,
          });
        }
        setArticulos(arts);
      } catch {
        setError("Error al cargar los artículos");
      } finally {
        setCargandoArticulos(false);
      }
    };
    cargarArticulos();
  }, []);

  const actualizarCantidad = (idarticulo: string, valor: number) => {
    const num = Math.max(0, Math.floor(valor));
    setCantidades((prev) => ({ ...prev, [idarticulo]: num }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (lineas.length === 0) {
      setError("Debe agregar al menos un artículo al pedido");
      return;
    }
    if (!usuario?.nombre?.trim()) {
      setError("No se pudo identificar al usuario");
      return;
    }

    const articulos: ArticuloVenta[] = lineas.map(
      ({ idarticulo, nombre, cantidad, total }) => ({
        idarticulo,
        nombre,
        cantidad,
        total,
      })
    );

    setEnviando(true);

    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: fechaHoy(),
          cliente: usuario.nombre.trim(),
          idcliente: usuario.idcliente ?? "",
          articulos,
          total: totalVenta,
          pedidoFabricacion: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al crear el pedido");
      }

      onCerrar();
      onMutate?.() ?? router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl my-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Nuevo pedido</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-500 hover:text-slate-700"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <strong>Cliente:</strong> {usuario?.nombre ?? "—"}
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            El artículo 123 solo se habilita si la cantidad es ≥ {UMBRAL_TOTAL}. Si es menor, no se incluirá en el pedido.
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Indique la cantidad de cada artículo
            </label>
            {cargandoArticulos ? (
              <p className="text-slate-500 text-sm py-4">Cargando artículos…</p>
            ) : articulos.length === 0 ? (
              <p className="text-amber-600 text-sm py-4">
                No se encontraron los artículos 123 y 126
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {articulos.map((art) => {
                  const cant = cantidades[art.idarticulo] ?? 0;
                  const es123 = art.idarticulo === ID_ARTICULO_123;
                  const habilitado = !es123 || cant >= UMBRAL_TOTAL;
                  return (
                    <div
                      key={art.idarticulo}
                      className={`rounded-lg border-2 px-4 py-3 ${
                        habilitado
                          ? "border-slate-200 bg-white"
                          : "border-slate-200 bg-slate-100 opacity-75"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <span className="font-medium text-slate-800 block">
                            {art.nombre}
                          </span>
                          <span className="text-sm text-slate-600">
                            Precio: {formatPrecio(art.precio)}
                            {es123 && !habilitado && cant > 0 && (
                              <span className="text-amber-600 ml-1">
                                · Mínimo {UMBRAL_TOTAL} unidades
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
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
                            className={`w-20 rounded-lg border px-2 py-1.5 text-sm text-right ${
                              habilitado
                                ? "border-slate-300"
                                : "border-slate-200 bg-slate-100"
                            }`}
                          />
                          {cant > 0 && (
                            <span className="text-sm text-slate-600">
                              = {formatPrecio(cant * art.precio)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {lineas.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 text-left font-medium text-slate-700">
                      Artículo
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">
                      Cant
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-700">
                      Total
                    </th>
                    <th className="w-8 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((l) => (
                    <tr key={l.idarticulo} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-800">{l.nombre}</td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {l.cantidad}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatPrecio(l.total)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(l.idarticulo, 0)}
                          className="text-slate-400 hover:text-red-600 text-sm font-medium w-6 h-6 flex items-center justify-center rounded hover:bg-red-50"
                          aria-label="Quitar"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lineas.length > 0 && (
            <div className="rounded-lg bg-slate-100 px-4 py-3 flex justify-between items-center">
              <span className="font-medium text-slate-700">Total del pedido</span>
              <span className="text-lg font-bold text-slate-900">
                {formatPrecio(totalVenta)}
              </span>
            </div>
          )}

          <div className="mt-2 flex gap-2">
            <button type="button" onClick={onCerrar} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || lineas.length === 0}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {enviando ? "Enviando…" : "Confirmar pedido"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
