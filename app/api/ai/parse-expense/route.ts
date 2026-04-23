import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Group from "@/models/Group";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, groupId } = await req.json();
  if (!text || !groupId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  await connectDB();
  const group = await Group.findOne({ _id: groupId, ownerId: session.user.id });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const participantsList = [
    `"owner" (${session.user.name}) — use the literal string "owner" for this person`,
    ...group.participants.map((p) => `"${p._id}" (${p.name})`),
  ].join(", ");

  const allIds = ["owner", ...group.participants.map((p) => p._id.toString())];

  const prompt = `You are an expense parser for a bill-splitting app used in India.
Extract expense details from natural language.
The group has these participants: ${participantsList}.
Valid participantId values are: ${JSON.stringify(allIds)}.
Always respond with ONLY valid JSON, no markdown, no explanation.
IMPORTANT: When the user says "all", "everyone", or mentions all N members, set participantIds to ALL valid IDs: ${JSON.stringify(allIds)}.
The payer should also always be included in participantIds unless explicitly excluded.

User: "${text}"

Return JSON:
{
  "amount": number,
  "description": string,
  "payerId": "owner" | participantId,
  "participantIds": string[],
  "date": "YYYY-MM-DD",
  "splitMode": "equal" | "custom" | "percentage",
  "category": "Food" | "Travel" | "Entertainment" | "Utilities" | "Shopping" | "Health" | "Other"
}`;

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  return NextResponse.json(parsed);
}
