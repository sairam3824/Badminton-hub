import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const players = await db.player.findMany({
    where: { teamId },
    include: {
      teamMember: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      matchPlayers: {
        include: {
          match: {
            select: { id: true, type: true, status: true, winningSide: true, scheduledAt: true },
          },
        },
      },
    },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json({ players });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { playerId, displayName, skillLevel } = await req.json();
  if (!playerId) return NextResponse.json({ error: "playerId is required" }, { status: 400 });

  const player = await db.player.findUnique({
    where: { id: playerId },
    include: { teamMember: true },
  });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  // Only the player themselves or an admin can update
  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: player.teamId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isOwnProfile = player.teamMember.userId === session.user.id;
  const isAdmin = membership.role === "ADMIN";
  if (!isOwnProfile && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await db.player.update({
    where: { id: playerId },
    data: {
      ...(displayName && { displayName }),
      ...(skillLevel && { skillLevel }),
    },
  });

  return NextResponse.json({ player: updated });
}
