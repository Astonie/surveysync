import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(
  request: NextRequest,
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

    const since = request.nextUrl.searchParams.get("since");
    const where: Prisma.ResponseWhereInput = { surveyId };
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        where.createdAt = { gt: sinceDate };
      }
    }

    const responses = await prisma.response.findMany({
      where,
      include: {
        answers: true,
        collector: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const auditTrail = since
      ? []
      : await prisma.auditLog.findMany({
          where: { surveyId, action: "response.submitted" },
          select: { entityId: true, metadata: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 2000,
        });

    return NextResponse.json({ survey, responses, auditTrail });
  } catch (error) {
    console.error("Failed to load responses:", error);
    return NextResponse.json({ error: "Failed to load responses" }, { status: 500 });
  }
}
