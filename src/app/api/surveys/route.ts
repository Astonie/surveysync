import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
    const { title, description, sections, status } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const survey = await prisma.survey.create({
      data: {
        title,
        description: description || null,
        status: status || "draft",
        createdBy: user.id,
        sections: {
          create: (sections || []).map(
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

    return NextResponse.json(survey, { status: 201 });
  } catch (error) {
    console.error("Failed to create survey:", error);
    return NextResponse.json(
      { error: "Failed to create survey" },
      { status: 500 }
    );
  }
}
