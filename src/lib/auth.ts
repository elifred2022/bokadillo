import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/** Genera hash bcrypt de la contraseña. */
export async function hashClave(clave: string): Promise<string> {
  return bcrypt.hash(clave.trim(), SALT_ROUNDS);
}

/** Verifica si la contraseña coincide con el hash. */
export async function verificarClave(clave: string, hash: string): Promise<boolean> {
  if (!hash?.trim()) return false;
  return bcrypt.compare(clave.trim(), hash);
}
