"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const ADMIN_EMAILS = [
  "elifredmason@gmail.com",
  "hectorjlg0969@gmail.com",
  "ftnorbelismartinez@gmail.com",
  "bn028282@gmail.com",
].map((e) => e.toLowerCase());

export interface UsuarioAuth {
  idcliente: string;
  nombre: string;
  email: string;
}

export function esAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email?.trim().toLowerCase() ?? "");
}

interface AuthContextType {
  usuario: UsuarioAuth | null;
  cargando: boolean;
  login: (u: UsuarioAuth) => void;
  logout: () => void;
  estaAutenticado: boolean;
  isAdmin: boolean;
}

const STORAGE_KEY = "bokadillo_usuario";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UsuarioAuth;
        if (parsed?.idcliente && parsed?.email) {
          setUsuario(parsed);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setCargando(false);
    }
  }, []);

  const login = useCallback((u: UsuarioAuth) => {
    setUsuario(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUsuario(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
        login,
        logout,
        estaAutenticado: !!usuario,
        isAdmin: usuario ? esAdmin(usuario.email) : false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}
