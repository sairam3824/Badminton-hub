import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateMemberSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(["ADMIN", "MEMBER"]),
});

const deleteMemberSchema = z.object({
  memberId: z.string().min(1),
});

async function requireTeamAdmin(userId: string, teamId: string) {
  const member = await db.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  if (!member || member.role !== "ADMIN") return null;
  return member;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: params.id } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const members = await db.teamMember.findMany({
    where: { teamId: params.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      player: true,
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({ members });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await requireTeamAdmin(session.user.id, params.id);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateMemberSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { memberId, role } = parsed.data;

  const memberInTeam = await db.teamMember.findFirst({
    where: { id: memberId, teamId: params.id },
  });
  if (!memberInTeam) {
    return NextResponse.json({ error: "Member not found in this team" }, { status: 404 });
  }

  // Prevent demoting the final admin in the team
  if (memberInTeam.role === "ADMIN" && role === "MEMBER") {
    const adminCount = await db.teamMember.count({
      where: { teamId: params.id, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 });
    }
  }

  const member = await db.teamMember.update({
    where: { id: memberInTeam.id },
    data: { role },
  });

  return NextResponse.json({ member });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = deleteMemberSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { memberId } = parsed.data;

  const requester = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: params.id } },
  });
  if (!requester) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const memberToRemove = await db.teamMember.findFirst({
    where: { id: memberId, teamId: params.id },
  });
  if (!memberToRemove) {
    return NextResponse.json({ error: "Member not found in this team" }, { status: 404 });
  }

  const isSelfRemoval = memberToRemove.userId === session.user.id;
  if (!isSelfRemoval && requester.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Prevent removing last admin
  if (memberToRemove.role === "ADMIN") {
    const adminCount = await db.teamMember.count({ where: { teamId: params.id, role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 });
    }
  }

  await db.teamMember.delete({ where: { id: memberToRemove.id } });
  return NextResponse.json({ success: true });
}
