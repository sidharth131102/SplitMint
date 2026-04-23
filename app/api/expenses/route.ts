import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import Group from "@/models/Group";
import { calculateSplits } from "@/lib/utils";
import type { SplitMode } from "@/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const search = searchParams.get("search");
  const participantId = searchParams.get("participantId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");

  // verify group ownership
  const userGroups = await Group.find({ ownerId: session.user.id }).select("_id");
  const userGroupIds = userGroups.map((g) => g._id.toString());

  const query: Record<string, unknown> = {
    groupId: groupId
      ? { $in: [groupId] }
      : { $in: userGroupIds },
  };

  if (search) query.$text = { $search: search };
  if (participantId) {
    query.$or = [
      { payerId: participantId },
      { "splits.participantId": participantId },
    ];
  }
  if (startDate || endDate) {
    query.date = {};
    if (startDate) (query.date as Record<string, unknown>).$gte = new Date(startDate);
    if (endDate) (query.date as Record<string, unknown>).$lte = new Date(endDate);
  }
  if (minAmount || maxAmount) {
    query.amount = {};
    if (minAmount) (query.amount as Record<string, unknown>).$gte = parseFloat(minAmount);
    if (maxAmount) (query.amount as Record<string, unknown>).$lte = parseFloat(maxAmount);
  }

  const expenses = await Expense.find(query).sort({ date: -1 });
  return NextResponse.json(expenses.map((e) => e.toObject()));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    groupId,
    description,
    amount,
    date,
    payerId,
    splitMode,
    participants: participantIds,
    splits: customSplits,
    category,
  } = body;

  if (!groupId || !description || !amount || !payerId || !splitMode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await connectDB();
  const group = await Group.findOne({ _id: groupId, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const computedSplits = calculateSplits(
    parseFloat(amount),
    participantIds || ["owner", ...group.participants.map((p) => p._id.toString())],
    splitMode as SplitMode,
    customSplits
  );

  const expense = await Expense.create({
    groupId,
    description: description.trim(),
    amount: parseFloat(amount),
    date: date ? new Date(date) : new Date(),
    payerId,
    splitMode,
    splits: computedSplits,
    category: category || "Other",
  });

  return NextResponse.json(expense.toObject(), { status: 201 });
}
