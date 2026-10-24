// Définition publique du challenge « Cryptobrute » : partagée serveur/client,
// elle ne contient ni mot de passe en clair ni le schéma à deviner.

export type Difficulty = 1 | 2 | 3;

export const CHALLENGE_ID = "cryptobrute";
export const DIFFICULTY_POINTS: Record<Difficulty, number> = { 1: 5, 2: 10, 3: 15 };
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { 1: "Facile", 2: "Moyen", 3: "Difficile" };

export const objectiveKey = (id: number) => `acct:${id}`;
export const accountIdFromKey = (key: string) => Number(key.split(":")[1]);

export type AccountMeta = { id: number; username: string; difficulty: Difficulty };

// Métadonnées publiques (l'ordre fixe les id). Le schéma et le mot de passe
// correspondants vivent dans accounts.ts, côté serveur uniquement.
// difficulté : 1 Facile · 2 Moyen · 3 Difficile.
const NAMES_D1 = ["alice", "bob", "carol", "dave", "erin", "frank", "grace", "heidi", "ivan", "judy", "karl", "laura", "mallory", "niaj"];
const NAMES_D2 = ["olivia", "peggy", "quentin", "rupert", "sybil", "trent", "ursula", "victor", "walter", "xena", "yusuf", "zoe", "arthur", "bianca", "colin", "denise"];
const NAMES_D3 = ["elliot", "farah", "gustav", "helena", "igor", "jamal", "kira", "liam", "mona", "nadia"];

export const ACCOUNT_META: AccountMeta[] = [
  ...NAMES_D1.map((username) => ({ username, difficulty: 1 as Difficulty })),
  ...NAMES_D2.map((username) => ({ username, difficulty: 2 as Difficulty })),
  ...NAMES_D3.map((username) => ({ username, difficulty: 3 as Difficulty })),
].map((a, i) => ({ id: i + 1, ...a }));

export const OBJECTIVE_KEYS = ACCOUNT_META.map((a) => objectiveKey(a.id));

export function pointsForObjective(key: string) {
  const a = ACCOUNT_META.find((m) => m.id === accountIdFromKey(key));
  return a ? DIFFICULTY_POINTS[a.difficulty] : 0;
}
