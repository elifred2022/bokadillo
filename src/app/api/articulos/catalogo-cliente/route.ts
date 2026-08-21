import { NextResponse } from "next/server";
import { getArticulos } from "@/lib/db/articulos";
import { IDS_ARTICULOS_CATALOGO } from "@/lib/catalogo-cliente";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const todos = await getArticulos();
    const porId = new Map(
      todos.map((a) => [a.idarticulo.trim().toLowerCase(), a])
    );
    const articulos = IDS_ARTICULOS_CATALOGO.map(
      (id) => porId.get(id.toLowerCase()) ?? null
    ).filter((a) => a != null);

    return NextResponse.json(
      { articulos },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error al cargar catálogo:", error);
    return NextResponse.json(
      { error: "Error al cargar los productos" },
      { status: 500 }
    );
  }
}
