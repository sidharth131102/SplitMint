import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Settlement from "@/models/Settlement";
import Group from "@/models/Group";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId, fromId, toId, amount } = await req.json();

  await connectDB();
  const group = await Group.findOne({ _id: groupId, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const settlement = await Settlement.create({ groupId, fromId, toId, amount, settledAt: new Date() });
  return NextResponse.json(settlement.toObject(), { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await req.json();
  await connectDB();
  const group = await Group.findOne({ _id: groupId, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await Settlement.deleteMany({ groupId });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  await connectDB();
  const query = groupId ? { groupId } : {};
  const settlements = await Settlement.find(query).sort({ settledAt: -1 });
  return NextResponse.json(settlements.map((s) => s.toObject()));
}
