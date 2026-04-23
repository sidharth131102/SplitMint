import { create } from "zustand";
import type {
  IGroup,
  IExpense,
  BalanceData,
  ChatMessage,
  FilterState,
  Category,
} from "@/types";

const defaultFilters: FilterState = {
  search: "",
  participantId: "",
  startDate: "",
  endDate: "",
  minAmount: "",
  maxAmount: "",
  categories: [],
};

interface AppState {
  groups: IGroup[];
  currentGroup: IGroup | null;
  expenses: IExpense[];
  balances: BalanceData | null;
  chatHistory: ChatMessage[];
  filters: FilterState;

  setGroups: (groups: IGroup[]) => void;
  addGroup: (group: IGroup) => void;
  updateGroup: (group: IGroup) => void;
  deleteGroup: (id: string) => void;
  setCurrentGroup: (group: IGroup | null) => void;

  setExpenses: (expenses: IExpense[]) => void;
  addExpense: (expense: IExpense) => void;
  updateExpense: (expense: IExpense) => void;
  deleteExpense: (id: string) => void;

  setBalances: (balances: BalanceData | null) => void;

  addChatMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  clearChat: () => void;

  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  groups: [],
  currentGroup: null,
  expenses: [],
  balances: null,
  chatHistory: [],
  filters: defaultFilters,

  setGroups: (groups) => set({ groups }),
  addGroup: (group) => set((s) => ({ groups: [group, ...s.groups] })),
  updateGroup: (group) =>
    set((s) => ({
      groups: s.groups.map((g) => (g._id === group._id ? group : g)),
      currentGroup: s.currentGroup?._id === group._id ? group : s.currentGroup,
    })),
  deleteGroup: (id) =>
    set((s) => ({
      groups: s.groups.filter((g) => g._id !== id),
      currentGroup: s.currentGroup?._id === id ? null : s.currentGroup,
    })),
  setCurrentGroup: (group) => set({ currentGroup: group }),

  setExpenses: (expenses) => set({ expenses }),
  addExpense: (expense) =>
    set((s) => ({ expenses: [expense, ...s.expenses] })),
  updateExpense: (expense) =>
    set((s) => ({
      expenses: s.expenses.map((e) => (e._id === expense._id ? expense : e)),
    })),
  deleteExpense: (id) =>
    set((s) => ({ expenses: s.expenses.filter((e) => e._id !== id) })),

  setBalances: (balances) => set({ balances }),

  addChatMessage: (message) =>
    set((s) => ({ chatHistory: [...s.chatHistory, message] })),
  updateLastMessage: (content) =>
    set((s) => {
      const history = [...s.chatHistory];
      if (history.length > 0) {
        history[history.length - 1] = {
          ...history[history.length - 1],
          content,
        };
      }
      return { chatHistory: history };
    }),
  clearChat: () => set({ chatHistory: [] }),

  setFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, ...filters } })),
  clearFilters: () => set({ filters: defaultFilters }),
}));
