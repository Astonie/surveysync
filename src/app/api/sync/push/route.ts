import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No items to sync" },
        { status: 400 }
      );
    }

    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const syncedIds: number[] = [];
    const failedIds: number[] = [];

    for (const item of items) {
      try {
        const payload = JSON.parse(item.payload);

        if (item.entityType === "response") {
          const survey = await prisma.survey.findUnique({
            where: { id: payload.surveyId },
          });

          if (!survey || survey.status !== "active") {
            failedIds.push(item.id);
            continue;
          }

          const existingResponse = await prisma.response.findUnique({
            where: { id: payload.id },
          });

          if (existingResponse) {
            await prisma.response.update({
              where: { id: existingResponse.id },
              data: { syncedAt: new Date() },
            });
          } else {
            await prisma.response.create({
              data: {
                surveyId: payload.surveyId,
                submittedById: user.id,
                isOffline: true,
                syncedAt: new Date(),
                answers: {
                  create: (payload.answers || []).map(
                    (a: { questionId: string; value: string | number | string[] }) => ({
                      questionId: a.questionId,
                      value: a.value,
                    })
                  ),
                },
              },
            });
          }

          syncedIds.push(item.id);
        } else {
          syncedIds.push(item.id);
        }
      } catch {
        failedIds.push(item.id);
      }
    }

    return NextResponse.json({ syncedIds, failedIds });
  } catch {
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
