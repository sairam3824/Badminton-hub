import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const venueSchema = z.object({
  teamId: z.string(),
  name: z.string().min(2).max(100),
  address: z.string().max(200).optional(),
  courts: z.number().min(1).max(20).default(1),
  notes: z.string().max(300).optional(),
});

async function requireTeamAdmin(userId: string, teamId: string) {
  const m = await db.teamMember.findUnique({ where: { userId_teamId: { userId, teamId } } });
  return m?.role === "ADMIN" ? m : null;
}

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

  const venues = await db.venue.findMany({
    where: { teamId },
    include: { _count: { select: { matches: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ venues });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = venueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { teamId, name, address, courts, notes } = parsed.data;
  const admin = await requireTeamAdmin(session.user.id, teamId);
  if (!admin) return NextResponse.json({ error: "Only team admins can add venues" }, { status: 403 });

  const venue = await db.venue.create({
    data: { teamId, name, address, courts, notes },
  });

  return NextResponse.json({ venue }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId, name, address, courts, notes } = await req.json();
  const venue = await db.venue.findUnique({ where: { id: venueId } });
  if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

  const admin = await requireTeamAdmin(session.user.id, venue.teamId);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await db.venue.update({
    where: { id: venueId },
    data: {
      ...(name && { name }),
      ...(address !== undefined && { address }),
      ...(courts && { courts }),
      ...(notes !== undefined && { notes }),
    },
  });

  return NextResponse.json({ venue: updated });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { venueId } = await req.json();
  const venue = await db.venue.findUnique({ where: { id: venueId } });
  if (!venue) return NextResponse.json({ error: "Venue not found" }, { status: 404 });

  const admin = await requireTeamAdmin(session.user.id, venue.teamId);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.venue.update({ where: { id: venueId }, data: { matches: { set: [] } } });
  await db.venue.delete({ where: { id: venueId } });

  return NextResponse.json({ success: true });
}
