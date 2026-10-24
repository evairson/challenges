import { OBJECTIVE_KEYS as CRYPTOBRUTE_OBJECTIVES } from "./cryptobrute/shared";
import { LEVELS, OBJECTIVES, objectiveKey } from "./netsphere/objectives";

export type ChallengeInfo = {
  id: string;
  title: string;
  topic: string;
  description: string;
  href: string;
  /** Clés de tous les objectifs du challenge (sert à valider la progression stockée). */
  objectives: string[];
};

// Liste des challenges affichés sur l'accueil. Ajouter les prochains ici.
// Aucun score global : un challenge qui veut un classement le gère dans ses propres pages.
export const CHALLENGES: ChallengeInfo[] = [
  {
    id: "netsphere",
    title: "NetSphère",
    topic: "Web · Injection SQL",
    description:
      "Un hébergeur propose trois espaces de connexion. Leur développeur jure qu'ils sont sûrs… à vous de prouver le contraire.",
    href: "/challenges/netsphere",
    objectives: LEVELS.flatMap((l) => [...OBJECTIVES[l].core, ...OBJECTIVES[l].bonus].map((o) => objectiveKey(l, o.id))),
  },
  {
    id: "cryptobrute",
    title: "Base de données fuitée",
    topic: "Cryptographie · Brute force",
    description:
      "Une base de comptes a fuité. Chaque mot de passe est obfusqué différemment : identifiez le chiffrement ou le hash, retrouvez le mot de passe, et grimpez au classement.",
    href: "/challenges/cryptobrute",
    objectives: CRYPTOBRUTE_OBJECTIVES,
  },
];

export const challengeById = (id: string) => CHALLENGES.find((c) => c.id === id);
