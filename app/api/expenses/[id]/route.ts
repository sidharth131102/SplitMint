import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import Group from "@/models/Group";
import { calculateSplits } from "@/lib/utils";
import type { SplitMode } from "@/types";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { description, amount, date, payerId, splitMode, participants: participantIds, splits: customSplits, category } = body;

  await connectDB();
  const expense = await Expense.findById(id);
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const group = await Group.findOne({ _id: expense.groupId, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  if (description) expense.description = description.trim();
  if (amount) expense.amount = parseFloat(amount);
  if (date) expense.date = new Date(date);
  if (payerId) expense.payerId = payerId;
  if (category) expense.category = category;
  if (splitMode) {
    expense.splitMode = splitMode;
    expense.splits = calculateSplits(
      expense.amount,
      participantIds || expense.splits.map((s) => s.participantId),
      splitMode as SplitMode,
      customSplits
    ) as never;
  }

  await expense.save();
  return NextResponse.json(expense.toObject());
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const expense = await Expense.findById(id);
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const group = await Group.findOne({ _id: expense.groupId, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await expense.deleteOne();
  return NextResponse.json({ success: true });
}
