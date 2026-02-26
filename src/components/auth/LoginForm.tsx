"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, esAdmin } from "@/contexts/AuthContext";
import FormRegistro from "./FormRegistro";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [emailParaRegistro, setEmailParaRegistro] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEnviando(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), clave }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        login(data.cliente);
        const destino = esAdmin(data.cliente.email) ? "/" : "/mis-pedidos";
        router.push(destino);
        router.refresh();
        return;
      }

      if (data.error === "no_registrado") {
        setEmailParaRegistro(email.trim());
        setMostrarRegistro(true);
        setError("");
        return;
      }

      throw new Error(data.message || data.error || "Error al iniciar sesión");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setEnviando(false);
    }
  };

  const handleRegistroExitoso = (cliente: { idcliente: string; nombre: string; email: string }) => {
    login(cliente);
    setMostrarRegistro(false);
    setEmailParaRegistro("");
    const destino = esAdmin(cliente.email) ? "/" : "/mis-pedidos";
    router.push(destino);
    router.refresh();
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-slate-800">Bokadillo</h1>
            <p className="mt-1 text-sm text-slate-600">
              Inicia sesión para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div>
              <label
                htmlFor="clave"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Contraseña
              </label>
              <input
                id="clave"
                name="clave"
                type="password"
                required
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Tu contraseña"
              />
            </div>

            <button
              type="submit"
              disabled={enviando}
              className="btn-primary w-full disabled:opacity-60"
            >
              {enviando ? "Iniciando sesión…" : "Iniciar sesión"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            Si no tienes cuenta, introduce tu email y contraseña. Si el correo no
            está registrado, se te pedirá completar el registro.
          </p>
        </div>
      </div>

      {mostrarRegistro && (
        <FormRegistro
          emailInicial={emailParaRegistro}
          onCerrar={() => {
            setMostrarRegistro(false);
            setEmailParaRegistro("");
          }}
          onRegistroExitoso={handleRegistroExitoso}
        />
      )}
    </>
  );
}
