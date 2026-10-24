import { currentPlayer } from "@/auth";
import { publicAccounts } from "@/lib/challenges/cryptobrute/accounts";
import { CHALLENGE_ID, pointsForObjective } from "@/lib/challenges/cryptobrute/shared";
import { challengeLeaderboard, getProgress } from "@/lib/progress";
import { CrackPanel } from "./CrackPanel";
import "./cryptobrute.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Base de données fuitée — imphackt" };

export default async function CryptobrutePage() {
  const [player, solved, board] = [
    await currentPlayer(),
    [...(await getProgress(CHALLENGE_ID))],
    challengeLeaderboard(CHALLENGE_ID, pointsForObjective),
  ];

  return (
    <main className="page cb">
      <h1>Base de données fuitée</h1>
      <p className="lead">
        Une base de comptes a fuité. Pour chaque compte, le mot de passe est obfusqué par un chiffrement ou un hash
        différent. Identifiez la méthode, retrouvez le mot de passe en clair, puis soumettez-le. Les points dépendent
        de la difficulté.
      </p>

      <div className="cb-layout">
        <CrackPanel accounts={publicAccounts()} initialSolved={solved} />

        <aside className="cb-board">
          <h2>Classement</h2>
          <table className="scores">
            <thead>
              <tr>
                <th>#</th>
                <th>Joueur</th>
                <th className="num">Comptes</th>
                <th className="num">Points</th>
              </tr>
            </thead>
            <tbody>
              {board.map((r) => (
                <tr key={r.rank} className={r.name === player?.name ? "me" : undefined}>
                  <td>{r.rank}</td>
                  <td>{r.name}</td>
                  <td className="num">{r.solved}</td>
                  <td className="num">{r.points}</td>
                </tr>
              ))}
              {board.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    Personne au classement pour l’instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </aside>
      </div>
    </main>
  );
}
