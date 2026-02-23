import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

interface PlayerStat {
  id: string;
  displayName: string;
  skillLevel: string;
  wins: number;
  matches: number;
  winRate: number;
}

function generatePairingSuggestions(players: PlayerStat[], availablePlayerIds: string[]) {
  const available = players.filter((p) => availablePlayerIds.includes(p.id));
  if (available.length < 4) return { suggestions: [], message: "Need at least 4 available players for doubles suggestions." };

  // Score compatibility: similar skill levels, balance win rates
  const skillScore = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 };

  const combinations: {
    pair1: [PlayerStat, PlayerStat];
    pair2: [PlayerStat, PlayerStat];
    balance: number;
  }[] = [];

  // Generate all valid pair combinations
  for (let i = 0; i < available.length - 1; i++) {
    for (let j = i + 1; j < available.length; j++) {
      const pair1: [PlayerStat, PlayerStat] = [available[i], available[j]];
      const remaining = available.filter((_, idx) => idx !== i && idx !== j);

      for (let k = 0; k < remaining.length - 1; k++) {
        for (let l = k + 1; l < remaining.length; l++) {
          const pair2: [PlayerStat, PlayerStat] = [remaining[k], remaining[l]];

          // Compute balance score
          const pair1Skill = (skillScore[pair1[0].skillLevel as keyof typeof skillScore] || 2) +
            (skillScore[pair1[1].skillLevel as keyof typeof skillScore] || 2);
          const pair2Skill = (skillScore[pair2[0].skillLevel as keyof typeof skillScore] || 2) +
            (skillScore[pair2[1].skillLevel as keyof typeof skillScore] || 2);

          const pair1WinRate = (pair1[0].winRate + pair1[1].winRate) / 2;
          const pair2WinRate = (pair2[0].winRate + pair2[1].winRate) / 2;

          const skillBalance = Math.abs(pair1Skill - pair2Skill);
          const winRateBalance = Math.abs(pair1WinRate - pair2WinRate);
          const balance = skillBalance * 10 + winRateBalance;

          combinations.push({ pair1, pair2, balance });
        }
      }
    }
  }

  // Sort by best balance (lowest = most balanced)
  combinations.sort((a, b) => a.balance - b.balance);

  const topSuggestions = combinations.slice(0, 3).map((c, i) => ({
    rank: i + 1,
    pair1: c.pair1.map((p) => ({ id: p.id, name: p.displayName, skillLevel: p.skillLevel, winRate: p.winRate })),
    pair2: c.pair2.map((p) => ({ id: p.id, name: p.displayName, skillLevel: p.skillLevel, winRate: p.winRate })),
    balanceScore: Math.round(100 - Math.min(c.balance, 100)),
    reason: c.balance < 5 ? "Highly balanced match" : c.balance < 15 ? "Well-balanced match" : "Playable match",
  }));

  return { suggestions: topSuggestions };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId, availablePlayerIds } = await req.json();
  if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get player stats
  const players = await db.player.findMany({ where: { teamId } });
  const matches = await db.match.findMany({
    where: { teamId, status: "COMPLETED" },
    include: { players: true },
  });

  const playerStats: PlayerStat[] = players.map((player) => {
    const playerMatches = matches.filter((m) => m.players.some((mp) => mp.playerId === player.id));
    const wins = playerMatches.filter((m) => {
      const mp = m.players.find((p) => p.playerId === player.id);
      return mp && m.winningSide === mp.side;
    });
    return {
      id: player.id,
      displayName: player.displayName,
      skillLevel: player.skillLevel,
      wins: wins.length,
      matches: playerMatches.length,
      winRate: playerMatches.length > 0 ? Math.round((wins.length / playerMatches.length) * 100) : 50,
    };
  });

  // Try OpenAI first if available
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && availablePlayerIds?.length >= 4) {
    try {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: openaiKey });

      const availablePlayers = playerStats.filter((p) => availablePlayerIds.includes(p.id));
      const prompt = `You are a badminton match organizer. Given these available players, suggest the top 3 balanced doubles pairings:

Players: ${availablePlayers.map((p) => `${p.displayName} (${p.skillLevel}, WR: ${p.winRate}%)`).join(", ")}

Return ONLY a JSON array with 3 objects like: [{"pair1": ["Name1", "Name2"], "pair2": ["Name3", "Name4"], "reason": "Why this is balanced"}]`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (content) {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const aiSuggestions = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ suggestions: aiSuggestions, source: "ai" });
        }
      }
    } catch (err) {
      console.error("OpenAI error, falling back to algorithm:", err);
    }
  }

  // Fallback to algorithmic suggestions
  const result = generatePairingSuggestions(
    playerStats,
    availablePlayerIds || players.map((p) => p.id)
  );
  return NextResponse.json({ ...result, source: "algorithm" });
}
