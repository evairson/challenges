import "server-only";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { LEVELS, OBJECTIVES, levelsValidated, objectiveKey, type Level } from "./objectives";

// Vraies injections SQL : chaque tentative s'exécute dans un processus à part
// (sandbox.cjs), sur une base SQLite en mémoire recréée pour l'occasion. Un joueur
// ne peut donc rien casser pour les autres, ni bloquer le serveur.

const SECRET = "supersecret123";
const MAX_INPUT = 300;
const TIMEOUT_MS = 2000;
const SANDBOX = path.join(process.cwd(), "lib", "challenges", "netsphere", "sandbox.cjs");

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

type SandboxOutput = { columns: string[]; rows: string[][] } | { error: string } | { refused: true } | { timeout: true };

function runInSandbox(query: string): Promise<SandboxOutput> {
  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      [SANDBOX],
      { timeout: TIMEOUT_MS, killSignal: "SIGKILL", maxBuffer: 1024 * 1024, env: { NODE_ENV: "production", NETSPHERE_SECRET: SECRET } },
      (err, stdout) => {
        if (err) return resolve({ timeout: true });
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve({ timeout: true });
        }
      },
    );
    child.stdin?.end(query);
  });
}

/** Retire chaînes et commentaires pour n'analyser que la structure de la requête. */
function normalizeSQL(sql: string) {
  let s = "";
  let i = 0;
  let inString = false;
  while (i < sql.length) {
    const c = sql[i];
    if (inString) {
      if (c === "'") {
        if (sql[i + 1] === "'") { i += 2; continue; }
        inString = false;
      }
      i++;
      continue;
    }
    if (c === "'") { inString = true; i++; continue; }
    if (c === "-" && sql[i + 1] === "-") { while (i < sql.length && sql[i] !== "\n") i++; continue; }
    if (c === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    s += c;
    i++;
  }
  return s;
}

/** Garde-fou : une seule requête, en lecture, et rien qui puisse bloquer le serveur. */
function blockedReason(sql: string) {
  const n = normalizeSQL(sql);
  if (/;\s*\S/.test(n)) return "on ne peut enchaîner qu'une seule requête (pas de « ; »)";
  if (/\b(DROP|DELETE|UPDATE|INSERT|REPLACE|ALTER|CREATE|PRAGMA|ATTACH|DETACH|VACUUM|REINDEX)\b/i.test(n))
    return "seules les injections en lecture (SELECT) sont autorisées ici";
  if (/\b(WITH|RECURSIVE|RANDOMBLOB|ZEROBLOB|PRINTF|FORMAT|LOAD_EXTENSION|GENERATE_SERIES)\b/i.test(n))
    return "cette construction n'est pas autorisée sur ce challenge";
  return null;
}

export type AttemptResult =
  | { kind: "blocked"; query: string; reason: string }
  | { kind: "error"; query: string; message: string }
  | { kind: "guard"; query: string; count: number }
  | { kind: "fail"; query: string }
  | { kind: "success"; query: string; who: string; columns: string[]; rows: string[][] };

type Ctx = { success?: boolean; error?: boolean; guard?: boolean; rows?: string[][]; columns?: string[] };

export async function attempt(
  level: Level,
  username: string,
  password: string,
): Promise<{ result: AttemptResult; ctx: Ctx }> {
  username = username.slice(0, MAX_INPUT);
  password = password.slice(0, MAX_INPUT);
  const query =
    level === 1
      ? `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`
      : `SELECT * FROM users WHERE password='${sha256(password)}' AND username='${username}'`;

  const stop = blockedReason(query);
  if (stop) return { result: { kind: "blocked", query, reason: stop }, ctx: {} };

  const out = await runInSandbox(query);
  if ("timeout" in out)
    return { result: { kind: "blocked", query, reason: "la requête a pris trop de temps et a été interrompue" }, ctx: {} };
  if ("refused" in out)
    return { result: { kind: "blocked", query, reason: "seules les requêtes SELECT sont autorisées" }, ctx: {} };
  if ("error" in out) return { result: { kind: "error", query, message: out.error }, ctx: { error: true } };
  const { columns, rows } = out;

  if (level === 3 && rows.length > 1) return { result: { kind: "guard", query, count: rows.length }, ctx: { guard: true } };
  if (rows.length === 0) return { result: { kind: "fail", query }, ctx: {} };

  const uCol = columns.findIndex((c) => c.toLowerCase() === "username");
  const who = uCol >= 0 ? rows[0][uCol] : "utilisateur";
  return { result: { kind: "success", query, who, columns, rows }, ctx: { success: true, rows, columns } };
}

/** Objectifs remplis par cette tentative (bonus inclus seulement s'ils sont débloqués). */
export function objectivesReached(level: Level, ctx: Ctx, alreadySolved: Set<string>) {
  const rows = ctx.rows ?? [];
  const columns = ctx.columns ?? [];
  const flat = rows.flat();
  const uCol = columns.findIndex((c) => c.toLowerCase() === "username");
  const adminReturned = uCol >= 0 && rows.some((r) => r[uCol].toLowerCase() === "admin");
  const win: Record<string, boolean> = {
    "login-any": !!ctx.success,
    "login-admin": !!ctx.success && adminReturned,
    "db-error": !!ctx.error,
    "list-tables": flat.includes("table_super_secrete") || flat.includes("sqlite_master"),
    "get-secret": flat.includes(SECRET),
    "trigger-guard": !!ctx.guard,
  };

  const spec = OBJECTIVES[level];
  const reached = spec.core.filter((o) => win[o.id]);

  // Les bonus se débloquent quand les 3 espaces sont validés (en comptant cette tentative).
  const withCore = new Set([...alreadySolved, ...reached.map((o) => objectiveKey(level, o.id))]);
  if (levelsValidated(withCore) === LEVELS.length) reached.push(...spec.bonus.filter((o) => win[o.id]));

  return reached;
}
