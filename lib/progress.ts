import "server-only";
import { cookies } from "next/headers";
import { currentPlayer } from "@/auth";
import { challengeById } from "@/lib/challenges/registry";
import { getDb } from "./db";

// Progression d'un joueur sur un challenge (clés d'objectifs validés) :
// - connecté : en base, retrouvée sur tous ses appareils ;
// - déconnecté : dans un cookie de session, perdu à la fermeture du navigateur.
// À la première tentative après connexion, la progression du cookie est versée en base.

const cookieName = (challenge: string) => `progress_${challenge}`;

async function cookieProgress(challenge: string): Promise<string[]> {
  const known = new Set(challengeById(challenge)?.objectives ?? []);
  try {
    const raw = JSON.parse((await cookies()).get(cookieName(challenge))?.value ?? "[]");
    return Array.isArray(raw) ? raw.filter((k): k is string => typeof k === "string" && known.has(k)) : [];
  } catch {
    return [];
  }
}

function dbProgress(sub: string, challenge: string): string[] {
  const rows = getDb()
    .prepare(`SELECT objective FROM progress WHERE player_sub = ? AND challenge = ?`)
    .all(sub, challenge) as { objective: string }[];
  return rows.map((r) => r.objective);
}

/** Objectifs validés sur ce challenge (lecture seule, utilisable dans une page). */
export async function getProgress(challenge: string): Promise<Set<string>> {
  const player = await currentPlayer();
  const fromCookie = await cookieProgress(challenge);
  return new Set(player ? [...dbProgress(player.id, challenge), ...fromCookie] : fromCookie);
}

/**
 * Ajoute des objectifs validés et renvoie la progression complète.
 * Écrit des cookies : à appeler depuis une route API ou une action serveur.
 */
export async function addProgress(challenge: string, objectives: string[]): Promise<Set<string>> {
  const player = await currentPlayer();
  const jar = await cookies();
  const fromCookie = await cookieProgress(challenge);

  if (player) {
    const insert = getDb().prepare(
      `INSERT OR IGNORE INTO progress (player_sub, challenge, objective) VALUES (?, ?, ?)`,
    );
    for (const o of [...fromCookie, ...objectives]) insert.run(player.id, challenge, o);
    if (fromCookie.length) jar.delete(cookieName(challenge));
    return new Set(dbProgress(player.id, challenge));
  }

  const all = new Set([...fromCookie, ...objectives]);
  // Pas de maxAge : cookie de session.
  jar.set(cookieName(challenge), JSON.stringify([...all]), { httpOnly: true, sameSite: "lax", path: "/" });
  return all;
}

export type LeaderboardRow = { rank: number; name: string; points: number; solved: number };

/**
 * Classement d'un challenge, pour les joueurs connectés (la progression anonyme,
 * en cookie, n'apparaît pas). Les points sont calculés par le challenge lui-même.
 */
export function challengeLeaderboard(challenge: string, pointsOf: (objective: string) => number): LeaderboardRow[] {
  const rows = getDb()
    .prepare(
      `SELECT p.sub AS sub, p.name AS name, pr.objective AS objective
       FROM progress pr JOIN players p ON p.sub = pr.player_sub
       WHERE pr.challenge = ?`,
    )
    .all(challenge) as { sub: string; name: string; objective: string }[];

  const byPlayer = new Map<string, { name: string; points: number; solved: number }>();
  for (const r of rows) {
    const e = byPlayer.get(r.sub) ?? { name: r.name, points: 0, solved: 0 };
    e.points += pointsOf(r.objective);
    e.solved += 1;
    byPlayer.set(r.sub, e);
  }

  return [...byPlayer.values()]
    .sort((a, b) => b.points - a.points || b.solved - a.solved || a.name.localeCompare(b.name))
    .map((e, i) => ({ rank: i + 1, ...e }));
}
