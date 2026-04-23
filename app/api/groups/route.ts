import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Group from "@/models/Group";
import { PARTICIPANT_COLORS } from "@/lib/utils";
import Expense from "@/models/Expense";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const groups = await Group.find({ ownerId: session.user.id }).sort({ createdAt: -1 });

  const enriched = await Promise.all(
    groups.map(async (g) => {
      const expenses = await Expense.find({ groupId: g._id });
      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        ...g.toObject(),
        totalExpenses: total,
        expenseCount: expenses.length,
      };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, participants = [] } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }


  await connectDB();

  const coloredParticipants = participants.map(
    (p: { name: string; color?: string; avatar?: string }, i: number) => ({
      name: p.name,
      color: p.color || PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length],
      avatar: p.avatar || null,
    })
  );

  const group = await Group.create({
    name: name.trim(),
    ownerId: session.user.id,
    participants: coloredParticipants,
  });

  return NextResponse.json(group.toObject(), { status: 201 });
}
