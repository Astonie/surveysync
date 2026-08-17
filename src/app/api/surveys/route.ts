import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { surveyInputSchema, firstZodError } from "@/lib/validation";

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

    const survey = await prisma.$transaction(async (tx) => {
      const created = await tx.survey.create({
        data: {
          title,
          description: description || null,
          status: status || "draft",
          createdBy: user.id,
        },
      });

      for (const [sectionIndex, s] of (sections || []).entries()) {
        await tx.section.create({
          data: {
            surveyId: created.id,
            title: s.title,
            description: s.description || null,
            order: s.order ?? sectionIndex,
            questions: {
              create: s.questions.map(
                (q, questionIndex) => ({
                  surveyId: created.id,
                  type: q.type,
                  text: q.text,
                  required: q.required,
                  options: q.options || undefined,
                  order: q.order ?? questionIndex,
                })
              ),
            },
          },
        });
      }

      return tx.survey.findUnique({
        where: { id: created.id },
        include: { sections: { include: { questions: true } } },
      });
    });

    return NextResponse.json(survey, { status: 201 });
  } catch (error) {
    console.error("Failed to create survey:", error);
    const detail =
      error instanceof Error
        ? { message: error.message, name: error.name, ...(error as any).code ? { code: (error as any).code } : {} }
        : String(error);
    return NextResponse.json(
      { error: "Failed to create survey", detail },
      { status: 500 }
    );
  }
}
