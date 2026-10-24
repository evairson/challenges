import Link from "next/link";
import { currentPlayer } from "@/auth";
import { CHALLENGES } from "@/lib/challenges/registry";
import { getProgress } from "@/lib/progress";

export default async function Home() {
  const player = await currentPlayer();
  const progress = await Promise.all(CHALLENGES.map((c) => getProgress(c.id)));

  return (
    <main className="page">
      <h1>Challenges</h1>
      <p className="lead">
        {player
          ? `Bonjour ${player.name}, votre progression est enregistrée sur votre compte.`
          : "Jouez librement : sans connexion, votre progression n’est gardée que pour cette session."}
      </p>
      <div className="grid">
        {CHALLENGES.map((c, i) => {
          const done = c.objectives.filter((k) => progress[i].has(k)).length;
          return (
            <Link key={c.id} href={c.href} className="chal">
              <div className="cat">{c.topic}</div>
              <h2>{c.title}</h2>
              <p>{c.description}</p>
              <div className="meta">
                <span className="got">
                  {done}/{c.objectives.length} objectifs
                </span>
              </div>
              <div className="bar">
                <div style={{ width: `${(100 * done) / c.objectives.length}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
