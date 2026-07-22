import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { surveyId, answers, isOffline } = body;

    if (!surveyId || !answers || answers.length === 0) {
      return NextResponse.json(
        { error: "Survey ID and answers are required" },
        { status: 400 }
      );
    }

    const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey || survey.status !== "active") {
      return NextResponse.json(
        { error: "Survey not found or not accepting responses" },
        { status: 404 }
      );
    }

    const user = await getSession();

    const response = await prisma.response.create({
      data: {
        surveyId,
        submittedById: user?.id || null,
        isOffline: isOffline || false,
        syncedAt: isOffline ? null : new Date(),
        answers: {
          create: answers.map(
            (a: { questionId: string; value: string | number | string[] }) => ({
              questionId: a.questionId,
              value: a.value,
            })
          ),
        },
      },
      include: { answers: true },
    });

    return NextResponse.json(response, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to submit response" }, { status: 500 });
  }
}
