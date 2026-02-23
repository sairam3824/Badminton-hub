import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const updateMatchSchema = z
  .object({
    status: z.enum(["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"]).optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .refine((data) => data.status !== undefined || data.notes !== undefined, {
    message: "Nothing to update",
  });

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const match = await db.match.findUnique({
    where: { id: params.id },
    include: {
      players: {
        include: { player: { include: { teamMember: { include: { user: true } } } } },
        orderBy: [{ side: "asc" }, { position: "asc" }],
      },
      sets: { orderBy: { setNumber: "asc" } },
      venue: true,
      comments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      team: true,
    },
  });

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: match.teamId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ match });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const match = await db.match.findUnique({ where: { id: params.id } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: match.teamId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateMatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid request" }, { status: 400 });
  }
  const { status, notes } = parsed.data;

  if (status !== undefined && membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Only team admins can change match status" }, { status: 403 });
  }

  const updated = await db.match.update({
    where: { id: params.id },
    data: {
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
    },
    include: {
      players: { include: { player: true } },
      sets: { orderBy: { setNumber: "asc" } },
      venue: true,
    },
  });

  return NextResponse.json({ match: updated });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const match = await db.match.findUnique({ where: { id: params.id } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: match.teamId } },
  });
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.match.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
