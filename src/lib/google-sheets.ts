import { google } from 'googleapis';
import type {
  ArticuloVenta,
  Venta,
  VentaList,
  ArticuloCompra,
  CompraList,
} from './types';

export type {
  Articulo,
  ArticuloNuevo,
  ArticuloVenta,
  Venta,
  VentaList,
  Proveedor,
  ProveedorNuevo,
  Cliente,
  ClienteNuevo,
  ArticuloCompra,
  CompraList,
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

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID ?? '';
  const match = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : id;
}

/** Convierte fecha serial de Excel/Sheets a yyyy-MM-dd */
function parseFecha(val: string | number | undefined): string {
  if (val === undefined || val === null) return '';
  const s = String(val).trim();
  if (!s) return '';
  const n = parseFloat(s);
  // Solo convertir si parece serial de Excel (n > 25569 = 1970-01-01).
  // Evita convertir aÃ±os (2024, 2025) u otros nÃºmeros que darÃ­an fechas errÃ³neas como 1905.
  if (!Number.isNaN(n) && n > 25569 && n < 100000) {
    const d = new Date((n - 25569) * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  return s;
}

function parsePrivateKey(raw: string | undefined): string {
  if (!raw?.trim()) return '';
  let key = raw
    .replace(/\\n/g, '\n')        // literales \n
    .replace(/\r\n/g, '\n')       // Windows line endings
    .replace(/\r/g, '\n')         // Mac antiguo
    .trim();
  // Quita comillas externas si Vercel las aÃ±adiÃ³
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).replace(/\\n/g, '\n');
  }
  return key;
}

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
/**
 * Obtiene todas las ventas de la pestaÃ±a 'ventas'.
 * Columnas esperadas: idventa, fecha, cliente, nombre, cantidad, total
 */
export async function getVentas(): Promise<VentaList[]> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'ventas'!A:Z",
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return [];
  }

  const headers = rows[0] as string[];
  const headerIndex = (key: string) =>
    headers.findIndex((h) => h.toLowerCase() === key.toLowerCase());

  const idx = {
    idventa: headerIndex('idventa'),
    fecha: headerIndex('fecha'),
    cliente: headerIndex('cliente') >= 0 ? headerIndex('cliente') : headerIndex('idarticulo') >= 0 ? headerIndex('idarticulo') : -1,
    nombre: headerIndex('nombre') >= 0 ? headerIndex('nombre') : headerIndex('articulonombre'),
    cantidad: headerIndex('cantidad'),
    precioUnitario: headerIndex('preciounitario') >= 0 ? headerIndex('preciounitario') : headerIndex('precio'),
    total: headerIndex('total'),
    entregado: headerIndex('entregado'),
  };

  return rows.slice(1).map((row, i) => {
    const get = (j: number) => (j >= 0 && row[j] !== undefined ? String(row[j]).trim() : '');
    const getNum = (j: number) => {
      const val = get(j);
      const n = parseFloat(val);
      return Number.isNaN(n) ? 0 : n;
    };

    const idventa = idx.idventa >= 0 ? get(idx.idventa) : String(i + 1);
    const nombreRaw = idx.nombre >= 0 ? get(idx.nombre) : '';
    const cantidad = getNum(idx.cantidad);
    const total = getNum(idx.total);
    const precioUnitario = idx.precioUnitario >= 0
      ? getNum(idx.precioUnitario)
      : (cantidad > 0 ? total / cantidad : 0);

    let articulos: ArticuloVenta[] | undefined;
    if (nombreRaw.startsWith('[')) {
      try {
        articulos = JSON.parse(nombreRaw) as ArticuloVenta[];
        if (!Array.isArray(articulos)) articulos = undefined;
      } catch {
        /* Si el JSON no es vÃ¡lido, se trata como nombre legacy */
      }
    }

    return {
      idventa,
      fecha: idx.fecha >= 0 ? parseFecha(row[idx.fecha]) : '',
      cliente: idx.cliente >= 0 ? get(idx.cliente) : '',
      nombre: nombreRaw,
      articulos,
      cantidad,
      precioUnitario,
      total,
      entregado: idx.entregado >= 0 ? get(idx.entregado) : '',
    } satisfies VentaList;
  });
}

/**
 * Elimina una venta por su idventa.
 */
export async function eliminarVenta(idventa: string): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const ventasSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title?.toLowerCase() === 'ventas'
  );
  const sheetId = ventasSheet?.properties?.sheetId;
  if (sheetId === undefined) {
    throw new Error('No se encontrÃ³ la hoja ventas');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'ventas'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Venta no encontrada');
  }

  const headers = rows[0] as string[];
  const idventaCol = headers.findIndex((h) => h.toLowerCase() === 'idventa');

  let rowIndex: number;
  if (idventaCol >= 0) {
    rowIndex = rows.findIndex(
      (row, i) => i > 0 && String(row[idventaCol] ?? '').trim() === idventa.trim()
    );
  } else {
    const num = parseInt(idventa, 10);
    rowIndex = Number.isNaN(num) || num < 1 || num >= rows.length ? -1 : num;
  }
  if (rowIndex < 0) {
    throw new Error('Venta no encontrada');
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}

/** Payload para actualizar venta: articulos (nuevo formato) o nombre/cantidad/total (legacy) */
export type VentaUpdatePayload = Partial<Omit<VentaList, 'idventa'>> & {
  articulos?: ArticuloVenta[];
  idcliente?: string;
};

/**
 * Actualiza una venta existente por idventa.
 */
export async function actualizarVenta(
  idventaAntiguo: string,
  venta: VentaUpdatePayload
): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'ventas'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Venta no encontrada');
  }

  const headers = rows[0] as string[];
  const headerIndex = (key: string) =>
    headers.findIndex((h) => h.toLowerCase() === key.toLowerCase());

  const idx = {
    idventa: headerIndex('idventa'),
    fecha: headerIndex('fecha'),
    cliente: headerIndex('cliente') >= 0 ? headerIndex('cliente') : headerIndex('idarticulo') >= 0 ? headerIndex('idarticulo') : -1,
    nombre: headerIndex('nombre') >= 0 ? headerIndex('nombre') : headerIndex('articulonombre'),
    cantidad: headerIndex('cantidad'),
    total: headerIndex('total'),
    entregado: headerIndex('entregado'),
  };

  let rowIndex: number;
  if (idx.idventa >= 0) {
    rowIndex = rows.findIndex(
      (row, i) => i > 0 && String(row[idx.idventa] ?? '').trim() === idventaAntiguo.trim()
    );
  } else {
    const num = parseInt(idventaAntiguo, 10);
    rowIndex = Number.isNaN(num) || num < 1 ? -1 : num;
  }
  if (rowIndex < 0 || rowIndex >= rows.length) {
    throw new Error('Venta no encontrada');
  }

  const sheetRow = rowIndex + 1;
  const ventas = await getVentas();
  const actual = ventas.find((v) => v.idventa.trim() === idventaAntiguo.trim());
  if (!actual) throw new Error('Venta no encontrada');

  let nombre: string;
  let total: number;
  if (venta.articulos && Array.isArray(venta.articulos) && venta.articulos.length > 0) {
    nombre = JSON.stringify(venta.articulos);
    total = venta.articulos.reduce((sum, a) => sum + (a.total || 0), 0);
  } else {
    nombre = venta.nombre ?? actual.nombre;
    total = venta.total ?? actual.total;
  }

  const entregado = venta.entregado != null ? String(venta.entregado).trim() : (actual.entregado ?? '');
  const idcliente = venta.idcliente != null ? String(venta.idcliente).trim() : '';

  const nueva = {
    idventa: actual.idventa,
    fecha: venta.fecha ?? actual.fecha,
    cliente: venta.cliente ?? actual.cliente ?? '',
    nombre,
    cantidad: 0,
    precioUnitario: 0,
    total,
    entregado: entregado || 'pendiente',
    idcliente,
  };

  const range = `'ventas'!A${sheetRow}:I${sheetRow}`;
  const values = [[nueva.idventa, nueva.fecha, nueva.cliente, nueva.nombre, nueva.cantidad, nueva.precioUnitario, nueva.total, nueva.entregado, nueva.idcliente]];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

/**
 * Genera el siguiente idventa automÃ¡ticamente (secuencial).
 */
export async function generarSiguienteIdVenta(): Promise<string> {
  const ventas = await getVentas();
  let max = 0;
  for (const v of ventas) {
    const n = parseInt(v.idventa, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return String(max + 1);
}

/**
 * Inserta una nueva fila en la pestaÃ±a 'ventas'.
 * El idventa se genera automÃ¡ticamente.
 * nombre almacena JSON del array de artÃ­culos; total es la suma de totales.
 */
export async function insertarVenta(venta: Venta): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const idventa = await generarSiguienteIdVenta();

  const nombreJson = JSON.stringify(venta.articulos);
  const total = venta.total;
  const cliente = venta.cliente?.trim() ?? '';
  const idcliente = venta.idcliente?.trim() ?? '';

  const values = [
    [
      idventa,
      venta.fecha,
      cliente,
      nombreJson,
      0, // cantidad (legacy)
      0, // precioUnitario (legacy)
      total,
      "pendiente", // entregado: pendiente hasta que se registre la entrega
      idcliente, // idcliente al final
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'ventas'!A:I",
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values,
    },
  });
}

// â”€â”€â”€ Compras â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Obtiene todas las compras de la pestaÃ±a 'compras'.
 * Columnas: idcompra, fecha, proveedor, idarticulo, articulo, cantidad, total
 */
export async function getCompras(): Promise<CompraList[]> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'compras'!A:Z",
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return [];
  }

  const headers = rows[0] as string[];
  const headerIndex = (keys: string[]) => {
    for (const key of keys) {
      const i = headers.findIndex((h) => String(h ?? '').trim().toLowerCase() === key.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };

  const idx = {
    idcompra: headerIndex(['idcompra', 'id compra']),
    fecha: headerIndex(['fecha']),
    proveedor: headerIndex(['proveedor']),
    factura: headerIndex(['factura', 'numero factura', 'nro factura']),
    idarticulo: headerIndex(['idarticulo', 'id articulo', 'articuloid']),
    articulo: headerIndex(['articulo', 'nombre', 'articulonombre']),
    cantidad: headerIndex(['cantidad']),
    total: headerIndex(['total']) >= 0 ? headerIndex(['total']) : headerIndex(['precio', 'preciounitario']),
  };

  return rows.slice(1).map((row, i) => {
    const get = (j: number) => (j >= 0 && row[j] !== undefined ? String(row[j]).trim() : '');
    const getNum = (j: number) => {
      const val = get(j);
      const n = parseFloat(val);
      return Number.isNaN(n) ? 0 : n;
    };

    const idcompra = idx.idcompra >= 0 ? get(idx.idcompra) : String(i + 1);
    const articuloRaw = idx.articulo >= 0 ? get(idx.articulo) : '';
    const total = getNum(idx.total);

    let articulos: ArticuloCompra[] | undefined;
    if (articuloRaw.startsWith('[')) {
      try {
        articulos = JSON.parse(articuloRaw) as ArticuloCompra[];
        if (!Array.isArray(articulos)) articulos = undefined;
      } catch {
        /* Si el JSON no es vÃ¡lido, se trata como articulo legacy */
      }
    }

    return {
      idcompra,
      fecha: idx.fecha >= 0 ? parseFecha(row[idx.fecha]) : '',
      proveedor: idx.proveedor >= 0 ? get(idx.proveedor) : '',
      factura: idx.factura >= 0 ? get(idx.factura) : '',
      idarticulo: idx.idarticulo >= 0 ? get(idx.idarticulo) : '',
      articulo: articuloRaw,
      articulos,
      cantidad: getNum(idx.cantidad),
      total,
    } satisfies CompraList;
  });
}

export async function generarSiguienteIdCompra(): Promise<string> {
  const compras = await getCompras();
  let max = 0;
  for (const c of compras) {
    const n = parseInt(c.idcompra, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return String(max + 1);
}

/** Payload para insertar compra: articulos array y total */
export interface CompraNueva {
  fecha: string;
  proveedor: string;
  factura?: string; // nÃºmero de factura
  articulos: ArticuloCompra[];
  total: number; // total de la compra
}

export async function insertarCompra(compra: CompraNueva): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const idcompra = await generarSiguienteIdCompra();

  const articuloJson = JSON.stringify(compra.articulos);
  const factura = compra.factura?.trim() ?? '';

  const values = [
    [
      idcompra,
      compra.fecha,
      compra.proveedor,
      '', // idarticulo ya no se usa
      articuloJson,
      0, // cantidad (legacy)
      compra.total,
      factura, // nÃºmero de factura (columna H)
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'compras'!A:H",
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

/** Payload para actualizar compra: articulos (nuevo formato) o articulo/cantidad/total (legacy) */
export type CompraUpdatePayload = Partial<Omit<CompraList, 'idcompra'>> & {
  articulos?: ArticuloCompra[];
};

export async function actualizarCompra(
  idcompraAntiguo: string,
  compra: CompraUpdatePayload
): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'compras'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Compra no encontrada');
  }

  const headers = rows[0] as string[];
  const headerIndex = (keys: string[]) => {
    for (const key of keys) {
      const i = headers.findIndex((h) => String(h ?? '').trim().toLowerCase() === key.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const idx = {
    idcompra: headerIndex(['idcompra', 'id compra']),
    fecha: headerIndex(['fecha']),
    proveedor: headerIndex(['proveedor']),
    factura: headerIndex(['factura', 'numero factura', 'nro factura']),
    idarticulo: headerIndex(['idarticulo', 'id articulo']),
    articulo: headerIndex(['articulo', 'nombre']),
    cantidad: headerIndex(['cantidad']),
    total: headerIndex(['total']) >= 0 ? headerIndex(['total']) : headerIndex(['precio']),
  };
  const idCol = idx.idcompra >= 0 ? idx.idcompra : 0;

  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && String(row[idCol] ?? '').trim() === idcompraAntiguo.trim()
  );
  if (rowIndex < 0) {
    throw new Error('Compra no encontrada');
  }

  const compras = await getCompras();
  const actual = compras.find((c) => c.idcompra.trim() === idcompraAntiguo.trim());
  if (!actual) throw new Error('Compra no encontrada');

  let articulo: string;
  let total: number;
  if (compra.articulos && Array.isArray(compra.articulos) && compra.articulos.length > 0) {
    articulo = JSON.stringify(compra.articulos);
    total = compra.articulos.reduce((sum, a) => sum + (a.total || 0), 0);
  } else {
    articulo = compra.articulo ?? actual.articulo;
    total = compra.total ?? actual.total;
  }

  const factura = compra.factura != null ? String(compra.factura).trim() : (actual.factura ?? '');

  const nueva = {
    idcompra: actual.idcompra,
    fecha: compra.fecha ?? actual.fecha,
    proveedor: compra.proveedor ?? actual.proveedor,
    factura,
    idarticulo: '',
    articulo,
    cantidad: 0,
    total,
  };

  const sheetRow = rowIndex + 1;
  const range = `'compras'!A${sheetRow}:H${sheetRow}`;
  const values = [[nueva.idcompra, nueva.fecha, nueva.proveedor, nueva.idarticulo, nueva.articulo, nueva.cantidad, nueva.total, nueva.factura]];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function eliminarCompra(idcompra: string): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const comprasSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title?.toLowerCase() === 'compras'
  );
  const sheetId = comprasSheet?.properties?.sheetId;
  if (sheetId === undefined) {
    throw new Error('No se encontrÃ³ la hoja compras');
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'compras'!A:Z",
  });
  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error('Compra no encontrada');
  }

  const headers = rows[0] as string[];
  const headerIndex = (keys: string[]) => {
    for (const key of keys) {
      const i = headers.findIndex((h) => String(h ?? '').trim().toLowerCase() === key.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const idCol = headerIndex(['idcompra', 'id compra']) >= 0 ? headerIndex(['idcompra', 'id compra']) : 0;

  const rowIndex = rows.findIndex(
    (row, i) => i > 0 && String(row[idCol] ?? '').trim() === idcompra.trim()
  );
  if (rowIndex < 0) {
    throw new Error('Compra no encontrada');
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}

