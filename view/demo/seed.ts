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
    await prisma.teamMember.upsert({
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

    await prisma.teamMember.upsert({
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

    console.log("Demo seed data loaded successfully.");
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
