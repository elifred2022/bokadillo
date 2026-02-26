"use client";

import { useState } from "react";

interface FormRegistroProps {
  emailInicial: string;
  onCerrar: () => void;
  onRegistroExitoso: (cliente: { idcliente: string; nombre: string; email: string }) => void;
}

export default function FormRegistro({
  emailInicial,
  onCerrar,
  onRegistroExitoso,
}: FormRegistroProps) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const fechaHoy = () => new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: emailInicial,
    direccion: "",
    clave: "",
    claveConfirmar: "",
    fechaCreacion: fechaHoy(),
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setError("");
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEnviando(true);

    if (formData.clave.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setEnviando(false);
      return;
    }
    if (formData.clave !== formData.claveConfirmar) {
      setError("Las contraseñas no coinciden");
      setEnviando(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          telefono: formData.telefono.trim() || undefined,
          email: formData.email.trim(),
          direccion: formData.direccion.trim() || undefined,
          clave: formData.clave,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al registrarse");
      }

      onRegistroExitoso(data.cliente);
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            Crear cuenta
          </h2>
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

          <div>
            <label
              htmlFor="nombre"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              value={formData.nombre}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Tu nombre completo"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label
              htmlFor="clave"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Contraseña <span className="text-red-500">*</span>
            </label>
            <input
              id="clave"
              name="clave"
              type="password"
              required
              minLength={6}
              value={formData.clave}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Mínimo 6 caracteres"
            />
            <p className="mt-1 text-xs text-slate-500">
              La contraseña debe tener al menos 6 caracteres
            </p>
          </div>

          <div>
            <label
              htmlFor="claveConfirmar"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Confirmar contraseña <span className="text-red-500">*</span>
            </label>
            <input
              id="claveConfirmar"
              name="claveConfirmar"
              type="password"
              required
              minLength={6}
              value={formData.claveConfirmar}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Repite la contraseña"
            />
          </div>

          <div>
            <label
              htmlFor="telefono"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              type="text"
              value={formData.telefono}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Ej: +54 11 1234-5678"
            />
          </div>

          <div>
            <label
              htmlFor="direccion"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Dirección
            </label>
            <textarea
              id="direccion"
              name="direccion"
              rows={2}
              value={formData.direccion}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Dirección opcional"
            />
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onCerrar}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {enviando ? "Registrando…" : "Crear cuenta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
