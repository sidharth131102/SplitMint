import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Group from "@/models/Group";
import Expense from "@/models/Expense";
import { computeBalances, buildDebtList } from "@/lib/balance-engine";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq";
import type { IExpense } from "@/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  await connectDB();

  const group = await Group.findOne({ _id: groupId, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expenses = await Expense.find({ groupId });
  const participants = group.participants.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    color: p.color,
    avatar: p.avatar ?? null,
  }));

  const { settlements, debtMatrix } = computeBalances(
    expenses.map((e) => e.toObject()) as unknown as IExpense[],
    participants,
    session.user.name ?? "Me",
    session.user.id
  );

  if (settlements.length === 0) {
    return NextResponse.json({ advice: "All balances are settled! No payments needed." });
  }

  const nameMap: Record<string, string> = { owner: session.user.name ?? "Me" };
  participants.forEach((p) => (nameMap[p._id] = p.name));
  const debtsList = buildDebtList(debtMatrix, nameMap);

  const prompt = `You are a financial assistant helping friends settle debts simply. Explain the settlement plan in plain, friendly language. Keep it under 100 words.

Current debts: ${JSON.stringify(debtsList)}
Minimal settlement path: ${JSON.stringify(settlements)}`;

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  const advice = completion.choices[0]?.message?.content ?? "";
  return NextResponse.json({ advice });
}
