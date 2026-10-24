import "server-only";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// Base de la plateforme (joueurs + objectifs validés). À ne pas confondre avec
// les bases jetables des challenges, recréées à chaque requête.
const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "imphackt.db");

function open() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH, { timeout: 5000 });
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      sub        TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS progress (
      player_sub TEXT NOT NULL REFERENCES players(sub),
      challenge  TEXT NOT NULL,
      objective  TEXT NOT NULL,
      solved_at  TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (player_sub, challenge, objective)
    );
  `);
  // Ancienne table à points (avant la suppression du score global) : on garde la progression.
  const legacy = db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'solves'`).get();
  if (legacy) {
    db.exec(`
      INSERT OR IGNORE INTO progress (player_sub, challenge, objective, solved_at)
        SELECT player_sub, challenge, objective, solved_at FROM solves;
      DROP TABLE solves;
    `);
  }
  return db;
}

// Ouverte au premier usage (pas à l'import, pour le build) et gardée unique
// malgré le rechargement à chaud en dev.
const g = globalThis as unknown as { __imphacktDb?: Database.Database };
export const getDb = () => (g.__imphacktDb ??= open());
