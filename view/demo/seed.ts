import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding demo data...");

    // Create demo users
    const adminPassword = await bcrypt.hash("password123", 10);

    const admin = await prisma.user.upsert({
        where: { email: "alice@example.com" },
        update: {},
        create: {
            email: "alice@example.com",
            name: "Alice (Admin)",
            password: adminPassword,
        },
    });

    const member = await prisma.user.upsert({
        where: { email: "bob@example.com" },
        update: {},
        create: {
            email: "bob@example.com",
            name: "Bob (Member)",
            password: adminPassword,
        },
    });

    // Create a demo team
    const team = await prisma.team.upsert({
        where: { inviteCode: "DEMO123" },
        update: {},
        create: {
            name: "Demo Badminton Club",
            description: "A club for demo purposes",
            inviteCode: "DEMO123",
        },
    });

    // Add members to team
    const adminMember = await prisma.teamMember.upsert({
        where: {
            userId_teamId: {
                userId: admin.id,
                teamId: team.id,
            },
        },
        update: {},
        create: {
            userId: admin.id,
            teamId: team.id,
            role: "ADMIN",
        },
    });

    const bobMember = await prisma.teamMember.upsert({
        where: {
            userId_teamId: {
                userId: member.id,
                teamId: team.id,
            },
        },
        update: {},
        create: {
            userId: member.id,
            teamId: team.id,
            role: "MEMBER",
        },
    });

    // Create Players
    const alicePlayer = await prisma.player.upsert({
        where: { teamMemberId: adminMember.id },
        update: {},
        create: {
            teamId: team.id,
            teamMemberId: adminMember.id,
            displayName: "Alice (Admin)",
            skillLevel: "ADVANCED"
        }
    });

    const bobPlayer = await prisma.player.upsert({
        where: { teamMemberId: bobMember.id },
        update: {},
        create: {
            teamId: team.id,
            teamMemberId: bobMember.id,
            displayName: "Bob (Member)",
            skillLevel: "INTERMEDIATE"
        }
    });

    // Create a Venue
    const venue = await prisma.venue.create({
        data: {
            teamId: team.id,
            name: "Downtown Sports Center",
            address: "123 Main St, Cityville",
            courts: 4,
            notes: "Wooden floors, good lighting."
        }
    });

    // Create Matches
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);

    // Upcoming Match
    const match1 = await prisma.match.create({
        data: {
            teamId: team.id,
            venueId: venue.id,
            type: "SINGLES",
            status: "SCHEDULED",
            scheduledAt: tomorrow,
            notes: "Friendly weekend match"
        }
    });

    await prisma.matchPlayer.create({
        data: {
            matchId: match1.id,
            playerId: alicePlayer.id,
            side: 1
        }
    });

    await prisma.matchPlayer.create({
        data: {
            matchId: match1.id,
            playerId: bobPlayer.id,
            side: 2
        }
    });

    // Completed Match
    const match2 = await prisma.match.create({
        data: {
            teamId: team.id,
            venueId: venue.id,
            type: "SINGLES",
            status: "COMPLETED",
            scheduledAt: yesterday,
            winningSide: 1
        }
    });

    await prisma.matchPlayer.create({
        data: {
            matchId: match2.id,
            playerId: alicePlayer.id,
            side: 1
        }
    });

    await prisma.matchPlayer.create({
        data: {
            matchId: match2.id,
            playerId: bobPlayer.id,
            side: 2
        }
    });

    await prisma.set.create({
        data: {
            matchId: match2.id,
            setNumber: 1,
            side1Score: 21,
            side2Score: 18,
            isComplete: true,
            winningSide: 1,
            completedAt: yesterday
        }
    });

    console.log("Demo seed data loaded successfully with matches and venues.");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
