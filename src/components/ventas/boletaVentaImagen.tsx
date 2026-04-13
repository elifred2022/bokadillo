"use client";

import { createRoot, type Root } from "react-dom/client";
import html2canvas from "html2canvas";
import type { VentaList } from "@/lib/google-sheets";
import { VentaDetalleVentaCard } from "./VentaDetalleVentaCard";

/**
 * Misma tarjeta que el modal «Ver», renderizada en un iframe sin CSS del sitio
 * (evita `lab()` en html2canvas).
 */
export async function generarBoletaVentaJpeg(venta: VentaList): Promise<Blob> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;left:-10000px;top:0;width:560px;height:1800px;border:0;visibility:hidden;pointer-events:none"
  );
  document.body.appendChild(iframe);

  await new Promise<void>((resolve, reject) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => reject(new Error("No se pudo preparar la vista de la boleta"));
    iframe.src = "about:blank";
  });

  const doc = iframe.contentDocument;
  if (!doc?.body) {
    document.body.removeChild(iframe);
    throw new Error("Documento de captura no disponible");
  }

  doc.body.style.margin = "0";
  doc.body.style.padding = "0";
  doc.body.style.backgroundColor = "#ffffff";

  const mount = doc.createElement("div");
  doc.body.appendChild(mount);

  let root: Root | null = createRoot(mount);
  root.render(<VentaDetalleVentaCard venta={venta} />);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise((r) => setTimeout(r, 100));

  const target = mount.firstElementChild as HTMLElement | null;
  if (!target) {
    root.unmount();
    root = null;
    document.body.removeChild(iframe);
    throw new Error("Boleta vacía");
  }

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
  } finally {
    root?.unmount();
    root = null;
    document.body.removeChild(iframe);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("No se pudo generar el JPEG"));
      },
      "image/jpeg",
      0.92
    );
  });
}
