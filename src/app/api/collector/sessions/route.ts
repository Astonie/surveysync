import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sessionCreateSchema, firstZodError } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = sessionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
    }
    const { surveyId } = parsed.data;

    const access = await prisma.surveyAccess.findUnique({
      where: { userId_surveyId: { userId: user.id, surveyId } },
    });
    if (!access) return NextResponse.json({ error: "No access" }, { status: 403 });

    const existing = await prisma.collectionSession.findFirst({
      where: { surveyId, userId: user.id, status: { in: ["active", "paused"] } },
    });
    if (existing) return NextResponse.json(existing);

    const session = await prisma.collectionSession.create({
      data: { surveyId, userId: user.id, status: "active" },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessions = await prisma.collectionSession.findMany({
      where: { userId: user.id },
      include: {
        survey: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Failed to load sessions:", error);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}
