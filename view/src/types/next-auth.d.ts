import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    activeTeamId: string | null;
    teams: {
      id: string;
      name: string;
      role: string;
      inviteCode: string;
    }[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    activeTeamId?: string | null;
    teams?: {
      id: string;
      name: string;
      role: string;
      inviteCode: string;
    }[];
  }
}
