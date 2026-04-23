export type SplitMode = "equal" | "custom" | "percentage";

export type Category =
  | "Food"
  | "Travel"
  | "Entertainment"
  | "Utilities"
  | "Shopping"
  | "Health"
  | "Other";

export type Provider = "credentials" | "google";

export interface Participant {
  _id: string;
  name: string;
  color: string;
  avatar?: string | null;
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash?: string | null;
  image?: string | null;
  provider: Provider;
  createdAt: string;
}

export interface IGroup {
  _id: string;
  name: string;
  ownerId: string;
  participants: Participant[];
  createdAt: string;
  totalExpenses?: number;
  expenseCount?: number;
}

export interface SplitEntry {
  participantId: string;
  amount: number;
  percentage?: number | null;
}

export interface IExpense {
  _id: string;
  groupId: string;
  description: string;
  amount: number;
  date: string;
  payerId: string;
  splitMode: SplitMode;
  splits: SplitEntry[];
  category: Category;
  createdAt: string;
}

export interface ISettlement {
  _id: string;
  groupId: string;
  fromId: string;
  toId: string;
  amount: number;
  settledAt: string;
}

export interface NetBalance {
  participantId: string;
  name: string;
  balance: number;
}

export interface DebtEntry {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface SettlementSuggestion {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface BalanceData {
  netBalances: NetBalance[];
  debtMatrix: Record<string, Record<string, number>>;
  settlements: SettlementSuggestion[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface FilterState {
  search: string;
  participantId: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
  categories: Category[];
}
