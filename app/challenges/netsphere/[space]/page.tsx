import { notFound } from "next/navigation";
import { CHALLENGE_ID, SPACES, type SpaceSlug } from "@/lib/challenges/netsphere/objectives";
import { getProgress } from "@/lib/progress";
import { LoginPanel } from "../LoginPanel";

export async function generateMetadata({ params }: { params: Promise<{ space: string }> }) {
  const { space } = await params;
  const s = SPACES[space as SpaceSlug];
  return s ? { title: `${s.name} — NetSphère` } : {};
}

export default async function SpacePage({ params }: { params: Promise<{ space: string }> }) {
  const { space } = await params;
  if (!(space in SPACES)) notFound();
  const solved = [...(await getProgress(CHALLENGE_ID))];
  return <LoginPanel slug={space as SpaceSlug} initialSolved={solved} />;
}
