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

  // Get all completed matches for the team
  const matches = await db.match.findMany({
    where: { teamId, status: "COMPLETED" },
    include: {
      players: {
        include: {
          player: true,
        },
      },
      sets: { orderBy: { setNumber: "asc" } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  // Get all players
  const players = await db.player.findMany({
    where: { teamId },
    include: { teamMember: { include: { user: { select: { name: true, email: true } } } } },
  });

  // Compute per-player stats
  const playerStats = players.map((player) => {
    const playerMatches = matches.filter((m) =>
      m.players.some((mp) => mp.playerId === player.id)
    );

    const wins = playerMatches.filter((m) => {
      const mp = m.players.find((p) => p.playerId === player.id);
      return mp && m.winningSide === mp.side;
    });

    const losses = playerMatches.filter((m) => {
      const mp = m.players.find((p) => p.playerId === player.id);
      return mp && m.winningSide !== null && m.winningSide !== mp.side;
    });

    const singlesMatches = playerMatches.filter((m) => m.type === "SINGLES");
    const doublesMatches = playerMatches.filter((m) => m.type === "DOUBLES");

    const singlesWins = wins.filter((m) => m.type === "SINGLES").length;
    const doublesWins = wins.filter((m) => m.type === "DOUBLES").length;

    // Compute sets won/lost
    let setsWon = 0;
    let setsLost = 0;
    let pointsScored = 0;
    let pointsConceded = 0;

    playerMatches.forEach((m) => {
      const mp = m.players.find((p) => p.playerId === player.id);
      if (!mp) return;
      const side = mp.side;
      m.sets.forEach((s) => {
        if (!s.isComplete) return;
        if (side === 1) {
          if (s.winningSide === 1) setsWon++;
          else setsLost++;
          pointsScored += s.side1Score;
          pointsConceded += s.side2Score;
        } else {
          if (s.winningSide === 2) setsWon++;
          else setsLost++;
          pointsScored += s.side2Score;
          pointsConceded += s.side1Score;
        }
      });
    });

    const winRate = playerMatches.length > 0 ? Math.round((wins.length / playerMatches.length) * 100) : 0;

    return {
      player: {
        id: player.id,
        displayName: player.displayName,
        skillLevel: player.skillLevel,
        avatar: player.avatar,
      },
      totalMatches: playerMatches.length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      singlesMatches: singlesMatches.length,
      singlesWins,
      doublesMatches: doublesMatches.length,
      doublesWins,
      setsWon,
      setsLost,
      pointsScored,
      pointsConceded,
    };
  });

  // Sort by wins desc, then winRate desc
  playerStats.sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);

  // Head-to-head matrix (singles only)
  const h2h: Record<string, Record<string, { wins: number; losses: number }>> = {};
  for (const p of players) {
    h2h[p.id] = {};
    for (const q of players) {
      if (p.id !== q.id) h2h[p.id][q.id] = { wins: 0, losses: 0 };
    }
  }

  matches
    .filter((m) => m.type === "SINGLES" && m.winningSide)
    .forEach((m) => {
      const side1Player = m.players.find((p) => p.side === 1);
      const side2Player = m.players.find((p) => p.side === 2);
      if (!side1Player || !side2Player) return;

      if (m.winningSide === 1) {
        if (h2h[side1Player.playerId]?.[side2Player.playerId]) {
          h2h[side1Player.playerId][side2Player.playerId].wins++;
          h2h[side2Player.playerId][side1Player.playerId].losses++;
        }
      } else {
        if (h2h[side2Player.playerId]?.[side1Player.playerId]) {
          h2h[side2Player.playerId][side1Player.playerId].wins++;
          h2h[side1Player.playerId][side2Player.playerId].losses++;
        }
      }
    });

  // Monthly match trend (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentMatches = matches.filter((m) => new Date(m.scheduledAt) >= sixMonthsAgo);

  const monthlyData: Record<string, { month: string; matches: number; singles: number; doubles: number }> = {};
  recentMatches.forEach((m) => {
    const month = new Date(m.scheduledAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (!monthlyData[month]) monthlyData[month] = { month, matches: 0, singles: 0, doubles: 0 };
    monthlyData[month].matches++;
    if (m.type === "SINGLES") monthlyData[month].singles++;
    else monthlyData[month].doubles++;
  });

  return NextResponse.json({
    playerStats,
    h2h,
    monthlyTrend: Object.values(monthlyData),
    totalMatches: matches.length,
    totalSingles: matches.filter((m) => m.type === "SINGLES").length,
    totalDoubles: matches.filter((m) => m.type === "DOUBLES").length,
  });
}
