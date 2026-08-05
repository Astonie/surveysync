import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const VALID_STATUSES = ["draft", "active", "paused", "closed"];

interface QuestionInput {
  type: string;
  text: string;
  required: boolean;
  options: string[] | null;
  order: number;
}

interface SectionInput {
  title: string;
  description: string | null;
  order: number;
  questions?: QuestionInput[];
}

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
    const { title, description, sections, status } = body;

    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }
    if (existing.createdBy !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (sections !== undefined) {
      const survey = await prisma.$transaction(async (tx) => {
        // Delete existing sections and their questions
        await tx.section.deleteMany({ where: { surveyId: id } });
        await tx.question.deleteMany({ where: { surveyId: id } });
        return tx.survey.update({
          where: { id },
          data: {
            title: title ?? existing.title,
            description: description !== undefined ? description : existing.description,
            status: status !== undefined ? status : existing.status,
            sections: {
              create: sections.map(
                (s: SectionInput, sectionIndex: number) => ({
                  title: s.title,
                  description: s.description || null,
                  order: s.order ?? sectionIndex,
                  questions: {
                    create: (s.questions || []).map(
                      (q: QuestionInput, questionIndex: number) => ({
                        type: q.type,
                        text: q.text,
                        required: q.required,
                        options: q.options || undefined,
                        order: q.order ?? questionIndex,
                      })
                    ),
                  },
                })
              ),
            },
          },
          include: { sections: { include: { questions: true } } },
        });
      });
      return NextResponse.json(survey);
    }

    const survey = await prisma.survey.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        description: description !== undefined ? description : existing.description,
        status: status !== undefined ? status : existing.status,
      },
      include: { sections: { include: { questions: true } } },
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

    if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

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
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
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
