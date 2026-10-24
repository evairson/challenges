import { NextResponse } from "next/server";
import { attempt, objectivesReached } from "@/lib/challenges/netsphere/engine";
import { CHALLENGE_ID, objectiveKey, type Level } from "@/lib/challenges/netsphere/objectives";
import { addProgress, getProgress } from "@/lib/progress";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { level?: unknown; username?: unknown; password?: unknown } | null;
  const level = Number(body?.level);
  if (![1, 2, 3].includes(level)) return NextResponse.json({ error: "Niveau invalide" }, { status: 400 });

  const { result, ctx } = await attempt(level as Level, String(body?.username ?? ""), String(body?.password ?? ""));

  const before = await getProgress(CHALLENGE_ID);
  const reached = objectivesReached(level as Level, ctx, before).map((o) => objectiveKey(level as Level, o.id));
  const solved = await addProgress(CHALLENGE_ID, reached);

  return NextResponse.json({
    result,
    solved: [...solved],
    newlySolved: reached.filter((k) => !before.has(k)),
  });
}
