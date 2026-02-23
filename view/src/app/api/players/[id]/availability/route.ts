import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const player = await db.player.findUnique({ where: { id: params.id } });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: player.teamId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const availability = await db.availability.findMany({
    where: { playerId: params.id },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ availability });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const player = await db.player.findUnique({
    where: { id: params.id },
    include: { teamMember: true },
  });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  if (player.teamMember.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only set your own availability" }, { status: 403 });
  }

  const { date, status, notes } = await req.json();
  if (!date || !status) return NextResponse.json({ error: "date and status are required" }, { status: 400 });
  if (!["AVAILABLE", "UNAVAILABLE", "MAYBE"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const availability = await db.availability.upsert({
    where: { playerId_date: { playerId: params.id, date: new Date(date) } },
    update: { status, notes },
    create: {
      playerId: params.id,
      userId: session.user.id,
      date: new Date(date),
      status,
      notes,
    },
  });

  return NextResponse.json({ availability });
}
