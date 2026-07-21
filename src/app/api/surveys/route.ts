import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const surveys = await prisma.survey.findMany({
      where: { createdBy: user.id },
      include: {
        _count: { select: { questions: true, responses: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ surveys });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, questions, isPublished } = body;

    if (!title || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: "Title and at least one question are required" },
        { status: 400 }
      );
    }

    const survey = await prisma.survey.create({
      data: {
        title,
        description: description || null,
        isPublished: isPublished || false,
        createdBy: user.id,
        questions: {
          create: questions.map(
            (q: { type: string; text: string; required: boolean; options: string[] | null; order: number }) => ({
              type: q.type,
              text: q.text,
              required: q.required,
              options: q.options || undefined,
              order: q.order,
            })
          ),
        },
      },
      include: { questions: true },
    });

    return NextResponse.json(survey, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create survey" }, { status: 500 });
  }
}
