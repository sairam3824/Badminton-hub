# BadmintonHub — Multi-Tenant Badminton Match Management SaaS

A complete, production-ready web application for managing badminton matches across multiple teams.

**🌟 Live Demo:** [https://badminton.saiii.in](https://badminton.saiii.in)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

---

## Features

- **Multi-tenant** — Multiple independent teams with fully isolated data
- **Authentication** — Email/password login with secure JWT sessions
- **Team Management** — Create teams, invite members, manage roles (Admin/Member)
- **Match Scheduling** — Singles & doubles matches with venue selection
- **Live Scoring** — Real-time score tracking with automatic winner declaration (21pt, best of 3)
- **Statistics** — Win/loss records, leaderboards, head-to-head comparisons, charts
- **Venue Management** — Multiple courts per venue with match tracking
- **AI Pairing** — Smart doubles match suggestions (algorithmic, with optional OpenAI upgrade)
- **Match Comments** — Notes and commentary per match
- **Mobile-first** — Fully responsive, optimized for courtside use

---

## Tech Stack

| Layer     | Technology             |
|-----------|------------------------|
| Framework | Next.js 14 (App Router)|
| Language  | TypeScript             |
| Database  | SQLite via Prisma ORM  |
| Auth      | NextAuth.js v4         |
| Styling   | Tailwind CSS           |
| Charts    | Recharts               |
| AI        | OpenAI API (optional)  |
| Icons     | Lucide React           |

---

## Running the Project

### Prerequisites

- Node.js 18+
- npm or yarn

### 1. Clone the repository

```bash
git clone https://github.com/your-username/badminton-hub.git
cd badminton-hub
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the project root:

```bash
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
OPENAI_API_KEY="sk-..."  # Optional — for AI pairing suggestions
```

---

### Option A — Original Project (Empty Database)

Start fresh with no data. Register your own account and create a team.

```bash
npm run db:push    # Create tables (empty)
npm run dev        # Start the dev server
```

Open [http://localhost:3001](http://localhost:3001) and register a new account.

No demo banner. No pre-filled credentials. Clean slate.

---

### Option B — Demo Project (Pre-loaded Data)

Loads demo accounts, a team, venues, matches, and comments. Shows a **Demo banner** across the top of every page and pre-fills demo credentials on the login screen.

```bash
npm run db:push        # Create tables
npm run db:seed:demo   # Load demo accounts + sample data
npm run dev:demo       # Start dev server in demo mode
```

Open [http://localhost:3001](http://localhost:3001). The login page will show clickable demo accounts:

| Email                   | Password    | Role       |
|-------------------------|-------------|------------|
| alice@example.com       | password123 | Team Admin |
| bob@example.com         | password123 | Member     |

**Team invite code**: `DEMO123`

> `npm run dev:demo` sets `NEXT_PUBLIC_DEMO_MODE=true` which enables the banner and demo credentials UI. The demo seed script lives in `demo/seed.ts`.

> To reset back to an empty database: `npm run db:reset`

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/               # Login & Register pages
│   ├── (dashboard)/          # Main app (protected)
│   │   ├── dashboard/        # Overview & stats
│   │   ├── matches/          # Match list, schedule, detail/scoring
│   │   ├── players/          # Team roster & player stats
│   │   ├── stats/            # Charts & leaderboard
│   │   ├── venues/           # Court management
│   │   └── settings/         # Team & account settings
│   ├── api/                  # API routes
│   │   ├── auth/             # NextAuth
│   │   ├── matches/          # Match CRUD + scoring + comments
│   │   ├── players/          # Player management + availability
│   │   ├── stats/            # Statistics computation
│   │   ├── teams/            # Team CRUD + member management
│   │   ├── venues/           # Venue CRUD
│   │   └── ai/               # AI pairing suggestions
│   ├── onboarding/           # Create or join team
│   └── page.tsx              # Landing page
├── components/
│   ├── layout/               # Sidebar, mobile nav, team switcher
│   └── providers/            # Session & query providers
├── lib/
│   ├── auth.ts               # NextAuth configuration
│   ├── db.ts                 # Prisma client singleton
│   └── utils.ts              # Helpers, scoring logic
└── types/
    └── next-auth.d.ts        # Extended session types
```

---

## Badminton Scoring Rules Implemented

- Each set: first to **21 points**
- Must win by **2 points** (e.g., 22–20)
- If tied at **29–29**: next point wins (30–29)
- Match: **best of 3 sets**
- Automatic winner declaration when rules are met

---

## Multi-Tenancy Design

- Every database record includes a `teamId`
- All API routes verify team membership before data access
- Sessions store the `activeTeamId` and list of all user teams
- Team switching refreshes the active context
- Invite codes are unique 8-character alphanumeric strings

---

## Available Scripts

```bash
npm run dev            # Start dev server (main — empty database, no demo UI)
npm run dev:demo       # Start dev server (demo mode — banner + demo credentials shown)
npm run build          # Production build
npm run start          # Start production server
npm run lint           # Run ESLint
npm run db:push        # Sync schema to database (empty)
npm run db:seed        # No-op — database starts empty by default
npm run db:seed:demo   # Load demo accounts and sample data
npm run db:reset       # Reset database to empty
npm run db:studio      # Open Prisma Studio (database GUI)
```

---

## Production Deployment (Vercel)

> SQLite is not supported on Vercel's serverless infrastructure. Use a hosted database instead (e.g. [Neon](https://neon.tech) or [Supabase](https://supabase.com) for PostgreSQL).

### Steps

1. **Switch to PostgreSQL** — in `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. **Set environment variables** in your Vercel project dashboard:

   | Variable          | Value                                 |
   |-------------------|---------------------------------------|
   | `DATABASE_URL`    | Your PostgreSQL connection string     |
   | `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` locally |
   | `NEXTAUTH_URL`    | Your Vercel deployment URL            |

3. **Run migrations** on your production database:
   ```bash
   npx prisma migrate deploy
   ```
4. **Deploy** — push to GitHub and connect the repo to Vercel. The build runs automatically.
5. **Optional:** To seed demo data on the deployed database, run locally with `DATABASE_URL` pointing to production:
   ```bash
   DATABASE_URL="your-prod-url" npm run db:seed:demo
   ```

---

## Security

- Passwords hashed with **bcrypt** (12 salt rounds)
- **JWT tokens** for session management
- All API routes require authentication
- Team isolation enforced at every API layer
- Input validation via **Zod** on all endpoints
- No sensitive data exposed in client session

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please ensure your code follows the existing style and all existing functionality continues to work.

---

## License

This project is licensed under the **Apache License 2.0**. See the [LICENSE](LICENSE) file for details.
