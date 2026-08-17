import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { surveyInputSchema, firstZodError } from "@/lib/validation";
import type { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const surveys = await prisma.survey.findMany({
      where: { createdBy: user.id },
      include: {
        sections: { include: { questions: true }, orderBy: { order: "asc" } },
        questions: { orderBy: { order: "asc" } },
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ surveys });
  } catch (error) {
    console.error("Failed to load surveys:", error);
    return NextResponse.json({ error: "Failed to load surveys" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = surveyInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
    }
    const { title, description, sections, status } = parsed.data;

    const survey = await prisma.$transaction(
      async (tx) => {
        const created = await tx.survey.create({
          data: {
            title,
            description: description || null,
            status: status || "draft",
            createdBy: user.id,
          },
        });

        const sectionIds: Record<number, string> = {};
        for (const [sectionIndex, s] of (sections || []).entries()) {
          const sec = await tx.section.create({
            data: {
              surveyId: created.id,
              title: s.title,
              description: s.description || null,
              order: s.order ?? sectionIndex,
            },
          });
          sectionIds[sectionIndex] = sec.id;
        }

        const allQuestions: Array<{
          surveyId: string;
          sectionId: string;
          type: string;
          text: string;
          required: boolean;
          options?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
          order: number;
        }> = [];
        for (const [sectionIndex, s] of (sections || []).entries()) {
          for (const [questionIndex, q] of s.questions.entries()) {
            allQuestions.push({
              surveyId: created.id,
              sectionId: sectionIds[sectionIndex],
              type: q.type,
              text: q.text,
              required: q.required,
              ...(q.options ? { options: q.options } : {}),
              order: q.order ?? questionIndex,
            });
          }
        }
        if (allQuestions.length > 0) {
          await tx.question.createMany({ data: allQuestions });
        }

        return tx.survey.findUnique({
          where: { id: created.id },
          include: { sections: { include: { questions: true } } },
        });
      },
      { timeout: 30_000 }
    );

    return NextResponse.json(survey, { status: 201 });
  } catch (error) {
    console.error("Failed to create survey:", error);
    return NextResponse.json(
      { error: "Failed to create survey" },
      { status: 500 }
    );
  }
}
