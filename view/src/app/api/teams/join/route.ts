import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { inviteCode } = await req.json();
  if (!inviteCode) return NextResponse.json({ error: "Invite code is required" }, { status: 400 });

  const userId = session.user.id;

  try {
    const team = await db.team.findUnique({ where: { inviteCode: inviteCode.trim().toUpperCase() } });
    if (!team) {
      return NextResponse.json({ error: "Invalid invite code. Team not found." }, { status: 404 });
    }

    const existingMember = await db.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId: team.id } },
    });

    if (existingMember) {
      return NextResponse.json({ error: "You are already a member of this team." }, { status: 409 });
    }

    const memberCount = await db.teamMember.count({ where: { teamId: team.id } });
    if (memberCount >= 10) {
      return NextResponse.json({ error: "This team has reached the maximum number of members." }, { status: 403 });
    }

    const member = await db.teamMember.create({
      data: { userId, teamId: team.id, role: "MEMBER" },
    });

    const user = await db.user.findUnique({ where: { id: userId } });
    if (user) {
      await db.player.create({
        data: {
          teamId: team.id,
          teamMemberId: member.id,
          displayName: user.name,
          skillLevel: "INTERMEDIATE",
        },
      });
    }

    return NextResponse.json({ team }, { status: 200 });
  } catch (error) {
    console.error("Join team error:", error);
    return NextResponse.json({ error: "Failed to join team" }, { status: 500 });
  }
}
