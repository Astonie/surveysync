import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lastSyncAt, surveyIds } = body;

    const where = surveyIds?.length
      ? { id: { in: surveyIds }, status: "active" }
      : { status: "active" };

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
