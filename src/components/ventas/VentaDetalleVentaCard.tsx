import type { CSSProperties, ReactNode } from "react";
import type { VentaList, ArticuloVenta } from "@/lib/google-sheets";
import { formatPrecio } from "@/lib/formato";

const fontStack = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function textoEstado(venta: VentaList): string {
  const ent = (venta.entregado ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(ent)) return `Entregado — ${ent}`;
  if ((venta.entregado ?? "").toLowerCase() === "pendiente" || !venta.entregado) return "Nuevo pedido";
  return venta.entregado ?? "";
}

function estiloEstadoPill(venta: VentaList): CSSProperties {
  const ent = (venta.entregado ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(ent)) {
    return {
      display: "inline-block",
      marginTop: 4,
      padding: "6px 12px",
      borderRadius: 9999,
      fontSize: 13,
      fontWeight: 600,
      color: "#166534",
      backgroundColor: "#dcfce7",
    };
  }
  if ((venta.entregado ?? "").toLowerCase() === "pendiente" || !venta.entregado) {
    return {
      display: "inline-block",
      marginTop: 4,
      padding: "6px 12px",
      borderRadius: 9999,
      fontSize: 13,
      fontWeight: 600,
      color: "#991b1b",
      backgroundColor: "#fee2e2",
    };
  }
  return {
    display: "inline-block",
    marginTop: 4,
    padding: "6px 12px",
    borderRadius: 9999,
    fontSize: 13,
    fontWeight: 600,
    color: "#9a3412",
    backgroundColor: "#ffedd5",
  };
}

export interface VentaDetalleVentaCardProps {
  venta: VentaList;
  headerActions?: ReactNode;
  footer?: ReactNode;
}

/**
 * Boleta / detalle de venta para el cliente: solo estilos inline (hex/rgb) para captura JPEG.
 */
export function VentaDetalleVentaCard({ venta, headerActions, footer }: VentaDetalleVentaCardProps) {
  const articulos = venta.articulos ?? [];
  const tieneArticulos = articulos.length > 0;
  const headerAlign = headerActions ? "stretch" : "center";
  const textAlignTitle = headerActions ? "left" : "center";

  return (
    <div
      style={{
        width: 512,
        maxWidth: "100%",
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#fffefb",
        border: "1px solid #e7e5e4",
        boxShadow:
          "0 1px 2px rgb(0 0 0 / 0.04), 0 12px 32px -8px rgb(28 25 23 / 0.12), 0 0 0 1px rgb(255 255 255 / 0.8) inset",
        fontFamily: fontStack,
      }}
    >
      <div
        style={{
          padding: "18px 24px 16px",
          textAlign: "center",
          borderBottom: "1px solid #f5f5f4",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#b91c1c",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          Bokadillo
        </div>
        <div style={{ marginTop: 6, fontSize: 14, fontWeight: 500, color: "#57534e" }}>Tlf 1127003907</div>
      </div>

      <div style={{ height: 5, backgroundColor: "#dc2626" }} />

      <div
        style={{
          padding: "22px 24px 18px",
          display: "flex",
          flexDirection: "column",
          alignItems: headerAlign,
          position: "relative",
        }}
      >
        {headerActions ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              width: "100%",
            }}
          >
            <div style={{ flex: 1, textAlign: "left" }}>
              <p
                style={{
                  margin: "0 0 6px 0",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#78716c",
                }}
              >
                Boleta de venta
              </p>
              <h2
                style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#1c1917",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.15,
                }}
              >
                Venta n.º {venta.idventa}
              </h2>
              <div
                style={{
                  width: 56,
                  height: 4,
                  marginTop: 14,
                  borderRadius: 2,
                  backgroundColor: "#dc2626",
                }}
              />
            </div>
            <div style={{ flexShrink: 0, paddingTop: 2 }}>{headerActions}</div>
          </div>
        ) : (
          <>
            <p
              style={{
                margin: "0 0 6px 0",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#78716c",
                textAlign: textAlignTitle,
                width: "100%",
              }}
            >
              Boleta de venta
            </p>
            <h2
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 800,
                color: "#1c1917",
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                textAlign: textAlignTitle,
                width: "100%",
              }}
            >
              Venta n.º {venta.idventa}
            </h2>
            <div
              style={{
                width: 56,
                height: 4,
                marginTop: 14,
                borderRadius: 2,
                backgroundColor: "#dc2626",
                alignSelf: "center",
              }}
            />
          </>
        )}
      </div>

      <div style={{ padding: "0 24px 22px" }}>
        <div
          style={{
            backgroundColor: "#fff5f5",
            borderRadius: 14,
            padding: "16px 18px",
            border: "1px solid #fecdd3",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px 20px",
              fontSize: 14,
            }}
          >
            <div>
              <span style={{ color: "#a8a29e", display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                Fecha
              </span>
              <span style={{ fontWeight: 600, color: "#292524", fontSize: 15 }}>{venta.fecha || "—"}</span>
            </div>
            <div>
              <span style={{ color: "#a8a29e", display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                Cliente
              </span>
              <span style={{ fontWeight: 600, color: "#292524", fontSize: 15 }}>{venta.cliente || "—"}</span>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ color: "#a8a29e", display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                Estado del pedido
              </span>
              <span style={estiloEstadoPill(venta)}>{textoEstado(venta)}</span>
            </div>
          </div>
        </div>

        <div style={{ margin: "22px 0", borderTop: "1px dashed #d6d3d1" }} />

        <p
          style={{
            margin: "0 0 12px 0",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#78716c",
          }}
        >
          Artículos
        </p>

        {tieneArticulos ? (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid #e7e5e4",
              overflow: "hidden",
              backgroundColor: "#ffffff",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "#fafaf9" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#57534e", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Concepto
                  </th>
                  <th style={{ padding: "10px 10px", textAlign: "right", fontWeight: 600, color: "#57534e", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Cant.
                  </th>
                  <th style={{ padding: "10px 10px", textAlign: "right", fontWeight: 600, color: "#57534e", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    P. unit.
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#57534e", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody>
                {articulos.map((a: ArticuloVenta, i: number) => {
                  const precioUnit = a.cantidad > 0 ? a.total / a.cantidad : 0;
                  const zebra = i % 2 === 1 ? "#fafaf9" : "#ffffff";
                  return (
                    <tr key={i} style={{ borderTop: "1px solid #f5f5f4", backgroundColor: zebra }}>
                      <td style={{ padding: "12px 14px", color: "#1c1917", fontWeight: 500, lineHeight: 1.35 }}>{a.nombre}</td>
                      <td style={{ padding: "12px 10px", textAlign: "right", color: "#57534e" }}>{a.cantidad}</td>
                      <td style={{ padding: "12px 10px", textAlign: "right", color: "#57534e" }}>{formatPrecio(precioUnit)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "#1c1917" }}>{formatPrecio(a.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              borderRadius: 12,
              padding: "16px 18px",
              backgroundColor: "#fafaf9",
              border: "1px solid #e7e5e4",
              color: "#57534e",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {venta.nombre || "Sin detalle de artículos (venta anterior)."}
          </div>
        )}

        <div
          style={{
            marginTop: 22,
            borderRadius: 14,
            padding: "20px 22px",
            background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>Total</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>{formatPrecio(venta.total)}</span>
        </div>

        <div style={{ marginTop: 22, textAlign: "center", paddingBottom: 4 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#57534e" }}>Gracias por su compra.</p>
          <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#a8a29e" }}>Conserve este comprobante para cualquier consulta.</p>
        </div>

        {footer ? (
          <div style={{ marginTop: 8, paddingTop: 18, borderTop: "1px solid #e7e5e4" }}>{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
