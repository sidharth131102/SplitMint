import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Group from "@/models/Group";
import { PARTICIPANT_COLORS } from "@/lib/utils";
import Expense from "@/models/Expense";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, color, avatar } = await req.json();

  await connectDB();
  const group = await Group.findOne({ _id: id, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });


  const usedColors = group.participants.map((p) => p.color);
  const autoColor = PARTICIPANT_COLORS.find((c) => !usedColors.includes(c)) || PARTICIPANT_COLORS[0];

  group.participants.push({ name, color: color || autoColor, avatar: avatar || null } as never);
  await group.save();

  return NextResponse.json(group.toObject(), { status: 201 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { participantId, name, color, avatar } = await req.json();

  await connectDB();
  const group = await Group.findOne({ _id: id, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const participant = group.participants.find((p) => p._id.toString() === participantId);
  if (!participant) return NextResponse.json({ error: "Participant not found" }, { status: 404 });

  if (name) participant.name = name;
  if (color) participant.color = color;
  if (avatar !== undefined) participant.avatar = avatar;

  await group.save();
  return NextResponse.json(group.toObject());
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { participantId, force } = await req.json();

  await connectDB();
  const group = await Group.findOne({ _id: id, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const affectedExpenses = await Expense.find({
    groupId: id,
    $or: [
      { payerId: participantId },
      { "splits.participantId": participantId },
    ],
  }).select("_id description");

  if (affectedExpenses.length > 0 && !force) {
    return NextResponse.json(
      {
        error: "Participant is linked to existing expenses",
        code: "PARTICIPANT_IN_USE",
        count: affectedExpenses.length,
        expenses: affectedExpenses.map((e) => ({ _id: e._id, description: e.description })),
      },
      { status: 409 }
    );
  }

  if (affectedExpenses.length > 0 && force) {
    await Expense.deleteMany({
      groupId: id,
      $or: [{ payerId: participantId }, { "splits.participantId": participantId }],
    });
  }

  group.participants = group.participants.filter(
    (p) => p._id.toString() !== participantId
  ) as never;
  await group.save();

  return NextResponse.json(group.toObject());
}
