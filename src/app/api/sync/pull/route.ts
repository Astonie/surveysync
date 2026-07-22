import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lastSyncAt, surveyIds } = body;

    const where = surveyIds?.length
      ? { id: { in: surveyIds }, status: "active" as const }
      : { status: "active" as const };

    const surveys = await prisma.survey.findMany({
      where: {
        ...where,
        ...(lastSyncAt
          ? { updatedAt: { gt: new Date(lastSyncAt) } }
          : {}),
      },
      include: {
        questions: true,
      },
    });

    return NextResponse.json({
      surveys,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Pull failed" },
      { status: 500 }
    );
  }
}
