"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { PublicAccount } from "@/lib/challenges/cryptobrute/accounts";
import { DIFFICULTY_LABEL, DIFFICULTY_POINTS, objectiveKey } from "@/lib/challenges/cryptobrute/shared";

export function CrackPanel({ accounts, initialSolved }: { accounts: PublicAccount[]; initialSolved: string[] }) {
  const router = useRouter();
  const [solved, setSolved] = useState(new Set(initialSolved));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pending, setPending] = useState(false);

  const total = accounts.reduce((s, a) => s + DIFFICULTY_POINTS[a.difficulty], 0);
  const earned = accounts
    .filter((a) => solved.has(objectiveKey(a.id)))
    .reduce((s, a) => s + DIFFICULTY_POINTS[a.difficulty], 0);
  const doneCount = accounts.filter((a) => solved.has(objectiveKey(a.id))).length;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setPending(true);
    try {
      const res = await fetch("/api/challenges/cryptobrute/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? res.statusText);
      const data = (await res.json()) as {
        correct: boolean;
        unknownUser: boolean;
        solvedId: number | null;
        solved: string[];
        newlySolved: boolean;
      };
      setSolved(new Set(data.solved));
      if (data.correct) {
        const pts = accounts.find((a) => a.id === data.solvedId)?.difficulty ?? 1;
        setFeedback({
          ok: true,
          msg: data.newlySolved ? `Accès accordé à ${username} ! +${DIFFICULTY_POINTS[pts]} points` : `Compte ${username} déjà résolu.`,
        });
        setPassword("");
        if (data.newlySolved) router.refresh();
      } else {
        setFeedback({ ok: false, msg: data.unknownUser ? "Identifiant inconnu." : "Mot de passe incorrect." });
      }
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : String(err) });
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <form className="cb-login" onSubmit={submit} autoComplete="off">
        <div className="cb-login-head">Connexion</div>
        <div className="cb-login-fields">
          <input
            type="text"
            placeholder="Identifiant"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            spellCheck={false}
          />
          <input
            type="text"
            placeholder="Mot de passe en clair"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            spellCheck={false}
          />
          <button type="submit" disabled={pending}>
            {pending ? "…" : "Se connecter"}
          </button>
        </div>
        {feedback && <div className={feedback.ok ? "cb-fb ok" : "cb-fb err"}>{feedback.msg}</div>}
      </form>

      <div className="cb-progress">
        {doneCount}/{accounts.length} comptes · {earned}/{total} points
      </div>

      <table className="cb-creds">
        <thead>
          <tr>
            <th>Identifiant</th>
            <th>Mot de passe (obfusqué)</th>
            <th>Difficulté</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => {
            const done = solved.has(objectiveKey(a.id));
            return (
              <tr key={a.id} className={done ? "done" : undefined} onClick={() => setUsername(a.username)}>
                <td className="user">{a.username}</td>
                <td>
                  <code>{a.cipher}</code>
                </td>
                <td>
                  <span className={`cb-diff d${a.difficulty}`}>{DIFFICULTY_LABEL[a.difficulty]}</span>
                </td>
                <td className="status">{done ? "✓ résolu" : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="cb-hint">Astuce : cliquez sur une ligne pour reporter l’identifiant dans le formulaire.</p>
    </section>
  );
}
