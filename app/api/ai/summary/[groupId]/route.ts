import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Group from "@/models/Group";
import Expense from "@/models/Expense";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq";

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  await connectDB();

  const group = await Group.findOne({ _id: groupId, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expenses = await Expense.find({ groupId }).sort({ date: 1 });
  if (expenses.length === 0) {
    return NextResponse.json({ summary: "No expenses recorded for this group yet." });
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const categories: Record<string, number> = {};
  const payerTotals: Record<string, number> = {};

  for (const e of expenses) {
    categories[e.category] = (categories[e.category] || 0) + e.amount;
    payerTotals[e.payerId] = (payerTotals[e.payerId] || 0) + e.amount;
  }

  const topPayerEntry = Object.entries(payerTotals).sort((a, b) => b[1] - a[1])[0];
  const topPayerId = topPayerEntry?.[0];
  const topPayerName =
    topPayerId === "owner"
      ? session.user.name
      : group.participants.find((p) => p._id.toString() === topPayerId)?.name ?? topPayerId;

  const biggest = expenses.sort((a, b) => b.amount - a.amount)[0];

  const prompt = `You are a friendly financial assistant. Generate a concise 3-5 sentence summary of this group's spending. Be conversational, mention key insights. Use ₹ symbol for amounts.

Group: ${group.name}
Total expenses: ${expenses.length} expenses totaling ₹${total.toFixed(2)}
Date range: ${expenses[0].date.toDateString()} to ${expenses[expenses.length - 1].date.toDateString()}
Top spender: ${topPayerName} paid ₹${topPayerEntry?.[1]?.toFixed(2)}
Categories breakdown: ${JSON.stringify(categories)}
Biggest expense: "${biggest.description}" for ₹${biggest.amount}`;

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  const summary = completion.choices[0]?.message?.content ?? "";
  return NextResponse.json({ summary });
}
