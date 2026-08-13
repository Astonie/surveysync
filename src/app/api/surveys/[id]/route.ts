import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { surveyInputSchema, surveyPatchSchema, firstZodError } from "@/lib/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        sections: { include: { questions: true }, orderBy: { order: "asc" } },
        questions: { orderBy: { order: "asc" } },
        _count: { select: { responses: true } },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (survey.createdBy !== user.id) {
      const access = await prisma.surveyAccess.findUnique({
        where: { userId_surveyId: { userId: user.id, surveyId: id } },
      });
      if (!access) {
        return NextResponse.json({ error: "Survey not found" }, { status: 404 });
      }
    }

    return NextResponse.json(survey);
  } catch (error) {
    console.error("Failed to load survey:", error);
    return NextResponse.json({ error: "Failed to load survey" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = surveyInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
    }
    const { title, description, sections, status } = parsed.data;
    // `surveyInputSchema` applies `.default()`s (e.g. status: "draft") even under
    // `.partial()`, so only apply fields the client actually sent.
    const sent = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }
    if (existing.createdBy !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (sent("sections")) {
      const survey = await prisma.$transaction(async (tx) => {
        // Delete existing sections and their questions, then recreate with
        // the same IDs so historical responses stay linked to their questions.
        await tx.section.deleteMany({ where: { surveyId: id } });
        await tx.question.deleteMany({ where: { surveyId: id } });
        return tx.survey.update({
          where: { id },
          data: {
            ...(sent("title") && title !== undefined ? { title } : {}),
            ...(sent("description") ? { description } : {}),
            ...(sent("status") && status !== undefined ? { status } : {}),
            sections: {
              create: sections!.map((s, sectionIndex) => ({
                  ...(s.id ? { id: s.id } : {}),
                  title: s.title,
                  description: s.description || null,
                  order: s.order ?? sectionIndex,
                  questions: {
                    create: s.questions.map((q, questionIndex) => ({
                      ...(q.id ? { id: q.id } : {}),
                      surveyId: id,
                      type: q.type,
                      text: q.text,
                      required: q.required,
                      options: q.options || undefined,
                      order: q.order ?? questionIndex,
                    })),
                  },
                })),
            },
          },
          include: { sections: { include: { questions: true } }, questions: { orderBy: { order: "asc" } } },
        });
      });
      return NextResponse.json(survey);
    }

    const survey = await prisma.survey.update({
      where: { id },
      data: {
        ...(sent("title") && title !== undefined ? { title } : {}),
        ...(sent("description") ? { description } : {}),
        ...(sent("status") && status !== undefined ? { status } : {}),
      },
      include: { sections: { include: { questions: true } }, questions: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json(survey);
  } catch (error) {
    console.error("Failed to update survey:", error);
    return NextResponse.json({ error: "Failed to update survey" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = surveyPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
    }
    const patch = parsed.data;

    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }
    if (existing.createdBy !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const survey = await prisma.survey.update({
      where: { id },
      data: {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.status !== undefined && { status: patch.status }),
      },
    });

    return NextResponse.json(survey);
  } catch (error) {
    console.error("Failed to update survey:", error);
    return NextResponse.json({ error: "Failed to update survey" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }
    if (existing.createdBy !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.survey.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete survey:", error);
    return NextResponse.json({ error: "Failed to delete survey" }, { status: 500 });
  }
}
