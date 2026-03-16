export type SessionStatus = "pending" | "paid" | "upcoming" | "done" | "canceled";

export interface SessionParty {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface SessionListItem {
  id: string;
  startAt: string;
  endAt: string | null;
  durationMinutes: number | null;
  status: SessionStatus;
  price: number | null;
  currency: string;
  game: string | null;
  notes: string | null;
  createdAt: string;
  otherParty: SessionParty | null;
}

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  pending: "En attente",
  paid: "Payée",
  upcoming: "À venir",
  done: "Terminée",
  canceled: "Annulée",
};

export const SESSION_STATUS_CLASS: Record<SessionStatus, string> = {
  pending: "bg-amber-500/20 text-amber-300",
  paid: "bg-indigo-500/20 text-indigo-300",
  upcoming: "bg-teal-500/20 text-teal-300",
  done: "bg-slate-500/20 text-slate-400",
  canceled: "bg-red-500/20 text-red-400",
};
