// Définition publique du challenge NetSphère : partagée entre serveur et client,
// elle ne doit contenir aucune réponse.

export type Level = 1 | 2 | 3;
export type Objective = { id: string; d: 1 | 2 | 3; label: string };

export const CHALLENGE_ID = "netsphere";

export const SPACES = {
  client: {
    level: 1,
    name: "Espace client",
    title: "Espace client",
    subtitle: "Gérez vos hébergements et factures",
    intro: "Connectez-vous pour gérer votre compte.",
    userLabel: "Identifiant",
    submit: "Se connecter",
    queryHint: "SELECT * FROM users WHERE username = '…' AND password = '…'",
    forgot: true,
  },
  revendeur: {
    level: 2,
    name: "Espace revendeur",
    title: "Espace revendeur",
    subtitle: "Interface partenaires en marque blanche",
    intro: "Interface partenaires. Mots de passe chiffrés (SHA-256).",
    userLabel: "Identifiant revendeur",
    submit: "Se connecter",
    queryHint: "SELECT * FROM users WHERE password='…' AND username='…'",
    forgot: true,
  },
  admin: {
    level: 3,
    name: "Administration",
    title: "🔐 Administration",
    subtitle: "Accès réservé au personnel",
    intro:
      "Accès réservé. Protection anti-injection active : toute requête renvoyant plusieurs comptes est rejetée.",
    userLabel: "Nom d'utilisateur",
    submit: "Authentification",
    queryHint: "SELECT * FROM users WHERE password='…' AND username='…'",
    forgot: false,
  },
} as const satisfies Record<string, { level: Level } & Record<string, unknown>>;

export type SpaceSlug = keyof typeof SPACES;

/** Un objectif principal (core) par espace, puis des bonus débloqués une fois les 3 espaces validés. */
export const OBJECTIVES: Record<Level, { core: Objective[]; bonus: Objective[] }> = {
  1: {
    core: [
      { id: "login-admin", d: 1, label: "Se connecter en tant qu’admin" },
      { id: "db-error", d: 1, label: "Provoquer une erreur SQL (identifier la base)" },
    ],
    bonus: [
      { id: "list-tables", d: 3, label: "Lister les tables de la base" },
      { id: "get-secret", d: 3, label: "Récupérer la clé secrète" },
    ],
  },
  2: {
    core: [{ id: "login-any", d: 1, label: "Se connecter sans mot de passe valide" }],
    bonus: [
      { id: "list-tables", d: 3, label: "Lister les tables de la base" },
      { id: "get-secret", d: 3, label: "Récupérer la clé secrète" },
    ],
  },
  3: {
    core: [
      { id: "trigger-guard", d: 1, label: "Déclencher la protection anti-injection" },
      { id: "login-admin", d: 2, label: "Se connecter en admin (contourner le garde-fou)" },
    ],
    bonus: [{ id: "get-secret", d: 3, label: "Récupérer la clé secrète malgré le garde-fou" }],
  },
};

export const LEVELS: Level[] = [1, 2, 3];

export const objectiveKey = (level: Level, id: string) => `${level}:${id}`;

export function levelCoreDone(solved: Set<string> | string[], level: Level) {
  const s = solved instanceof Set ? solved : new Set(solved);
  return OBJECTIVES[level].core.every((o) => s.has(objectiveKey(level, o.id)));
}

export function levelsValidated(solved: Set<string> | string[]) {
  return LEVELS.filter((l) => levelCoreDone(solved, l)).length;
}
