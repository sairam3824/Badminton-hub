import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const createMatchSchema = z.object({
  teamId: z.string(),
  venueId: z.string().optional(),
  type: z.enum(["SINGLES", "DOUBLES"]),
  scheduledAt: z.string(),
  notes: z.string().max(500).optional(),
  players: z.array(
    z.object({
      playerId: z.string(),
      side: z.number().min(1).max(2),
      position: z.number().min(1).max(2),
    })
  ),
});

async function requireTeamMember(userId: string, teamId: string) {
  return db.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createMatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { teamId, venueId, type, scheduledAt, notes, players } = parsed.data;
  const membership = await requireTeamMember(session.user.id, teamId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: "Invalid scheduled date/time" }, { status: 400 });
  }

  // Validate player counts
  const expectedPlayers = type === "SINGLES" ? 2 : 4;
  if (players.length !== expectedPlayers) {
    return NextResponse.json({ error: `${type === "SINGLES" ? "Singles" : "Doubles"} requires ${expectedPlayers} players` }, { status: 400 });
  }
  const maxPerSide = type === "SINGLES" ? 1 : 2;
  const side1Players = players.filter((player) => player.side === 1);
  const side2Players = players.filter((player) => player.side === 2);
  if (side1Players.length !== maxPerSide || side2Players.length !== maxPerSide) {
    return NextResponse.json(
      { error: `${type === "SINGLES" ? "Singles" : "Doubles"} requires ${maxPerSide} player${maxPerSide > 1 ? "s" : ""} per side` },
      { status: 400 }
    );
  }
  if (players.some((player) => player.position > maxPerSide)) {
    return NextResponse.json({ error: "Invalid player position for selected match type" }, { status: 400 });
  }
  const side1Positions = new Set(side1Players.map((player) => player.position));
  const side2Positions = new Set(side2Players.map((player) => player.position));
  if (side1Positions.size !== maxPerSide || side2Positions.size !== maxPerSide) {
    return NextResponse.json({ error: "Duplicate player positions on the same side are not allowed" }, { status: 400 });
  }

  const playerIds = players.map((player) => player.playerId);
  const uniquePlayerIds = new Set(playerIds);
  if (uniquePlayerIds.size !== playerIds.length) {
    return NextResponse.json({ error: "Duplicate players are not allowed in a match" }, { status: 400 });
  }

  const teamPlayers = await db.player.findMany({
    where: { teamId, id: { in: Array.from(uniquePlayerIds) } },
    select: { id: true },
  });
  if (teamPlayers.length !== uniquePlayerIds.size) {
    return NextResponse.json({ error: "All selected players must belong to the active team" }, { status: 400 });
  }

  if (venueId) {
    const venue = await db.venue.findFirst({
      where: { id: venueId, teamId },
      select: { id: true },
    });
    if (!venue) {
      return NextResponse.json({ error: "Selected venue does not belong to this team" }, { status: 400 });
    }
  }

  const match = await db.match.create({
    data: {
      teamId,
      venueId: venueId || null,
      type,
      scheduledAt: scheduledDate,
      notes: notes || null,
      players: { create: players },
      sets: {
        create: [{ setNumber: 1, side1Score: 0, side2Score: 0 }],
      },
    },
    include: {
      players: { include: { player: true } },
      sets: true,
      venue: true,
    },
  });

  return NextResponse.json({ match }, { status: 201 });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

  const membership = await requireTeamMember(session.user.id, teamId);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const where: Record<string, unknown> = { teamId };
  if (status) where.status = status;

  const matches = await db.match.findMany({
    where,
    include: {
      players: {
        include: { player: { include: { teamMember: { include: { user: true } } } } },
        orderBy: [{ side: "asc" }, { position: "asc" }],
      },
      sets: { orderBy: { setNumber: "asc" } },
      venue: true,
    },
    orderBy: { scheduledAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ matches });
}
