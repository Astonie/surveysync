import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { surveyId } = await params;
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId, createdBy: user.id },
      include: { questions: true },
    });

    if (!survey) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const responses = await prisma.response.findMany({
      where: { surveyId },
      include: {
        answers: true,
        collector: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ survey, responses });
  } catch {
    return NextResponse.json({ error: "Failed to load responses" }, { status: 500 });
  }
}
