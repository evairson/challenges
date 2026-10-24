"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { AttemptResult } from "@/lib/challenges/netsphere/engine";
import {
  LEVELS,
  OBJECTIVES,
  SPACES,
  levelsValidated,
  objectiveKey,
  type Objective,
  type SpaceSlug,
} from "@/lib/challenges/netsphere/objectives";

const DIFF = ["", "Facile", "Moyen", "Difficile"];

function labelOf(key: string) {
  const [level, id] = key.split(":");
  const spec = OBJECTIVES[Number(level) as 1 | 2 | 3];
  return [...spec.core, ...spec.bonus].find((o) => o.id === id)?.label ?? key;
}

export function LoginPanel({ slug, initialSolved }: { slug: SpaceSlug; initialSolved: string[] }) {
  const space = SPACES[slug];
  const level = space.level;

  const [solved, setSolved] = useState(new Set(initialSolved));
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [justSolved, setJustSolved] = useState<string[]>([]);
  const [showQuery, setShowQuery] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    try {
      const res = await fetch("/api/challenges/netsphere/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, username: form.get("username"), password: form.get("password") }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? res.statusText);
      const data = (await res.json()) as {
        result: AttemptResult;
        solved: string[];
        newlySolved: string[];
      };
      setResult(data.result);
      setSolved(new Set(data.solved));
      setJustSolved(data.newlySolved);
    } catch (err) {
      setResult({ kind: "blocked", query: "", reason: err instanceof Error ? err.message : String(err) });
      setJustSolved([]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stage">
      <div className="card">
        <div className="head">{space.title}</div>
        <div className="body">
          <p className="intro">{space.intro}</p>
          <form onSubmit={submit} autoComplete="off">
            <label htmlFor="u">{space.userLabel}</label>
            <input type="text" name="username" id="u" />
            <label htmlFor="p">Mot de passe</label>
            <input type="password" name="password" id="p" />
            <button type="submit" className="submit" disabled={pending}>
              {pending ? "Connexion…" : space.submit}
            </button>
          </form>
          <div className="links">
            <Link href="/challenges/netsphere">← Autres espaces</Link>
            {space.forgot && (
              <>
                {" · "}
                <span style={{ color: "#bbb" }}>Mot de passe oublié ?</span>
              </>
            )}
          </div>
          {result && <Outcome result={result} />}
          {justSolved.length > 0 && (
            <div className="note gain">
              ✓ {justSolved.length > 1 ? "Objectifs validés" : "Objectif validé"} :{" "}
              {justSolved.map((k) => labelOf(k)).join(", ")}
            </div>
          )}
          <div className="debug">
            <a onClick={() => setShowQuery((v) => !v)}>
              {showQuery ? "Masquer l'aide" : "Aide : afficher la requête"}
            </a>
          </div>
          {showQuery && <pre className="q">{result?.query || space.queryHint}</pre>}
        </div>
      </div>
      <Goals level={level} solved={solved} />
    </div>
  );
}

function Outcome({ result }: { result: AttemptResult }) {
  switch (result.kind) {
    case "blocked":
      return (
        <div className="out">
          <div className="note err">
            <b>Requête refusée par le serveur.</b> {result.reason}.
          </div>
        </div>
      );
    case "error":
      return (
        <div className="out">
          <div className="php-warn">
            <b>Warning</b>: SQLite3::query(): {result.message} in <b>/var/www/netsphere/includes/auth.php</b> on
            line <b>42</b>
          </div>
          <div className="note err">Une erreur est survenue lors de la connexion. Veuillez réessayer.</div>
        </div>
      );
    case "guard":
      return (
        <div className="out">
          <div className="note err">
            <b>Accès refusé.</b> La requête a renvoyé {result.count} comptes ; par sécurité, l’authentification est
            annulée.
          </div>
        </div>
      );
    case "fail":
      return (
        <div className="out">
          <div className="note err">
            <b>Échec de la connexion.</b> Identifiant ou mot de passe incorrect.
          </div>
        </div>
      );
    case "success":
      return (
        <div className="out">
          <div className="note win">
            <b>Connexion réussie.</b> Bienvenue, {result.who}. Vous êtes connecté à votre espace.
          </div>
          <table className="data">
            <thead>
              <tr>
                {result.columns.map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((v, j) => (
                    <td key={j}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function Goals({ level, solved }: { level: 1 | 2 | 3; solved: Set<string> }) {
  const { core, bonus } = OBJECTIVES[level];
  const done = (o: Objective) => solved.has(objectiveKey(level, o.id));
  const validated = levelsValidated(solved);
  const row = (o: Objective) => (
    <div key={o.id} className={done(o) ? "goal ok" : "goal"}>
      <span className="mk">{done(o) ? "✓" : "○"}</span>
      <span className="lb">{o.label}</span>
      <span className={`diff d${o.d}`}>{DIFF[o.d]}</span>
    </div>
  );

  return (
    <div className="goals">
      <div className="goals-head">
        {core.length > 1 ? "Objectifs" : "Objectif"}{" "}
        <span className="prog">
          {core.filter(done).length}/{core.length}
        </span>
      </div>
      {core.map(row)}
      {bonus.length > 0 &&
        (validated === LEVELS.length ? (
          <>
            <div className="unlocked">
              ✦ Autres possibilités débloquées{" "}
              <span className="prog">
                {bonus.filter(done).length}/{bonus.length}
              </span>
            </div>
            {bonus.map(row)}
          </>
        ) : (
          <div className="locked">
            🔒 Validez les 3 espaces ({validated}/3) pour débloquer d’autres possibilités.
          </div>
        ))}
    </div>
  );
}
