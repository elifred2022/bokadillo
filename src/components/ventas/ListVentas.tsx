"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import type { VentaList } from "@/lib/types";
import { formatPrecio } from "@/lib/formato";
import { contienePalabraCompleta } from "@/lib/filtro";
import FormVentas from "./FormVentas";
import { generarBoletaVentaJpeg } from "./boletaVentaImagen";
import { VentaDetalleVentaCard } from "./VentaDetalleVentaCard";

const actIconClass = "h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4";

function IconoVer() {
  return (
    <svg className={actIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconoEditar() {
  return (
    <svg className={actIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function IconoWhatsApp() {
  return (
    <svg className={actIconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function IconoEliminar() {
  return (
    <svg className={actIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.066-2.091 1.114-2.091 2.293v5.723m7.5 0c.083.655.17 1.31.282 1.96" />
    </svg>
  );
}

function IconoCargando() {
  return (
    <svg className={`${actIconClass} animate-spin`} fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

interface ModalVerVentaProps {
  venta: VentaList;
  onCerrar: () => void;
  onEditar: () => void;
  onWhatsapp: (v: VentaList) => void;
  whatsappBusy: string | null;
  onDescargarJpg: (v: VentaList) => void;
  descargaJpgBusy: string | null;
}

function ModalVerVenta({
  venta,
  onCerrar,
  onEditar,
  onWhatsapp,
  whatsappBusy,
  onDescargarJpg,
  descargaJpgBusy,
}: ModalVerVentaProps) {
  const waLoading = whatsappBusy === venta.idventa;
  const jpgLoading = descargaJpgBusy === venta.idventa;
  const comprobanteGenerando = waLoading || jpgLoading;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg my-8">
        <VentaDetalleVentaCard
          venta={venta}
          headerActions={
            <button
              type="button"
              onClick={onCerrar}
              className="text-stone-500 hover:text-stone-800 hover:bg-stone-100 p-2 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              ✕
            </button>
          }
          footer={
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onDescargarJpg(venta)}
                disabled={comprobanteGenerando}
                className="w-full rounded-full px-4 py-2.5 text-sm font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                title="Descargar el comprobante como imagen JPG"
              >
                {jpgLoading ? "Generando JPG…" : "Descargar comprobante (JPG)"}
              </button>
              <button
                type="button"
                onClick={() => onWhatsapp(venta)}
                disabled={comprobanteGenerando}
                className="w-full rounded-full px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                title="Generar boleta en JPG y compartir por WhatsApp"
              >
                {waLoading ? "Generando boleta…" : "Enviar por WhatsApp"}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={onCerrar} className="btn-secondary flex-1">
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
          }
        />
      </div>
    </div>
  );
}

function getDescripcionArticulos(v: VentaList) {
  return v.articulos?.length
    ? v.articulos
        .map((a) =>
          a.cantidad > 0
            ? `${a.nombre} (${a.cantidad} × ${formatPrecio(a.total / a.cantidad)})`
            : a.nombre
        )
        .join(" · ")
    : v.nombre || "-";
}

function getEstadoEntregado(v: VentaList) {
  const ent = (v.entregado ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(ent)) {
    return {
      label: `Entregado - ${ent}`,
      textClass: "text-green-600",
      badgeClass: "bg-green-50 text-green-700",
    };
  }
  if ((v.entregado ?? "").toLowerCase() === "pendiente" || !v.entregado) {
    return {
      label: "Nuevo pedido",
      textClass: "text-red-600",
      badgeClass: "bg-red-50 text-red-700",
    };
  }
  return {
    label: v.entregado ?? "",
    textClass: "text-amber-600",
    badgeClass: "bg-amber-50 text-amber-700",
  };
}

interface VentaAccionesProps {
  venta: VentaList;
  onVer: (v: VentaList) => void;
  onEditar: (v: VentaList) => void;
  onWhatsapp: (v: VentaList) => void;
  onEliminar: (id: string) => void;
  whatsappBusy: string | null;
  descargaJpgBusy: string | null;
  eliminando: string | null;
  compact?: boolean;
}

function VentaAcciones({
  venta,
  onVer,
  onEditar,
  onWhatsapp,
  onEliminar,
  whatsappBusy,
  descargaJpgBusy,
  eliminando,
  compact = false,
}: VentaAccionesProps) {
  const btnClass = compact
    ? "inline-flex h-9 w-9 items-center justify-center rounded-lg"
    : "inline-flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9";

  return (
    <>
      <button
        type="button"
        onClick={() => onVer(venta)}
        className={`${btnClass} bg-slate-100 text-slate-700 hover:bg-slate-200`}
        title="Ver detalle"
        aria-label="Ver detalle"
      >
        <IconoVer />
      </button>
      <button
        type="button"
        onClick={() => onEditar(venta)}
        className={`${btnClass} bg-green-50 text-green-700 hover:bg-green-100`}
        title="Editar venta"
        aria-label="Editar venta"
      >
        <IconoEditar />
      </button>
      <button
        type="button"
        onClick={() => onWhatsapp(venta)}
        disabled={whatsappBusy === venta.idventa || descargaJpgBusy === venta.idventa}
        className={`${btnClass} bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50`}
        title="Enviar boleta por WhatsApp (JPG)"
        aria-label="Enviar boleta por WhatsApp"
      >
        {whatsappBusy === venta.idventa ? <IconoCargando /> : <IconoWhatsApp />}
      </button>
      <button
        type="button"
        onClick={() => onEliminar(venta.idventa)}
        disabled={eliminando === venta.idventa}
        className={`${btnClass} bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50`}
        title="Eliminar venta"
        aria-label="Eliminar venta"
      >
        {eliminando === venta.idventa ? <IconoCargando /> : <IconoEliminar />}
      </button>
    </>
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
  const [whatsappBusy, setWhatsappBusy] = useState<string | null>(null);
  const [descargaJpgBusy, setDescargaJpgBusy] = useState<string | null>(null);
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
    const estadoEntregado = (v: VentaList) =>
      /^\d{4}-\d{2}-\d{2}$/.test((v.entregado ?? "").trim())
        ? `Entregado - ${(v.entregado ?? "").trim()}`
        : (v.entregado ?? "").toLowerCase() === "pendiente" || !v.entregado
          ? "Nuevo pedido"
          : (v.entregado ?? "");

    const rows = ventasFiltradas.flatMap((v) => {
      const base = {
        "ID Venta": v.idventa,
        Fecha: v.fecha || "",
        Cliente: v.cliente || "-",
        Entregado: estadoEntregado(v),
      };

      const articulos = v.articulos ?? [];
      if (articulos.length === 0) {
        return [
          {
            ...base,
            Artículos: v.nombre || "-",
            Cantidad: 0,
            "Precio unitario": 0,
            Subtotal: 0,
            Total: v.total ?? 0,
          },
        ];
      }

      return articulos.map((a) => {
        const cantidad = a.cantidad ?? 0;
        const precioUnit = cantidad > 0 ? a.total / cantidad : 0;
        const subtotal = a.total ?? 0;
        return {
          ...base,
          Artículos: a.nombre || "-",
          Cantidad: cantidad,
          "Precio unitario": precioUnit,
          Subtotal: subtotal,
          Total: v.total ?? 0,
        };
      });
    });

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

  async function descargarComprobanteJpg(v: VentaList) {
    if (whatsappBusy === v.idventa || descargaJpgBusy === v.idventa) return;
    setDescargaJpgBusy(v.idventa);
    try {
      const blob = await generarBoletaVentaJpeg(v);
      const nombre = `comprobante-venta-${v.idventa}.jpg`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo descargar el comprobante");
    } finally {
      setDescargaJpgBusy(null);
    }
  }

  async function compartirBoletaWhatsapp(v: VentaList) {
    if (whatsappBusy === v.idventa || descargaJpgBusy === v.idventa) return;
    setWhatsappBusy(v.idventa);
    try {
      const blob = await generarBoletaVentaJpeg(v);
      const nombre = `boleta-venta-${v.idventa}.jpg`;
      const file = new File([blob], nombre, { type: "image/jpeg" });
      const texto = `Boleta de venta #${v.idventa}${v.cliente ? ` — ${v.cliente}` : ""}`;
      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: "Boleta de venta",
          text: texto,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nombre;
        a.click();
        URL.revokeObjectURL(url);
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${texto}\n\nAdjunta la imagen JPG descargada a este chat.`)}`,
          "_blank",
          "noopener,noreferrer"
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo preparar la boleta para WhatsApp");
    } finally {
      setWhatsappBusy(null);
    }
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
          <ModalVerVenta
            venta={ventaViendo}
            onCerrar={cerrarVer}
            onEditar={() => {
              cerrarVer();
              abrirEditar(ventaViendo);
            }}
            onWhatsapp={(v) => {
              void compartirBoletaWhatsapp(v);
            }}
            whatsappBusy={whatsappBusy}
            onDescargarJpg={(v) => {
              void descargarComprobanteJpg(v);
            }}
            descargaJpgBusy={descargaJpgBusy}
          />
        )}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="text-sm font-medium text-slate-700">Consulta por fecha:</label>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:flex-wrap">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-slate-800 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="Desde"
              />
              <span className="text-slate-500 text-center">—</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-slate-800 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="Hasta"
              />
            </div>
            {(fechaDesde || fechaHasta) && (
              <button
                type="button"
                onClick={() => { setFechaDesde(""); setFechaHasta(""); }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 w-fit"
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:max-w-xs"
          />
          <div className="flex flex-wrap gap-x-4 gap-y-2">
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
        </div>
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-3 sm:px-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
          <span className="text-sm font-medium text-red-800">
            {ventasFiltradas.length} venta{ventasFiltradas.length !== 1 ? "s" : ""} mostrada{ventasFiltradas.length !== 1 ? "s" : ""}
            {(fechaDesde || fechaHasta || filtro.trim() || ocultarPendiente || ocultarEntregadas) && " (filtradas)"}
          </span>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-base sm:text-lg font-bold text-red-700">
              Total: {formatPrecio(totalVentasFiltradas)}
            </span>
            <button
              type="button"
              onClick={descargarExcel}
              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 sm:px-4"
            >
              Descargar a Excel
            </button>
          </div>
        </div>
        <div className="rounded-xl shadow-sm border border-slate-200 overflow-hidden bg-white">
          <div className="sm:hidden">
            {ventasFiltradas.length === 0 ? (
              <p className="px-4 py-12 text-center text-slate-500">
                {ventas.length === 0
                  ? "No hay ventas disponibles"
                  : "Ninguna venta coincide con el filtro o rango de fechas"}
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {ventasFiltradas.map((v, i) => {
                  const descripcionArticulos = getDescripcionArticulos(v);
                  const estado = getEstadoEntregado(v);
                  return (
                    <article
                      key={v.idventa || `venta-mobile-${i}`}
                      className="p-3 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            #{v.idventa} · {v.fecha || "-"}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-800 truncate">
                            {v.cliente || "Sin cliente"}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-red-700">
                          {formatPrecio(v.total ?? 0)}
                        </p>
                      </div>
                      <p
                        className="text-xs leading-relaxed text-slate-600 line-clamp-2"
                        title={descripcionArticulos}
                      >
                        {descripcionArticulos}
                      </p>
                      <span
                        className={`inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estado.badgeClass}`}
                      >
                        <span className="truncate">{estado.label}</span>
                      </span>
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-[11px] font-medium text-slate-500">Acciones</span>
                        <div className="grid grid-cols-4 gap-1.5">
                          <VentaAcciones
                            venta={v}
                            onVer={abrirVer}
                            onEditar={abrirEditar}
                            onWhatsapp={(venta) => {
                              void compartirBoletaWhatsapp(venta);
                            }}
                            onEliminar={handleEliminar}
                            whatsappBusy={whatsappBusy}
                            descargaJpgBusy={descargaJpgBusy}
                            eliminando={eliminando}
                            compact
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-red-100">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-red-800 whitespace-nowrap">
                    ID Venta
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-red-800 whitespace-nowrap">
                    Fecha
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-red-800 whitespace-nowrap">
                    Cliente
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-red-800 whitespace-nowrap">
                    Artículos
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-red-800 whitespace-nowrap">
                    Total
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-red-800 whitespace-nowrap">
                    Entregado
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-red-800 whitespace-nowrap">
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
                    const descripcionArticulos = getDescripcionArticulos(v);
                    const estado = getEstadoEntregado(v);
                    return (
                      <tr
                        key={v.idventa || `venta-${i}`}
                        className="border-t border-slate-100 bg-white hover:bg-red-50/50 transition-colors"
                      >
                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">
                          {v.idventa}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">
                          {v.fecha}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">
                          {v.cliente || "-"}
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px]" title={descripcionArticulos}>
                          {descripcionArticulos}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                          {formatPrecio(v.total ?? 0)}
                        </td>
                        <td className={`px-5 py-4 text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis ${estado.textClass}`}>
                          {estado.label}
                        </td>
                        <td className="px-5 py-4">
                          <div className="grid grid-cols-2 gap-1.5 justify-items-center w-[88px]">
                            <VentaAcciones
                              venta={v}
                              onVer={abrirVer}
                              onEditar={abrirEditar}
                              onWhatsapp={(venta) => {
                                void compartirBoletaWhatsapp(venta);
                              }}
                              onEliminar={handleEliminar}
                              whatsappBusy={whatsappBusy}
                              descargaJpgBusy={descargaJpgBusy}
                              eliminando={eliminando}
                            />
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
