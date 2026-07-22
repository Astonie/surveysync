import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await prisma.surveyAccess.findMany({
      where: { userId: user.id },
      include: {
        survey: {
          include: {
            questions: true,
            _count: { select: { responses: true } },
            responses: {
              where: { submittedById: user.id },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const surveys = access.map((a) => ({
      ...a.survey,
      myResponses: a.survey.responses.length,
    }));

    return NextResponse.json({ surveys });
  } catch {
    return NextResponse.json({ error: "Failed to load assigned surveys" }, { status: 500 });
  }
}
