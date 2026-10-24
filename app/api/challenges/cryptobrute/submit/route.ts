import { NextResponse } from "next/server";
import { currentPlayer } from "@/auth";
import { verifyPassword } from "@/lib/challenges/cryptobrute/accounts";
import { ACCOUNT_META, CHALLENGE_ID, objectiveKey } from "@/lib/challenges/cryptobrute/shared";
import { addProgress, getProgress } from "@/lib/progress";

// Interface de connexion commune : le joueur fournit un identifiant et le mot de
// passe qu'il a retrouvé. On vérifie le couple comme le ferait le vrai service.
// Challenge réservé aux joueurs connectés.
export async function POST(req: Request) {
  if (!(await currentPlayer())) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
  const username = String(body?.username ?? "").trim();
  const account = ACCOUNT_META.find((a) => a.username === username);

  const before = await getProgress(CHALLENGE_ID);
  const correct = !!account && verifyPassword(account.id, String(body?.password ?? ""));
  const key = account ? objectiveKey(account.id) : "";
  const solved = correct ? await addProgress(CHALLENGE_ID, [key]) : before;

  return NextResponse.json({
    correct,
    unknownUser: !account,
    solvedId: correct ? account!.id : null,
    solved: [...solved],
    newlySolved: correct && !before.has(key),
  });
}
