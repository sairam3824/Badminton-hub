import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data...");

  const password = await bcrypt.hash("password123", 12);

  // Demo users
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: { email: "alice@example.com", password, name: "Alice Chen" },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: { email: "bob@example.com", password, name: "Bob Kumar" },
  });

  const charlie = await prisma.user.upsert({
    where: { email: "charlie@example.com" },
    update: {},
    create: { email: "charlie@example.com", password, name: "Charlie Park" },
  });

  const diana = await prisma.user.upsert({
    where: { email: "diana@example.com" },
    update: {},
    create: { email: "diana@example.com", password, name: "Diana Lee" },
  });

  const evan = await prisma.user.upsert({
    where: { email: "evan@example.com" },
    update: {},
    create: { email: "evan@example.com", password, name: "Evan Torres" },
  });

  const frank = await prisma.user.upsert({
    where: { email: "frank@example.com" },
    update: {},
    create: { email: "frank@example.com", password, name: "Frank Wang" },
  });

  // Demo team
  const team = await prisma.team.upsert({
    where: { inviteCode: "DEMO-TEAM-001" },
    update: {},
    create: {
      name: "Smash Club",
      description: "Thursday evening badminton crew",
      inviteCode: "DEMO-TEAM-001",
    },
  });

  // Add members
  const users = [alice, bob, charlie, diana, evan, frank];
  const roles = ["ADMIN", "MEMBER", "MEMBER", "MEMBER", "MEMBER", "MEMBER"];
  const skillLevels = ["ADVANCED", "INTERMEDIATE", "INTERMEDIATE", "BEGINNER", "ADVANCED", "BEGINNER"];

  const members = [];
  for (let i = 0; i < users.length; i++) {
    const member = await prisma.teamMember.upsert({
      where: { userId_teamId: { userId: users[i].id, teamId: team.id } },
      update: {},
      create: { userId: users[i].id, teamId: team.id, role: roles[i] },
    });
    members.push(member);
  }

  // Create players
  const players = [];
  for (let i = 0; i < members.length; i++) {
    const existing = await prisma.player.findUnique({
      where: { teamMemberId: members[i].id },
    });
    if (!existing) {
      const player = await prisma.player.create({
        data: {
          teamId: team.id,
          teamMemberId: members[i].id,
          displayName: users[i].name,
          skillLevel: skillLevels[i],
        },
      });
      players.push(player);
    } else {
      players.push(existing);
    }
  }

  // Venues
  const venue1 = await prisma.venue.create({
    data: {
      teamId: team.id,
      name: "Sports Center Court A",
      address: "123 Athletic Ave, Downtown",
      courts: 3,
    },
  });

  const venue2 = await prisma.venue.create({
    data: {
      teamId: team.id,
      name: "Community Hall",
      address: "456 Park Rd, Northside",
      courts: 2,
    },
  });

  const now = new Date();

  // Match 1: Singles — Alice vs Bob (Alice won)
  const match1 = await prisma.match.create({
    data: {
      teamId: team.id,
      venueId: venue1.id,
      type: "SINGLES",
      status: "COMPLETED",
      scheduledAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      winningSide: 1,
      players: {
        create: [
          { playerId: players[0].id, side: 1, position: 1 },
          { playerId: players[1].id, side: 2, position: 1 },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, side1Score: 21, side2Score: 15, isComplete: true, winningSide: 1 },
          { setNumber: 2, side1Score: 18, side2Score: 21, isComplete: true, winningSide: 2 },
          { setNumber: 3, side1Score: 21, side2Score: 19, isComplete: true, winningSide: 1 },
        ],
      },
    },
  });

  // Match 2: Doubles — Alice+Charlie vs Bob+Diana (Bob+Diana won)
  const match2 = await prisma.match.create({
    data: {
      teamId: team.id,
      venueId: venue1.id,
      type: "DOUBLES",
      status: "COMPLETED",
      scheduledAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      winningSide: 2,
      players: {
        create: [
          { playerId: players[0].id, side: 1, position: 1 },
          { playerId: players[2].id, side: 1, position: 2 },
          { playerId: players[1].id, side: 2, position: 1 },
          { playerId: players[3].id, side: 2, position: 2 },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, side1Score: 19, side2Score: 21, isComplete: true, winningSide: 2 },
          { setNumber: 2, side1Score: 21, side2Score: 23, isComplete: true, winningSide: 2 },
        ],
      },
    },
  });

  // Match 3: Singles — Evan vs Frank (Evan won)
  await prisma.match.create({
    data: {
      teamId: team.id,
      venueId: venue2.id,
      type: "SINGLES",
      status: "COMPLETED",
      scheduledAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      winningSide: 1,
      players: {
        create: [
          { playerId: players[4].id, side: 1, position: 1 },
          { playerId: players[5].id, side: 2, position: 1 },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, side1Score: 21, side2Score: 8, isComplete: true, winningSide: 1 },
          { setNumber: 2, side1Score: 21, side2Score: 12, isComplete: true, winningSide: 1 },
        ],
      },
    },
  });

  // Upcoming matches
  await prisma.match.create({
    data: {
      teamId: team.id,
      venueId: venue1.id,
      type: "SINGLES",
      status: "SCHEDULED",
      scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      notes: "Weekly singles tournament",
      players: {
        create: [
          { playerId: players[0].id, side: 1, position: 1 },
          { playerId: players[4].id, side: 2, position: 1 },
        ],
      },
    },
  });

  await prisma.match.create({
    data: {
      teamId: team.id,
      venueId: venue2.id,
      type: "DOUBLES",
      status: "SCHEDULED",
      scheduledAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      notes: "Practice doubles match",
      players: {
        create: [
          { playerId: players[1].id, side: 1, position: 1 },
          { playerId: players[2].id, side: 1, position: 2 },
          { playerId: players[3].id, side: 2, position: 1 },
          { playerId: players[5].id, side: 2, position: 2 },
        ],
      },
    },
  });

  // Comments for Smash Club
  await prisma.comment.createMany({
    data: [
      { matchId: match1.id, userId: bob.id, content: "Great match! Alice played an incredible third set." },
      { matchId: match1.id, userId: charlie.id, content: "Those long rallies in set 2 were intense!" },
      { matchId: match2.id, userId: diana.id, content: "Our communication as a doubles pair has really improved!" },
    ],
  });

  // ─── Second Club: Rally Masters ────────────────────────────────────────────

  const team2 = await prisma.team.upsert({
    where: { inviteCode: "DEMO-TEAM-002" },
    update: {},
    create: {
      name: "Rally Masters",
      description: "Weekend warriors pushing their limits",
      inviteCode: "DEMO-TEAM-002",
    },
  });

  // Alice (Admin), Evan, Frank, Diana in Rally Masters
  const team2Users  = [alice, evan, frank, diana];
  const team2Roles  = ["ADMIN", "MEMBER", "MEMBER", "MEMBER"];
  const team2Skills = ["ADVANCED", "ADVANCED", "BEGINNER", "BEGINNER"];

  const team2Members = [];
  for (let i = 0; i < team2Users.length; i++) {
    const member = await prisma.teamMember.upsert({
      where: { userId_teamId: { userId: team2Users[i].id, teamId: team2.id } },
      update: {},
      create: { userId: team2Users[i].id, teamId: team2.id, role: team2Roles[i] },
    });
    team2Members.push(member);
  }

  const team2Players = [];
  for (let i = 0; i < team2Members.length; i++) {
    const existing = await prisma.player.findUnique({
      where: { teamMemberId: team2Members[i].id },
    });
    if (!existing) {
      const player = await prisma.player.create({
        data: {
          teamId: team2.id,
          teamMemberId: team2Members[i].id,
          displayName: team2Users[i].name,
          skillLevel: team2Skills[i],
        },
      });
      team2Players.push(player);
    } else {
      team2Players.push(existing);
    }
  }

  const venue3 = await prisma.venue.create({
    data: {
      teamId: team2.id,
      name: "Westside Badminton Hall",
      address: "789 West Blvd, Westside",
      courts: 4,
    },
  });

  // Rally Masters matches
  const rm1 = await prisma.match.create({
    data: {
      teamId: team2.id,
      venueId: venue3.id,
      type: "SINGLES",
      status: "COMPLETED",
      scheduledAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      winningSide: 1,
      players: {
        create: [
          { playerId: team2Players[0].id, side: 1, position: 1 }, // Alice
          { playerId: team2Players[1].id, side: 2, position: 1 }, // Evan
        ],
      },
      sets: {
        create: [
          { setNumber: 1, side1Score: 21, side2Score: 17, isComplete: true, winningSide: 1 },
          { setNumber: 2, side1Score: 21, side2Score: 14, isComplete: true, winningSide: 1 },
        ],
      },
    },
  });

  await prisma.match.create({
    data: {
      teamId: team2.id,
      venueId: venue3.id,
      type: "DOUBLES",
      status: "COMPLETED",
      scheduledAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      winningSide: 2,
      players: {
        create: [
          { playerId: team2Players[0].id, side: 1, position: 1 }, // Alice
          { playerId: team2Players[2].id, side: 1, position: 2 }, // Frank
          { playerId: team2Players[1].id, side: 2, position: 1 }, // Evan
          { playerId: team2Players[3].id, side: 2, position: 2 }, // Diana
        ],
      },
      sets: {
        create: [
          { setNumber: 1, side1Score: 15, side2Score: 21, isComplete: true, winningSide: 2 },
          { setNumber: 2, side1Score: 18, side2Score: 21, isComplete: true, winningSide: 2 },
        ],
      },
    },
  });

  await prisma.match.create({
    data: {
      teamId: team2.id,
      venueId: venue3.id,
      type: "SINGLES",
      status: "SCHEDULED",
      scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      notes: "Rematch — Evan looking for revenge!",
      players: {
        create: [
          { playerId: team2Players[1].id, side: 1, position: 1 }, // Evan
          { playerId: team2Players[0].id, side: 2, position: 1 }, // Alice
        ],
      },
    },
  });

  await prisma.comment.createMany({
    data: [
      { matchId: rm1.id, userId: evan.id, content: "Alice is in a completely different league. Time to train harder!" },
    ],
  });

  console.log("✅ Demo database seeded successfully!");
  console.log("\nDemo accounts (password: password123):");
  console.log("  alice@example.com   — Admin of Smash Club & Rally Masters");
  console.log("  bob@example.com     — Member of Smash Club");
  console.log("  charlie@example.com — Member of Smash Club");
  console.log("  diana@example.com   — Member of Smash Club & Rally Masters");
  console.log("  evan@example.com    — Member of Smash Club & Rally Masters");
  console.log("  frank@example.com   — Member of Smash Club & Rally Masters");
  console.log("\nTeam invite codes:");
  console.log("  Smash Club    — DEMO-TEAM-001");
  console.log("  Rally Masters — DEMO-TEAM-002");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
