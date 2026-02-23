import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }

      // Allow updating the active team via update session
      if (trigger === "update" && session?.activeTeamId !== undefined) {
        token.activeTeamId = session.activeTeamId;
        // Force teams to reload from DB so newly created/joined teams appear
        token.teams = undefined;
      }

      // Load teams on first login, or after a session update resets the cache
      if (token.id && !token.teams) {
        const memberships = await db.teamMember.findMany({
          where: { userId: token.id as string },
          include: { team: true },
          orderBy: { joinedAt: "asc" },
        });

        token.teams = memberships.map((m) => ({
          id: m.team.id,
          name: m.team.name,
          role: m.role,
          inviteCode: m.team.inviteCode,
        }));
      }

      // Ensure activeTeamId is always one of the user's memberships
      const teams = token.teams as
        | {
            id: string;
            name: string;
            role: string;
            inviteCode: string;
          }[]
        | undefined;
      if (teams && teams.length > 0) {
        const hasActiveTeam =
          typeof token.activeTeamId === "string" &&
          teams.some((team) => team.id === token.activeTeamId);
        if (!hasActiveTeam) {
          token.activeTeamId = teams[0].id;
        }
      } else {
        token.activeTeamId = null;
      }

      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
        },
        activeTeamId: token.activeTeamId as string | null,
        teams:
          (token.teams as {
            id: string;
            name: string;
            role: string;
            inviteCode: string;
          }[]) ?? [],
      };
    },
  },
};
