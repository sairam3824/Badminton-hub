import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateInviteCode } from "@/lib/utils";

const createTeamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters").max(50),
  description: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { name, description } = parsed.data;
  const userId = session.user.id;

  try {
    let inviteCode = generateInviteCode();
    // Ensure uniqueness
    let existing = await db.team.findUnique({ where: { inviteCode } });
    while (existing) {
      inviteCode = generateInviteCode();
      existing = await db.team.findUnique({ where: { inviteCode } });
    }

    const team = await db.team.create({
      data: {
        name,
        description,
        inviteCode,
        members: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
    });

    // Create player profile for the creator
    const member = await db.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId: team.id } },
      include: { user: true },
    });

    if (member) {
      await db.player.create({
        data: {
          teamId: team.id,
          teamMemberId: member.id,
          displayName: member.user.name,
          skillLevel: "INTERMEDIATE",
        },
      });
    }

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error("Create team error:", error);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await db.teamMember.findMany({
    where: { userId: session.user.id },
    include: {
      team: {
        include: { _count: { select: { members: true, matches: true } } },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({ teams: memberships.map((m) => ({ ...m.team, role: m.role })) });
}
