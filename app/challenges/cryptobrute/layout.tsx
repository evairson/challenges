import { currentPlayer } from "@/auth";
import { SignInButton } from "@/components/TopBar";

// Ce challenge exige d'être connecté : la progression est enregistrée en base
// et le classement n'a de sens que pour des joueurs identifiés.
export default async function CryptobruteLayout({ children }: { children: React.ReactNode }) {
  const player = await currentPlayer();
  if (!player) {
    return (
      <main className="page">
        <h1>Base de données fuitée</h1>
        <p className="lead">Connectez-vous pour jouer à ce challenge et apparaître au classement.</p>
        <SignInButton big redirectTo="/challenges/cryptobrute" />
      </main>
    );
  }
  return <>{children}</>;
}
