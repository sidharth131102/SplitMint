import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { description, amount } = await req.json();

  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: "user",
        content: `Categorize this expense into exactly one of: Food, Travel, Entertainment, Utilities, Shopping, Health, Other. Respond with ONLY the category name, nothing else.\n\nDescription: "${description}", Amount: ₹${amount}`,
      },
    ],
  });

  const category = completion.choices[0]?.message?.content?.trim() ?? "Other";
  return NextResponse.json({ category });
}
