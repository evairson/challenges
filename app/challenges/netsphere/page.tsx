import Link from "next/link";
import { SPACES, type SpaceSlug } from "@/lib/challenges/netsphere/objectives";

export const metadata = { title: "NetSphère — Connexion" };

export default function NetsphereHome() {
  return (
    <div className="menu">
      <h1>NetSphère</h1>
      <p>Choisissez votre espace de connexion</p>
      {(Object.keys(SPACES) as SpaceSlug[]).map((slug) => (
        <Link key={slug} href={`/challenges/netsphere/${slug}`}>
          {SPACES[slug].name}
          <span>{SPACES[slug].subtitle}</span>
        </Link>
      ))}
    </div>
  );
}
