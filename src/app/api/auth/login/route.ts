import { NextResponse } from "next/server";
import { getClientePorEmail } from "@/lib/google-sheets";
import { verificarClave } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, clave } = body;

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

    const cliente = await getClientePorEmail(email.trim());
    if (!cliente) {
      return NextResponse.json(
        { error: "no_registrado", message: "No existe una cuenta con ese correo. Regístrate para continuar." },
        { status: 404 }
      );
    }

    if (!cliente.clave?.trim()) {
      return NextResponse.json(
        { error: "sin_clave", message: "Este cliente no tiene contraseña registrada. Contacta al administrador." },
        { status: 400 }
      );
    }

    const valido = await verificarClave(clave, cliente.clave);
    if (!valido) {
      return NextResponse.json(
        { error: "credenciales_invalidas", message: "Email o contraseña incorrectos." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      cliente: {
        idcliente: cliente.idcliente,
        nombre: cliente.nombre,
        email: cliente.email,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error al iniciar sesión" },
      { status: 500 }
    );
  }
}
