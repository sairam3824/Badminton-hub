import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getSetWinner(side1Score: number, side2Score: number): number | null {
  const maxScore = Math.max(side1Score, side2Score);
  if (maxScore < 21) return null;

  if (side1Score >= 30) return 1;
  if (side2Score >= 30) return 2;

  if (side1Score >= 21 && side1Score - side2Score >= 2) return 1;
  if (side2Score >= 21 && side2Score - side1Score >= 2) return 2;

  return null;
}

export function getMatchWinner(sets: { winningSide: number | null; isComplete: boolean }[]): number | null {
  const completedSets = sets.filter((s) => s.isComplete && s.winningSide);
  const side1Wins = completedSets.filter((s) => s.winningSide === 1).length;
  const side2Wins = completedSets.filter((s) => s.winningSide === 2).length;

  if (side1Wins >= 2) return 1;
  if (side2Wins >= 2) return 2;
  return null;
}

export function formatMatchType(type: string): string {
  return type === "SINGLES" ? "Singles" : "Doubles";
}

export function formatMatchStatus(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: "Scheduled",
    LIVE: "Live",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return map[status] || status;
}

export function formatSkillLevel(level: string): string {
  const map: Record<string, string> = {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
    ADVANCED: "Advanced",
  };
  return map[level] || level;
}

export function getAvatarUrl(name: string): string {
  return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=16a34a&textColor=ffffff`;
}

export function formatScore(sets: { side1Score: number; side2Score: number; isComplete: boolean }[]): string {
  return sets
    .filter((s) => s.isComplete)
    .map((s) => `${s.side1Score}-${s.side2Score}`)
    .join(", ");
}
