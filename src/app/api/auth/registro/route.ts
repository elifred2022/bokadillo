import { NextResponse } from "next/server";
import {
  getClientePorEmail,
  insertarCliente,
  generarSiguienteIdCliente,
} from "@/lib/google-sheets";
import { hashClave } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, telefono, email, direccion, clave } = body;

    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }
    if (!email?.trim()) {
      return NextResponse.json(
        { error: "El email es obligatorio" },
        { status: 400 }
      );
    }
    if (!clave?.trim()) {
      return NextResponse.json(
        { error: "La contraseña es obligatoria" },
        { status: 400 }
      );
    }
    if (clave.trim().length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const existente = await getClientePorEmail(email.trim());
    if (existente) {
      return NextResponse.json(
        { error: "El email ya está registrado. Inicia sesión o usa otro correo." },
        { status: 409 }
      );
    }

    const claveHash = await hashClave(clave);
    const idCliente = await generarSiguienteIdCliente();
    const fechaHoy = new Date().toISOString().split("T")[0];

    const cliente = {
      idcliente: idCliente,
      nombre: String(nombre).trim(),
      telefono: telefono != null ? String(telefono).trim() : undefined,
      email: String(email).trim(),
      direccion: direccion != null ? String(direccion).trim() : undefined,
      fechaCreacion: fechaHoy,
      clave: claveHash,
    };

    await insertarCliente(cliente);

    return NextResponse.json({
      success: true,
      cliente: {
        idcliente: cliente.idcliente,
        nombre: cliente.nombre,
        email: cliente.email,
      },
    });
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "Error al registrar el usuario" },
      { status: 500 }
    );
  }
}
