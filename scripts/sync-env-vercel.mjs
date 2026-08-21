/**
 * Sube las variables de .env.local a Vercel (Production, Preview y Development).
 *
 * Uso:
 *   npx vercel login
 *   npx vercel link
 *   node --env-file=.env.local scripts/sync-env-vercel.mjs
 */
import { spawn } from "node:child_process";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const TARGETS = ["production", "preview", "development"];

function run(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["vercel", ...args], {
      stdio: input != null ? ["pipe", "pipe", "pipe"] : "inherit",
      shell: true,
    });
    let out = "";
    let err = "";
    if (input != null) {
      child.stdout.on("data", (d) => {
        out += d.toString();
      });
      child.stderr.on("data", (d) => {
        err += d.toString();
      });
      child.stdin.write(input);
      child.stdin.end();
    }
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(err || out || `vercel ${args.join(" ")} falló (${code})`));
    });
  });
}

async function upsert(name, value, target) {
  try {
    await run(["env", "rm", name, target, "-y"], "");
  } catch {
    /* no existía */
  }
  await run(["env", "add", name, target], value);
  console.log(`OK ${name} → ${target}`);
}

async function main() {
  const missing = KEYS.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    console.error("Faltan en .env.local:", missing.join(", "));
    process.exit(1);
  }

  for (const name of KEYS) {
    const value = process.env[name].trim();
    for (const target of TARGETS) {
      await upsert(name, value, target);
    }
  }

  console.log("\nListo. Redeploy en Vercel para que tomen efecto (sobre todo NEXT_PUBLIC_*).");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
