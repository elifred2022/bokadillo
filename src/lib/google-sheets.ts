import { google } from 'googleapis';

export type {
  Articulo,
  ArticuloNuevo,
  ArticuloVenta,
  Venta,
  VentaList,
  VentaUpdatePayload,
  Proveedor,
  ProveedorNuevo,
  Cliente,
  ClienteNuevo,
  ArticuloCompra,
  CompraList,
  CompraNueva,
  CompraUpdatePayload,
} from './types';

export {
  getArticulos,
  articuloExiste,
  articuloExistePorCodbarra,
  insertarArticulo,
  actualizarArticulo,
  descontarStockArticulo,
  actualizarPrecioYStockArticulo,
  restarStockArticulo,
  reponerStockArticulo,
  eliminarArticulo,
} from './db/articulos';

export {
  getClientes,
  clienteExiste,
  getClientePorEmail,
  clienteExistePorEmail,
  generarSiguienteIdCliente,
  insertarCliente,
  actualizarCliente,
  eliminarCliente,
} from './db/clientes';

export {
  getProveedores,
  proveedorExiste,
  insertarProveedor,
  actualizarProveedor,
  eliminarProveedor,
} from './db/proveedores';

export {
  getVentas,
  eliminarVenta,
  actualizarVenta,
  generarSiguienteIdVenta,
  insertarVenta,
} from './db/ventas';

export {
  getCompras,
  generarSiguienteIdCompra,
  insertarCompra,
  actualizarCompra,
  eliminarCompra,
} from './db/compras';

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID ?? '';
  const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : id;
}

function parsePrivateKey(raw: string | undefined): string {
  if (!raw?.trim()) return '';
  let key = raw
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).replace(/\\n/g, '\n');
  }
  return key;
}

/** Cliente Google Sheets (solo /api/health legacy). */
export async function getGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY);

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Faltan credenciales de Google. Configura GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY en las variables de entorno de Vercel.'
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}
