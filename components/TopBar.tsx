import Link from "next/link";
import { currentPlayer, signIn, signOut } from "@/auth";

export async function TopBar() {
  const player = await currentPlayer();
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        imp<span>hackt</span>
      </Link>
      <nav>
        <Link href="/">Challenges</Link>
      </nav>
      <div className="who">
        {player ? (
          <>
            <span className="name">{player.name}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="btn ghost">Déconnexion</button>
            </form>
          </>
        ) : (
          <SignInButton />
        )}
      </div>
    </header>
  );
}

export function SignInButton({ redirectTo = "/", big = false }: { redirectTo?: string; big?: boolean }) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("rezel", { redirectTo });
      }}
    >
      <button className={big ? "btn primary big" : "btn primary"}>Se connecter avec Rezel Connect</button>
    </form>
  );
}
