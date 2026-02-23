"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft, MapPin, Calendar, Trophy, Plus, Minus,
  MessageSquare, Send, Trash2, Play, CheckCircle, Loader2, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { cn, formatMatchType } from "@/lib/utils";

interface Set { id: string; setNumber: number; side1Score: number; side2Score: number; isComplete: boolean; winningSide: number | null }
interface Player { id: string; displayName: string; skillLevel: string }
interface MatchPlayer { side: number; position: number; player: Player }
interface Comment { id: string; content: string; createdAt: string; user: { id: string; name: string } }
interface Match {
  id: string; type: string; status: string; scheduledAt: string; notes: string | null;
  winningSide: number | null;
  players: MatchPlayer[];
  sets: Set[];
  venue: { name: string; address: string | null } | null;
  comments: Comment[];
  team: { id: string; name: string };
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [pendingScores, setPendingScores] = useState<Record<number, { side1: number; side2: number }>>({});
  const [updatingScore, setUpdatingScore] = useState(false);
  const [scoreError, setScoreError] = useState("");

  const { data, isLoading, error, refetch } = useQuery<{ match: Match }>({
    queryKey: ["match", id],
    queryFn: async () => {
      const res = await fetch(`/api/matches/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: (query) =>
      query.state.data?.match?.status === "LIVE" ? 5000 : false,
  });

  const match = data?.match;

  useEffect(() => {
    if (match?.sets) {
      setPendingScores(prev => {
        const next = { ...prev };
        match.sets.forEach(s => {
          if (s.isComplete) {
            next[s.setNumber] = { side1: s.side1Score, side2: s.side2Score };
          } else if (!(s.setNumber in next)) {
            next[s.setNumber] = { side1: s.side1Score, side2: s.side2Score };
          }
        });
        return next;
      });
    }
  }, [match?.sets]);

  const side1Players = match?.players.filter(p => p.side === 1) || [];
  const side2Players = match?.players.filter(p => p.side === 2) || [];

  async function updateScore(setNumber: number) {
    const scores = pendingScores[setNumber];
    if (!scores) return;

    setUpdatingScore(true);
    setScoreError("");
    try {
      const res = await fetch(`/api/matches/${id}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setNumber,
          side1Score: scores.side1,
          side2Score: scores.side2,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScoreError(data.error || "Failed to save scores");
        return;
      }
      refetch();
    } finally {
      setUpdatingScore(false);
    }
  }

  function adjustScore(setNumber: number, side: "side1" | "side2", delta: number) {
    setPendingScores(prev => {
      const current = prev[setNumber] || { side1: 0, side2: 0 };
      const newScore = Math.max(0, Math.min(30, current[side] + delta));
      return { ...prev, [setNumber]: { ...current, [side]: newScore } };
    });
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      await fetch(`/api/matches/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment.trim() }),
      });
      setComment("");
      refetch();
    } finally {
      setSubmittingComment(false);
    }
  }

  async function deleteComment(commentId: string) {
    await fetch(`/api/matches/${id}/comments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    refetch();
  }

  async function deleteMatch() {
    if (!confirm("Are you sure you want to delete this match?")) return;
    const res = await fetch(`/api/matches/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/matches");
  }

  async function cancelMatch() {
    if (!confirm("Cancel this match?")) return;
    await fetch(`/api/matches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    refetch();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500">Match not found.</p>
        <Link href="/matches" className="mt-4 btn-secondary inline-flex">Go back</Link>
      </div>
    );
  }

  const side1SetWins = match.sets.filter(s => s.isComplete && s.winningSide === 1).length;
  const side2SetWins = match.sets.filter(s => s.isComplete && s.winningSide === 2).length;
  const isLive = match.status === "LIVE";
  const isCompleted = match.status === "COMPLETED";
  const isScheduled = match.status === "SCHEDULED";
  const isCancelled = match.status === "CANCELLED";
  const isAdmin = session?.teams?.find((t) => t.id === match.team?.id)?.role === "ADMIN";

  const canScore = isScheduled || isLive;

  const side1Name = side1Players.map(p => p.player.displayName.split(" ")[0]).join(" & ");
  const side2Name = side2Players.map(p => p.player.displayName.split(" ")[0]).join(" & ");

  return (
    <div className="max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <Link href="/matches" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 py-1">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Matches</span>
        </Link>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className={cn(
            "text-xs font-medium px-2.5 py-1 rounded-full",
            isLive ? "bg-red-100 text-red-700" :
            isCompleted ? "bg-gray-100 text-gray-600" :
            isCancelled ? "bg-orange-100 text-orange-700" :
            "bg-blue-100 text-blue-700"
          )}>
            {isLive && <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1 animate-pulse" />}
            {isLive ? "Live" : isCompleted ? "Completed" : isCancelled ? "Cancelled" : "Scheduled"}
          </span>
          <span className="badge-gray">{formatMatchType(match.type)}</span>
        </div>
      </div>

      {/* Score Board */}
      <div className="card p-4 sm:p-5 text-center">
        <p className="text-xs text-gray-400 mb-4">
          <Calendar className="inline w-3 h-3 mr-1" />
          {format(new Date(match.scheduledAt), "EEE, MMM d · h:mm a")}
          {match.venue && (
            <>
              <span className="mx-2">·</span>
              <MapPin className="inline w-3 h-3 mr-1" />
              {match.venue.name}
            </>
          )}
        </p>

        <div className="flex items-center justify-between gap-2">
          {/* Side 1 */}
          <div className={cn("flex-1 text-center min-w-0", match.winningSide === 1 && "text-primary-600")}>
            {side1Players.map(mp => (
              <div key={mp.player.id}>
                <p className="font-bold text-sm sm:text-base leading-tight truncate">{mp.player.displayName.split(" ")[0]}</p>
                {match.type === "DOUBLES" && (
                  <p className="text-xs text-gray-400 truncate">{mp.player.displayName.split(" ").slice(1).join(" ")}</p>
                )}
              </div>
            ))}
            {match.winningSide === 1 && (
              <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                <Trophy className="w-3 h-3" /> Won
              </div>
            )}
          </div>

          {/* Score */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn("text-5xl sm:text-6xl font-black tabular-nums", match.winningSide === 1 ? "text-primary-600" : "text-gray-700")}>{side1SetWins}</div>
              <div className="text-xl text-gray-200 font-light">–</div>
              <div className={cn("text-5xl sm:text-6xl font-black tabular-nums", match.winningSide === 2 ? "text-primary-600" : "text-gray-700")}>{side2SetWins}</div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Sets</p>
          </div>

          {/* Side 2 */}
          <div className={cn("flex-1 text-center min-w-0", match.winningSide === 2 && "text-primary-600")}>
            {side2Players.map(mp => (
              <div key={mp.player.id}>
                <p className="font-bold text-sm sm:text-base leading-tight truncate">{mp.player.displayName.split(" ")[0]}</p>
                {match.type === "DOUBLES" && (
                  <p className="text-xs text-gray-400 truncate">{mp.player.displayName.split(" ").slice(1).join(" ")}</p>
                )}
              </div>
            ))}
            {match.winningSide === 2 && (
              <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                <Trophy className="w-3 h-3" /> Won
              </div>
            )}
          </div>
        </div>

        {/* Completed set scores */}
        {match.sets.filter(s => s.isComplete).length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
            {match.sets.filter(s => s.isComplete).map(set => (
              <div key={set.id} className="text-center">
                <p className="text-xs text-gray-400 mb-0.5">Set {set.setNumber}</p>
                <p className={cn("text-sm font-semibold",
                  set.winningSide === 1 ? "text-primary-600" :
                  set.winningSide === 2 ? "text-gray-600" : "text-gray-400"
                )}>{set.side1Score}–{set.side2Score}</p>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
          {isCompleted && (
            <div className="flex items-center gap-1 text-sm text-primary-600 font-medium">
              <CheckCircle className="w-4 h-4" />
              Match completed
            </div>
          )}
          {(isScheduled || isLive) && isAdmin && (
            <button onClick={cancelMatch} className="btn-secondary text-xs text-orange-500 hover:bg-orange-50 hover:border-orange-200">
              Cancel Match
            </button>
          )}
          {isAdmin && (
            <button onClick={deleteMatch} className="btn-secondary text-red-500 hover:bg-red-50 hover:border-red-200">
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Scoring Panel — large, courtside-friendly */}
      {canScore && (
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">
              {isScheduled ? "Start Scoring" : "Live Scoring"}
            </h2>
            {isScheduled && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full flex items-center gap-1">
                <Play className="w-3 h-3" />
                Tap + to start
              </span>
            )}
            {isLive && (
              <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>

          {scoreError && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {scoreError}
            </div>
          )}

          <div className="space-y-4">
            {match.sets.map((set) => {
              const scores = pendingScores[set.setNumber] ?? { side1: set.side1Score, side2: set.side2Score };
              const isActive = !set.isComplete;

              return (
                <div key={set.id} className={cn(
                  "rounded-2xl border-2 transition-all overflow-hidden",
                  set.isComplete
                    ? "border-gray-100 bg-gray-50"
                    : "border-primary-200 bg-primary-50/20"
                )}>
                  {/* Set header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-current border-opacity-10">
                    <p className="text-sm font-semibold text-gray-700">Set {set.setNumber}</p>
                    {set.isComplete ? (
                      <span className="badge-green text-xs flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {set.winningSide === 1 ? side1Players[0]?.player.displayName.split(" ")[0] : side2Players[0]?.player.displayName.split(" ")[0]} wins
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">First to 21 · win by 2</span>
                    )}
                  </div>

                  {/* Score controls */}
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Side 1 */}
                      <div className="flex-1 text-center">
                        <p className="text-xs text-gray-400 mb-3 truncate font-medium">{side1Name}</p>
                        {isActive ? (
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => adjustScore(set.setNumber, "side1", -1)}
                              className="score-btn-minus"
                              aria-label="Decrease side 1 score"
                            >
                              <Minus className="w-5 h-5 text-gray-500" />
                            </button>
                            <span className="text-5xl font-black text-gray-900 w-16 text-center tabular-nums leading-none">
                              {scores.side1}
                            </span>
                            <button
                              onClick={() => adjustScore(set.setNumber, "side1", 1)}
                              className="score-btn-plus"
                              aria-label="Increase side 1 score"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <p className={cn("text-5xl font-black text-center tabular-nums leading-none",
                            set.winningSide === 1 ? "text-primary-600" : "text-gray-300"
                          )}>{set.side1Score}</p>
                        )}
                      </div>

                      <div className="text-xl text-gray-200 font-light select-none flex-shrink-0">–</div>

                      {/* Side 2 */}
                      <div className="flex-1 text-center">
                        <p className="text-xs text-gray-400 mb-3 truncate font-medium">{side2Name}</p>
                        {isActive ? (
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => adjustScore(set.setNumber, "side2", -1)}
                              className="score-btn-minus"
                              aria-label="Decrease side 2 score"
                            >
                              <Minus className="w-5 h-5 text-gray-500" />
                            </button>
                            <span className="text-5xl font-black text-gray-900 w-16 text-center tabular-nums leading-none">
                              {scores.side2}
                            </span>
                            <button
                              onClick={() => adjustScore(set.setNumber, "side2", 1)}
                              className="score-btn-plus"
                              aria-label="Increase side 2 score"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <p className={cn("text-5xl font-black text-center tabular-nums leading-none",
                            set.winningSide === 2 ? "text-primary-600" : "text-gray-300"
                          )}>{set.side2Score}</p>
                        )}
                      </div>
                    </div>

                    {isActive && (
                      <div className="mt-5">
                        <button
                          onClick={() => updateScore(set.setNumber)}
                          disabled={updatingScore}
                          className="btn-primary w-full text-base py-3"
                        >
                          {updatingScore && <Loader2 className="w-4 h-4 animate-spin" />}
                          Save Set {set.setNumber}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {match.notes && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">Match Notes</p>
          <p className="text-sm text-gray-700">{match.notes}</p>
        </div>
      )}

      {/* Comments */}
      <div className="card p-4 sm:p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          Comments ({match.comments.length})
        </h2>

        <div className="space-y-3 mb-4">
          {match.comments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No comments yet. Be the first!</p>
          )}
          {match.comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 text-xs font-bold">{c.user.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0 bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold text-gray-700">{c.user.name}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="text-xs text-gray-400">{format(new Date(c.createdAt), "MMM d, h:mm a")}</p>
                    {c.user.id === session?.user.id && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors p-0.5"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700">{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={submitComment} className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Add a comment..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={500}
          />
          <button
            type="submit"
            className="btn-primary flex-shrink-0 px-4"
            disabled={submittingComment || !comment.trim()}
            aria-label="Send comment"
          >
            {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
