import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Group from "@/models/Group";
import { PARTICIPANT_COLORS } from "@/lib/utils";
import Expense from "@/models/Expense";
import Settlement from "@/models/Settlement";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const group = await Group.findOne({ _id: id, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(group.toObject());
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, participants } = body;

  await connectDB();
  const group = await Group.findOne({ _id: id, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (name) group.name = name.trim();

  if (participants !== undefined) {
    if (participants.length > 3) {
      return NextResponse.json({ error: "Maximum 3 participants" }, { status: 400 });
    }
    group.participants = participants.map(
      (p: { name: string; color?: string; avatar?: string }, i: number) => ({
        name: p.name,
        color: p.color || PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length],
        avatar: p.avatar || null,
      })
    );
  }

  await group.save();
  return NextResponse.json(group.toObject());
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const group = await Group.findOne({ _id: id, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Expense.deleteMany({ groupId: id });
  await Settlement.deleteMany({ groupId: id });
  await group.deleteOne();

  return NextResponse.json({ success: true });
}
