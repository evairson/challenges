import "server-only";
import { getDb } from "./db";

export function upsertPlayer(sub: string, name: string, email: string | null) {
  getDb()
    .prepare(
      `INSERT INTO players (sub, name, email) VALUES (?, ?, ?)
       ON CONFLICT(sub) DO UPDATE SET name = excluded.name, email = excluded.email`,
    )
    .run(sub, name, email);
}

export function playerExists(sub: string) {
  return !!getDb().prepare(`SELECT 1 FROM players WHERE sub = ?`).get(sub);
}
