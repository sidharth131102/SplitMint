import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Category, SplitMode, SplitEntry, Participant } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const PARTICIPANT_COLORS = [
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: "#f59e0b",
  Travel: "#3b82f6",
  Entertainment: "#8b5cf6",
  Utilities: "#6b7280",
  Shopping: "#ec4899",
  Health: "#10b981",
  Other: "#a3a3a3",
};

export const CATEGORY_ICONS: Record<Category, string> = {
  Food: "🍽️",
  Travel: "✈️",
  Entertainment: "🎬",
  Utilities: "💡",
  Shopping: "🛍️",
  Health: "❤️",
  Other: "📦",
};

export function calculateSplits(
  amount: number,
  participantIds: string[],
  splitMode: SplitMode,
  customInputs?: Record<string, number>
): SplitEntry[] {
  const n = participantIds.length;

  if (splitMode === "equal") {
    const base = Math.floor((amount / n) * 100) / 100;
    const remainder = Math.round((amount - base * n) * 100);
    return participantIds.map((id, i) => ({
      participantId: id,
      amount: i < remainder ? base + 0.01 : base,
      percentage: null,
    }));
  }

  if (splitMode === "custom") {
    return participantIds.map((id) => ({
      participantId: id,
      amount: customInputs?.[id] ?? 0,
      percentage: null,
    }));
  }

  if (splitMode === "percentage") {
    return participantIds.map((id) => {
      const pct = customInputs?.[id] ?? 0;
      return {
        participantId: id,
        amount: Math.round(((amount * pct) / 100) * 100) / 100,
        percentage: pct,
      };
    });
  }

  return [];
}

export function getParticipantName(
  id: string,
  participants: Participant[],
  ownerName: string
): string {
  if (id === "owner") return ownerName;
  return participants.find((p) => p._id === id)?.name ?? "Unknown";
}

export function getParticipantColor(
  id: string,
  participants: Participant[]
): string {
  if (id === "owner") return "#10b981";
  return participants.find((p) => p._id === id)?.color ?? "#a3a3a3";
}
