# imphackt — CTF

Plateforme de challenges, connexion (facultative) via Rezel Connect. Pas de score global :
un challenge peut proposer son propre classement.

- **Stack** : Next.js 15 (App Router, TypeScript), Auth.js v5 (OIDC), SQLite (better-sqlite3).
- **Lancer** : `npm install` puis `npm run dev` → http://localhost:3000
- **Config** : `.env` (REZEL_CLIENT_ID, REZEL_CLIENT_SECRET, REZEL_ISSUER, REZEL_SCOPES) et `.env.local` (AUTH_SECRET, AUTH_URL).
  L'URL de callback à déclarer chez Rezel Connect est `<AUTH_URL>/api/auth/callback/rezel`.

## Organisation

- `app/` — pages (accueil, challenges) et routes API
- `lib/progress.ts` — progression : en base si connecté (`data/imphackt.db`), sinon cookie de session
- `lib/players.ts` — joueurs (identifiés par leur nom d'utilisateur Rezel)
- `lib/challenges/registry.ts` — liste des challenges affichés sur l'accueil
- `lib/challenges/netsphere/` — challenge 1 (injections SQL, 3 niveaux) ; les requêtes
  tournent côté serveur dans `sandbox.cjs`, un processus à part tué au bout de 2 s
- `legacy/` — ancienne version HTML et notes de solution
