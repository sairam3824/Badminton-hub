import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const deleteCommentSchema = z.object({
  commentId: z.string().min(1),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const match = await db.match.findUnique({ where: { id: params.id } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: match.teamId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  if (content.length > 500) return NextResponse.json({ error: "Comment too long" }, { status: 400 });

  const comment = await db.comment.create({
    data: { matchId: params.id, userId: session.user.id, content: content.trim() },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ comment }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = deleteCommentSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { commentId } = parsed.data;

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    include: { match: true },
  });

  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  if (comment.matchId !== params.id) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: comment.match.teamId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (comment.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}
