import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSetWinner, getMatchWinner } from "@/lib/utils";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const match = await db.match.findUnique({
    where: { id: params.id },
    include: { sets: { orderBy: { setNumber: "asc" } } },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId: match.teamId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (match.status === "COMPLETED" || match.status === "CANCELLED") {
    return NextResponse.json({ error: "Match is already finished" }, { status: 400 });
  }

  const { setNumber, side1Score, side2Score } = await req.json();

  if (!Number.isInteger(setNumber) || setNumber < 1 || setNumber > 3) {
    return NextResponse.json({ error: "setNumber must be an integer between 1 and 3" }, { status: 400 });
  }

  // Validate scores
  if (!Number.isInteger(side1Score) || !Number.isInteger(side2Score)) {
    return NextResponse.json({ error: "Invalid scores" }, { status: 400 });
  }
  if (side1Score < 0 || side2Score < 0 || side1Score > 30 || side2Score > 30) {
    return NextResponse.json({ error: "Scores must be between 0 and 30" }, { status: 400 });
  }

  const currentIncompleteSet = match.sets.find((s) => !s.isComplete);
  const maxExistingSetNumber =
    match.sets.length > 0 ? Math.max(...match.sets.map((s) => s.setNumber)) : 0;
  const expectedSetNumber = currentIncompleteSet?.setNumber ?? maxExistingSetNumber + 1;
  if (expectedSetNumber > 3) {
    return NextResponse.json({ error: "All sets for this match are already complete" }, { status: 400 });
  }
  if (setNumber !== expectedSetNumber) {
    return NextResponse.json({ error: `Only set ${expectedSetNumber} can be updated right now` }, { status: 400 });
  }

  // Get or create the set
  let currentSet = match.sets.find((s) => s.setNumber === setNumber);
  if (currentSet?.isComplete) {
    return NextResponse.json({ error: `Set ${setNumber} is already complete` }, { status: 400 });
  }
  if (!currentSet) {
    currentSet = await db.set.create({
      data: { matchId: params.id, setNumber, side1Score: 0, side2Score: 0 },
    });
  }

  // Auto-transition SCHEDULED → LIVE when scoring starts
  if (match.status === "SCHEDULED") {
    await db.match.update({ where: { id: params.id }, data: { status: "LIVE" } });
  }

  // Determine winner
  const winner = getSetWinner(side1Score, side2Score);
  const isComplete = winner !== null;

  // Update the set
  const updatedSet = await db.set.update({
    where: { id: currentSet.id },
    data: {
      side1Score,
      side2Score,
      isComplete,
      winningSide: winner,
      completedAt: isComplete ? new Date() : null,
    },
  });

  // Check for match winner
  if (isComplete) {
    const allSets = await db.set.findMany({
      where: { matchId: params.id },
      orderBy: { setNumber: "asc" },
    });

    const matchWinner = getMatchWinner(
      allSets.map((s) => ({ winningSide: s.winningSide, isComplete: s.isComplete }))
    );

    if (matchWinner) {
      await db.match.update({
        where: { id: params.id },
        data: { status: "COMPLETED", winningSide: matchWinner },
      });
    } else {
      // Create next set if match not over (best of 3)
      const maxSetNumber = allSets.length > 0 ? Math.max(...allSets.map((s) => s.setNumber)) : 0;
      const nextSetNumber = maxSetNumber + 1;
      const nextSetExists = allSets.some((s) => s.setNumber === nextSetNumber);
      if (nextSetNumber <= 3 && !nextSetExists) {
        await db.set.create({
          data: { matchId: params.id, setNumber: nextSetNumber, side1Score: 0, side2Score: 0 },
        });
      }
    }
  }

  const updatedMatch = await db.match.findUnique({
    where: { id: params.id },
    include: {
      sets: { orderBy: { setNumber: "asc" } },
      players: { include: { player: { include: { teamMember: { include: { user: true } } } } }, orderBy: [{ side: "asc" }, { position: "asc" }] },
      venue: true,
      comments: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({ match: updatedMatch, set: updatedSet });
}
