/** Tipos compartidos de dominio (independientes del almacenamiento). */

export interface Articulo {
  codbarra: string;
  idarticulo: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  categoria?: string;
}

export interface ArticuloNuevo {
  codbarra: string;
  idarticulo: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
}

/** Artículo individual dentro de una venta (array en campo nombre) */
export interface ArticuloVenta {
  idarticulo: string;
  nombre: string;
  cantidad: number;
  total: number;
}

export interface Venta {
  fecha: string;
  articulos: ArticuloVenta[];
  entregado?: string;
  total: number;
  cliente?: string;
  idcliente?: string;
}

/** Venta tal como se muestra en la lista. nombre puede ser JSON (array) o string legacy */
export interface VentaList {
  idventa: string;
  fecha: string;
  cliente: string;
  nombre: string;
  articulos?: ArticuloVenta[];
  cantidad?: number;
  precioUnitario?: number;
  total: number;
  entregado: string;
}

export type VentaUpdatePayload = Partial<Omit<VentaList, "idventa">> & {
  articulos?: ArticuloVenta[];
  idcliente?: string;
};

export interface Proveedor {
  idproveedor: string;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
}

export interface ProveedorNuevo {
  idproveedor: string;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
}

export interface Cliente {
  idcliente: string;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  fechaCreacion: string;
  clave?: string;
}

export interface ClienteNuevo {
  idcliente: string;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  fechaCreacion: string;
  clave?: string;
}

/** Artículo individual dentro de una compra (array en campo articulo) */
export interface ArticuloCompra {
  idarticulo: string;
  nombre: string;
  cantidad: number;
  total: number;
}

/** Compra tal como se muestra en la lista. articulo puede ser JSON (array) o string legacy */
export interface CompraList {
  idcompra: string;
  fecha: string;
  proveedor: string;
  factura?: string;
  idarticulo?: string;
  articulo: string;
  articulos?: ArticuloCompra[];
  cantidad?: number;
  total: number;
}

export interface CompraNueva {
  fecha: string;
  proveedor: string;
  factura?: string;
  articulos: ArticuloCompra[];
  total: number;
}

export type CompraUpdatePayload = Partial<Omit<CompraList, "idcompra">> & {
  articulos?: ArticuloCompra[];
};
