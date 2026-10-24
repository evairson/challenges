import NextAuth from "next-auth";
import { playerExists, upsertPlayer } from "@/lib/players";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "rezel",
      name: "Rezel Connect",
      type: "oidc",
      issuer: process.env.REZEL_ISSUER,
      clientId: process.env.REZEL_CLIENT_ID,
      clientSecret: process.env.REZEL_CLIENT_SECRET,
      authorization: { params: { scope: process.env.REZEL_SCOPES ?? "openid profile email" } },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.preferred_username ?? profile.name ?? profile.email ?? profile.sub,
          email: profile.email ?? null,
        };
      },
    },
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    // Sans adapter, Auth.js tire un UUID aléatoire comme user.id à chaque connexion :
    // on identifie donc le joueur par son nom d'utilisateur Rezel, stable d'un appareil à l'autre.
    jwt({ token, account, profile }) {
      if (account && profile) {
        const username = (profile.preferred_username as string | undefined) ?? account.providerAccountId;
        token.sub = username;
        token.name = username;
        upsertPlayer(username, username, (profile.email as string | undefined) ?? null);
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

/** Joueur connecté, ou null. */
export async function currentPlayer() {
  const session = await auth();
  const id = session?.user?.id;
  // Une session dont le joueur n'existe pas (ancien identifiant aléatoire) vaut déconnexion.
  return id && playerExists(id) ? { id, name: session.user?.name ?? id } : null;
}
