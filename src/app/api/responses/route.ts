import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { responseInputSchema, firstZodError } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAudit, clientIp } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(`responses:${ip}`, 60, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json();
    const parsed = responseInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
    }
    const { surveyId, answers, isOffline, sessionId, deviceId } = parsed.data;

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: true },
    });
    if (!survey || survey.status !== "active") {
      return NextResponse.json(
        { error: "Survey not found or not accepting responses" },
        { status: 404 }
      );
    }

    const validQuestionIds = new Set(survey.questions.map((q) => q.id));
    const invalidAnswers = answers.filter((a) => !validQuestionIds.has(a.questionId));
    if (invalidAnswers.length > 0) {
      return NextResponse.json(
        { error: "Some answers reference questions that do not belong to this survey" },
        { status: 400 }
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
          create: answers.map((a) => ({
            questionId: a.questionId,
            value: a.value,
          })),
        },
      },
      include: { answers: true },
    });

    await recordAudit({
      action: "response.submitted",
      entityType: "response",
      entityId: response.id,
      surveyId,
      actorId: user?.id || null,
      metadata: { isOffline: isOffline || false, sessionId, deviceId, ip: clientIp(request) },
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Failed to submit response:", error);
    return NextResponse.json({ error: "Failed to submit response" }, { status: 500 });
  }
}
