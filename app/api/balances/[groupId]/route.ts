import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Group from "@/models/Group";
import Expense from "@/models/Expense";
import Settlement from "@/models/Settlement";
import { computeBalances } from "@/lib/balance-engine";
import type { IExpense } from "@/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  await connectDB();

  const group = await Group.findOne({ _id: groupId, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expenses = await Expense.find({ groupId });
  const settlements = await Settlement.find({ groupId });

  const participants = group.participants.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    color: p.color,
    avatar: p.avatar ?? null,
  }));

  // Convert settlements into synthetic "repayment" expenses so the balance
  // engine can subtract them: fromId paid toId `amount`, split 100% to toId.
  const settlementExpenses: IExpense[] = settlements.map((s) => ({
    _id: s._id.toString(),
    groupId,
    description: "Settlement",
    amount: s.amount,
    date: s.settledAt,
    payerId: s.fromId,
    splitMode: "equal" as const,
    splits: [{ participantId: s.toId, amount: s.amount }],
    category: "Other" as const,
    createdAt: s.settledAt,
  }));

  const allExpenses = [
    ...(expenses.map((e) => e.toObject()) as unknown as IExpense[]),
    ...settlementExpenses,
  ];

  const balanceData = computeBalances(
    allExpenses,
    participants,
    session.user.name ?? "Me",
    session.user.id
  );

  return NextResponse.json(balanceData);
}
