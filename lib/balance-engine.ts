import type { IExpense, NetBalance, DebtEntry, SettlementSuggestion, BalanceData, Participant } from "@/types";

export function computeBalances(
  expenses: IExpense[],
  participants: Participant[],
  ownerName: string,
  ownerId: string
): BalanceData {
  const allIds = ["owner", ...participants.map((p) => p._id)];
  const nameMap: Record<string, string> = { owner: ownerName };
  participants.forEach((p) => (nameMap[p._id] = p.name));

  // Step 1: net balances
  const balanceMap: Record<string, number> = {};
  allIds.forEach((id) => (balanceMap[id] = 0));

  for (const expense of expenses) {
    if (!allIds.includes(expense.payerId)) continue;
    balanceMap[expense.payerId] = (balanceMap[expense.payerId] ?? 0) + expense.amount;
    for (const split of expense.splits) {
      if (!allIds.includes(split.participantId)) continue;
      balanceMap[split.participantId] = (balanceMap[split.participantId] ?? 0) - split.amount;
    }
  }

  const netBalances: NetBalance[] = allIds.map((id) => ({
    participantId: id,
    name: nameMap[id] ?? id,
    balance: Math.round((balanceMap[id] ?? 0) * 100) / 100,
  }));

  // Step 2: debt matrix — pairwise netting
  const debtMatrix: Record<string, Record<string, number>> = {};
  allIds.forEach((a) => {
    debtMatrix[a] = {};
    allIds.forEach((b) => (debtMatrix[a][b] = 0));
  });

  for (const expense of expenses) {
    const payerId = expense.payerId;
    for (const split of expense.splits) {
      if (split.participantId === payerId) continue;
      const owes = split.participantId;
      const owedTo = payerId;
      // Skip if either ID is unknown (e.g. deleted participant)
      if (!debtMatrix[owes] || !debtMatrix[owedTo]) continue;
      // Net out bidirectional debts
      const current = debtMatrix[owes][owedTo] ?? 0;
      const reverse = debtMatrix[owedTo][owes] ?? 0;
      if (reverse > 0) {
        const net = reverse - split.amount;
        if (net > 0) {
          debtMatrix[owedTo][owes] = Math.round(net * 100) / 100;
          debtMatrix[owes][owedTo] = 0;
        } else {
          debtMatrix[owedTo][owes] = 0;
          debtMatrix[owes][owedTo] = Math.round(-net * 100) / 100;
        }
      } else {
        debtMatrix[owes][owedTo] = Math.round((current + split.amount) * 100) / 100;
      }
    }
  }

  // Step 3: minimal settlements (greedy)
  const creditors = netBalances
    .filter((b) => b.balance > 0.005)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = netBalances
    .filter((b) => b.balance < -0.005)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.balance - b.balance);

  const settlements: SettlementSuggestion[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
    const rounded = Math.round(amount * 100) / 100;

    if (rounded > 0) {
      settlements.push({
        fromId: debtor.participantId,
        fromName: debtor.name,
        toId: creditor.participantId,
        toName: creditor.name,
        amount: rounded,
      });
    }

    creditor.balance -= amount;
    debtor.balance += amount;

    if (Math.abs(creditor.balance) < 0.005) creditors.shift();
    if (Math.abs(debtor.balance) < 0.005) debtors.shift();
  }

  return { netBalances, debtMatrix, settlements };
}

export function buildDebtList(
  debtMatrix: Record<string, Record<string, number>>,
  nameMap: Record<string, string>
): DebtEntry[] {
  const debts: DebtEntry[] = [];
  for (const fromId of Object.keys(debtMatrix)) {
    for (const toId of Object.keys(debtMatrix[fromId])) {
      const amount = debtMatrix[fromId][toId];
      if (amount > 0.005) {
        debts.push({
          fromId,
          fromName: nameMap[fromId] ?? fromId,
          toId,
          toName: nameMap[toId] ?? toId,
          amount,
        });
      }
    }
  }
  return debts;
}
