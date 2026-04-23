import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Group from "@/models/Group";
import Expense from "@/models/Expense";
import Settlement from "@/models/Settlement";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq";
import { computeBalances } from "@/lib/balance-engine";
import type { IExpense, ChatMessage } from "@/types";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages }: { messages: ChatMessage[] } = await req.json();

  await connectDB();
  const groups = await Group.find({ ownerId: session.user.id });
  const groupIds = groups.map((g) => g._id);
  const allExpenses = await Expense.find({ groupId: { $in: groupIds } });
  const allSettlements = await Settlement.find({ groupId: { $in: groupIds } });

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const totalSpent = allExpenses.reduce((s, e) => s + e.amount, 0);

  const thisMonthExpenses = allExpenses.filter((e) => e.date >= thisMonthStart);
  const lastMonthExpenses = allExpenses.filter((e) => e.date >= lastMonthStart && e.date < thisMonthStart);
  const monthSpent = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const lastMonthSpent = lastMonthExpenses.reduce((s, e) => s + e.amount, 0);

  const thisMonthName = now.toLocaleString("default", { month: "long", year: "numeric" });
  const lastMonthName = new Date(lastMonthStart).toLocaleString("default", { month: "long", year: "numeric" });

  const buildCategoryBreakdown = (expenses: typeof allExpenses) => {
    const breakdown: Record<string, number> = {};
    for (const e of expenses) breakdown[e.category] = (breakdown[e.category] || 0) + e.amount;
    return breakdown;
  };

  const buildGroupBreakdown = (expenses: typeof allExpenses) => {
    const breakdown: Record<string, number> = {};
    for (const g of groups) {
      const total = expenses.filter((e) => e.groupId.toString() === g._id.toString()).reduce((s, e) => s + e.amount, 0);
      if (total > 0) breakdown[g.name] = total;
    }
    return breakdown;
  };

  const categoryBreakdown = buildCategoryBreakdown(allExpenses);
  const thisMonthCategories = buildCategoryBreakdown(thisMonthExpenses);
  const lastMonthCategories = buildCategoryBreakdown(lastMonthExpenses);
  const thisMonthGroups = buildGroupBreakdown(thisMonthExpenses);
  const lastMonthGroups = buildGroupBreakdown(lastMonthExpenses);

  // Per-group rich context
  let totalUserOwes = 0;
  let totalOwedToUser = 0;
  const groupContexts: string[] = [];

  for (const g of groups) {
    const gExpenses = allExpenses.filter((e) => e.groupId.toString() === g._id.toString());
    const gSettlements = allSettlements.filter((s) => s.groupId.toString() === g._id.toString());

    const participants = g.participants.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      color: p.color,
      avatar: p.avatar ?? null,
    }));

    const nameMap: Record<string, string> = { owner: session.user.name ?? "Me" };
    participants.forEach((p) => (nameMap[p._id] = p.name));

    // Synthetic settlement expenses for balance computation
    const settlementExpenses: IExpense[] = gSettlements.map((s) => ({
      _id: s._id.toString(),
      groupId: g._id.toString(),
      description: "Settlement",
      amount: s.amount,
      date: s.settledAt,
      payerId: s.fromId,
      splitMode: "equal" as const,
      splits: [{ participantId: s.toId, amount: s.amount }],
      category: "Other" as const,
      createdAt: s.settledAt,
    }));

    const { netBalances, settlements } = computeBalances(
      [...gExpenses.map((e) => e.toObject()), ...settlementExpenses] as unknown as IExpense[],
      participants,
      session.user.name ?? "Me",
      session.user.id
    );

    // User's net balance in this group
    const myBalance = netBalances.find((b) => b.participantId === "owner");
    if (myBalance) {
      if (myBalance.balance < -0.005) totalUserOwes += Math.abs(myBalance.balance);
      else if (myBalance.balance > 0.005) totalOwedToUser += myBalance.balance;
    }

    // Per-participant spending
    const memberStats = ["owner", ...participants.map((p) => p._id)].map((pid) => {
      const paid = gExpenses.filter((e) => e.payerId === pid).reduce((s, e) => s + e.amount, 0);
      const share = gExpenses.reduce((s, e) => {
        const sp = e.splits.find((x) => x.participantId === pid);
        return s + (sp?.amount ?? 0);
      }, 0);
      const netBal = netBalances.find((b) => b.participantId === pid);
      return {
        name: nameMap[pid] ?? pid,
        totalPaid: paid,
        fairShare: share,
        netBalance: netBal?.balance ?? 0,
      };
    });

    // Category breakdown per group
    const groupCategories: Record<string, number> = {};
    for (const e of gExpenses) {
      groupCategories[e.category] = (groupCategories[e.category] || 0) + e.amount;
    }

    const groupTotal = gExpenses.reduce((s, e) => s + e.amount, 0);
    const catLines = Object.entries(groupCategories).map(([k, v]) => `${k} ₹${v.toFixed(2)}`).join(", ");
    const memberLines = memberStats.map((m) =>
      `${m.name}: paid ₹${m.totalPaid.toFixed(2)}, share ₹${m.fairShare.toFixed(2)}, net ₹${m.netBalance.toFixed(2)} ${m.netBalance > 0.005 ? "(owed to them)" : m.netBalance < -0.005 ? "(they owe)" : "(even)"}`
    ).join("\n    ");
    const settlementLines = settlements.length === 0
      ? "All settled up"
      : settlements.map((s) => `${s.fromName} → ${s.toName}: ₹${s.amount.toFixed(2)}`).join(", ");

    groupContexts.push(
      `GROUP "${g.name}" | ${gExpenses.length} expenses | Total ₹${groupTotal.toFixed(2)} | ${gSettlements.length} settlements recorded\n` +
      `  Categories: ${catLines || "none"}\n` +
      `  Members:\n    ${memberLines}\n` +
      `  Pending payments: ${settlementLines}`
    );
  }

  const recentExpenses = [...allExpenses]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 15)
    .map((e) => {
      const g = groups.find((g) => g._id.toString() === e.groupId.toString());
      const nameMap: Record<string, string> = { owner: session.user.name ?? "Me" };
      g?.participants.forEach((p) => (nameMap[p._id.toString()] = p.name));
      return {
        description: e.description,
        amount: e.amount,
        category: e.category,
        date: e.date.toISOString().split("T")[0],
        paidBy: nameMap[e.payerId] ?? e.payerId,
        group: g?.name ?? "Unknown",
      };
    });

  const systemPrompt = `You are MintSense, an intelligent personal finance assistant inside SplitMint — a bill-splitting app.
You have complete, real-time access to ${session.user.name}'s financial data across all groups.
Today's date: ${now.toDateString()} (${now.toLocaleString("default", { weekday: "long" })}).
Current month: ${thisMonthName}. Previous month: ${lastMonthName}.

=== DASHBOARD SUMMARY ===
User: ${session.user.name}
Total spent (all time): ₹${totalSpent.toFixed(2)}
Total expenses (all time): ${allExpenses.length}
Active groups: ${groups.length}

NET BALANCE (after all settlements):
- You owe others: ₹${totalUserOwes.toFixed(2)}
- Others owe you: ₹${totalOwedToUser.toFixed(2)}
- Net position: ${totalOwedToUser - totalUserOwes >= 0 ? "+" : ""}₹${(totalOwedToUser - totalUserOwes).toFixed(2)}

=== THIS MONTH (${thisMonthName}) ===
Total spent: ₹${monthSpent.toFixed(2)}
Number of expenses: ${thisMonthExpenses.length}
By category: ${Object.entries(thisMonthCategories).map(([k, v]) => `${k} ₹${v.toFixed(2)}`).join(", ") || "No expenses"}
By group: ${Object.entries(thisMonthGroups).map(([k, v]) => `${k} ₹${v.toFixed(2)}`).join(", ") || "No expenses"}

=== LAST MONTH (${lastMonthName}) ===
Total spent: ₹${lastMonthSpent.toFixed(2)}
Number of expenses: ${lastMonthExpenses.length}
By category: ${Object.entries(lastMonthCategories).map(([k, v]) => `${k} ₹${v.toFixed(2)}`).join(", ") || "No expenses"}
By group: ${Object.entries(lastMonthGroups).map(([k, v]) => `${k} ₹${v.toFixed(2)}`).join(", ") || "No expenses"}

Month-over-month change: ${lastMonthSpent > 0 ? ((monthSpent - lastMonthSpent) / lastMonthSpent * 100).toFixed(1) + "% " + (monthSpent > lastMonthSpent ? "(spending increased)" : "(spending decreased)") : "No last month data"}

=== ALL TIME CATEGORY BREAKDOWN ===
${Object.entries(categoryBreakdown).map(([k, v]) => `  ${k}: ₹${v.toFixed(2)}`).join("\n") || "  No expenses yet"}

=== PER GROUP DETAILS ===
${groupContexts.join("\n\n")}

=== RECENT EXPENSES (last 15) ===
${recentExpenses.map((e) => `[${e.date}] ${e.paidBy} paid ₹${e.amount} for "${e.description}" (${e.category}) in ${e.group}`).join("\n")}
========================

Answer questions conversationally and specifically. Use ₹ symbol. Be insightful — mention trends, patterns, and actionable advice when relevant.
Never make up numbers. Only use the data above. If data is unavailable, say so.`;

  const groq = getGroqClient();
  const stream = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
    max_tokens: 600,
    temperature: 0.7,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
