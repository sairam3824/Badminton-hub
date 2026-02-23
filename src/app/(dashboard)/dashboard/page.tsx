import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMatchType, formatScore } from "@/lib/utils";
import {
  Trophy,
  Swords,
  TrendingUp,
  CalendarDays,
  Plus,
  ChevronRight,
  MapPin,
  Users,
  Clock,
  Activity,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.activeTeamId) redirect("/onboarding");

  const teamId = session.activeTeamId;
  const now = new Date();
  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
  });
  if (!membership) redirect("/onboarding");

  const [team, upcomingMatches, recentMatches, playerCount, venueCount] = await Promise.all([
    db.team.findUnique({ where: { id: teamId } }),
    db.match.findMany({
      where: { teamId, status: { in: ["SCHEDULED", "LIVE"] }, scheduledAt: { gte: now } },
      include: {
        players: {
          include: { player: true },
          orderBy: [{ side: "asc" }, { position: "asc" }],
        },
        venue: true,
        sets: { orderBy: { setNumber: "asc" } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    db.match.findMany({
      where: { teamId, status: "COMPLETED" },
      include: {
        players: {
          include: { player: true },
          orderBy: [{ side: "asc" }, { position: "asc" }],
        },
        venue: true,
        sets: { orderBy: { setNumber: "asc" } },
      },
      orderBy: { scheduledAt: "desc" },
      take: 5,
    }),
    db.player.count({ where: { teamId } }),
    db.venue.count({ where: { teamId } }),
  ]);

  if (!team) redirect("/onboarding");

  const myMember = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
    include: {
      player: {
        include: {
          matchPlayers: {
            include: { match: { select: { status: true, winningSide: true } } },
          },
        },
      },
    },
  });

  const myPlayer = myMember?.player;
  const myMatches = myPlayer?.matchPlayers.filter(mp => mp.match.status === "COMPLETED") || [];
  const myWins = myMatches.filter(mp => mp.match.winningSide === mp.side).length;
  const myLosses = myMatches.length - myWins;
  const myWinRate = myMatches.length > 0 ? Math.round((myWins / myMatches.length) * 100) : 0;

  const totalMatches = await db.match.count({ where: { teamId, status: "COMPLETED" } });
  const liveCount = await db.match.count({ where: { teamId, status: "LIVE" } });

  const firstName = session.user.name?.split(" ")[0] ?? "there";
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 sm:p-8">
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(ellipse at 70% 50%, #16a34a 0%, transparent 65%)" }}
        />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-gray-400 text-sm font-medium tracking-wide">{greeting}, {firstName}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">{team.name}</h1>
            <div className="flex items-center gap-3 mt-3">
              {liveCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full text-xs font-semibold text-red-300 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                  {liveCount} live now
                </span>
              )}
              <span className="text-xs text-gray-500">{format(now, "EEEE, MMMM d")}</span>
            </div>
          </div>
          <Link
            href="/matches/new"
            className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-primary-900/30 transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Schedule Match</span>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Swords}
          label="My Matches"
          value={myMatches.length}
          sub={myMatches.length > 0 ? `${myWins}W · ${myLosses}L` : "No matches yet"}
          accent="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Win Rate"
          value={`${myWinRate}%`}
          sub={myMatches.length > 0 ? "Overall average" : "No matches yet"}
          accent="green"
        />
        <StatCard
          icon={Activity}
          label="Team Matches"
          value={totalMatches}
          sub="Completed"
          accent="purple"
        />
        <StatCard
          icon={Users}
          label="Players"
          value={playerCount}
          sub={`${venueCount} venue${venueCount !== 1 ? "s" : ""}`}
          accent="amber"
        />
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming matches */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
              </div>
              Upcoming Matches
            </h2>
            <Link href="/matches?tab=upcoming" className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-0.5 font-medium">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="p-3">
            {upcomingMatches.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                message="No upcoming matches"
                action={{ href: "/matches/new", label: "Schedule one" }}
              />
            ) : (
              <div className="space-y-1">
                {upcomingMatches.map((match) => (
                  <Link
                    key={match.id}
                    href={`/matches/${match.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${match.status === "LIVE" ? "bg-red-500 animate-pulse" : "bg-primary-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {getMatchTitle(match)}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {format(new Date(match.scheduledAt), "EEE, MMM d · h:mm a")}
                        {match.venue && (
                          <span className="flex items-center gap-0.5 ml-1">
                            · <MapPin className="w-3 h-3" /> {match.venue.name}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${match.status === "LIVE" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                      {match.status === "LIVE" ? "Live" : formatMatchType(match.type)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent results */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
              </div>
              Recent Results
            </h2>
            <Link href="/matches?tab=past" className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-0.5 font-medium">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="p-3">
            {recentMatches.length === 0 ? (
              <EmptyState
                icon={Trophy}
                message="No completed matches yet"
              />
            ) : (
              <div className="space-y-1">
                {recentMatches.map((match) => {
                  const side1Players = match.players.filter((p) => p.side === 1);
                  const side2Players = match.players.filter((p) => p.side === 2);
                  return (
                    <Link
                      key={match.id}
                      href={`/matches/${match.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className={`font-medium truncate ${match.winningSide === 1 ? "text-gray-900" : "text-gray-400"}`}>
                            {side1Players.map(p => p.player.displayName.split(" ")[0]).join(" & ")}
                          </span>
                          <span className="text-gray-300 flex-shrink-0 text-xs font-medium">vs</span>
                          <span className={`font-medium truncate ${match.winningSide === 2 ? "text-gray-900" : "text-gray-400"}`}>
                            {side2Players.map(p => p.player.displayName.split(" ")[0]).join(" & ")}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatScore(match.sets)} · {format(new Date(match.scheduledAt), "MMM d")}
                        </p>
                      </div>
                      <div className="flex-shrink-0 w-6 h-6 bg-amber-50 rounded-lg flex items-center justify-center">
                        <Trophy className="w-3 h-3 text-amber-500" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/matches/new", icon: Plus, label: "New Match", desc: "Schedule a game", iconBg: "bg-primary-50", iconColor: "text-primary-600", border: "hover:border-primary-200" },
            { href: "/players", icon: TrendingUp, label: "Leaderboard", desc: "See rankings", iconBg: "bg-blue-50", iconColor: "text-blue-600", border: "hover:border-blue-200" },
            { href: "/stats", icon: Activity, label: "Statistics", desc: "Win/loss charts", iconBg: "bg-purple-50", iconColor: "text-purple-600", border: "hover:border-purple-200" },
            { href: "/venues", icon: MapPin, label: "Venues", desc: "Manage courts", iconBg: "bg-amber-50", iconColor: "text-amber-600", border: "hover:border-amber-200" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`bg-white rounded-2xl border border-gray-100 ${action.border} p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-all duration-150`}
            >
              <div className={`w-9 h-9 ${action.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <action.icon className={`w-4 h-4 ${action.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{action.label}</p>
                <p className="text-xs text-gray-400 truncate">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: string;
  accent: "blue" | "green" | "purple" | "amber";
}) {
  const styles = {
    blue:   { bg: "bg-blue-50",   icon: "text-blue-600",   border: "border-blue-100",  value: "text-blue-900" },
    green:  { bg: "bg-green-50",  icon: "text-green-600",  border: "border-green-100", value: "text-green-900" },
    purple: { bg: "bg-purple-50", icon: "text-purple-600", border: "border-purple-100",value: "text-purple-900" },
    amber:  { bg: "bg-amber-50",  icon: "text-amber-600",  border: "border-amber-100", value: "text-amber-900" },
  }[accent];

  return (
    <div className={`bg-white rounded-2xl border ${styles.border} shadow-sm p-4`}>
      <div className={`w-8 h-8 ${styles.bg} rounded-lg flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${styles.icon}`} />
      </div>
      <div className={`text-2xl font-bold ${styles.value}`}>{value}</div>
      <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, message, action }: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="text-center py-10">
      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-gray-300" />
      </div>
      <p className="text-sm text-gray-400 font-medium">{message}</p>
      {action && (
        <Link href={action.href} className="mt-3 inline-flex text-xs text-primary-600 hover:text-primary-700 font-semibold">
          {action.label} →
        </Link>
      )}
    </div>
  );
}

function getMatchTitle(match: { type: string; players: { side: number; player: { displayName: string } }[] }) {
  const side1 = match.players.filter(p => p.side === 1).map(p => p.player.displayName.split(" ")[0]).join(" & ");
  const side2 = match.players.filter(p => p.side === 2).map(p => p.player.displayName.split(" ")[0]).join(" & ");
  return side1 && side2 ? `${side1} vs ${side2}` : `${match.type} Match`;
}
