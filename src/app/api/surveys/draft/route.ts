import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { draftId, title, description, questions } = body;

    const draftData = {
      title: title || "",
      description: description || "",
      questions: questions || [],
    };

    const draftDir = `drafts/${user.id}`;

    const existing = draftId
      ? await prisma.syncLog.findFirst({
          where: { entityType: "survey_draft", entityId: draftId },
        })
      : null;

    if (existing) {
      await prisma.syncLog.update({
        where: { id: existing.id },
        data: { payload: draftData as any },
      });
    } else {
      const newId = draftId || crypto.randomUUID();
      await prisma.syncLog.create({
        data: {
          entityType: "survey_draft",
          entityId: newId,
          action: "autosave",
          payload: draftData as any,
        },
      });
      return NextResponse.json({ draftId: newId }, { status: 201 });
    }

    return NextResponse.json({ draftId: draftId || existing.entityId });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get("draftId");

    if (draftId) {
      const draft = await prisma.syncLog.findFirst({
        where: { entityType: "survey_draft", entityId: draftId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(draft ? { draft: draft.payload, draftId: draft.entityId } : null);
    }

    const drafts = await prisma.syncLog.findMany({
      where: { entityType: "survey_draft" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ drafts: drafts.map((d) => ({ id: d.entityId, data: d.payload, savedAt: d.createdAt })) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get("draftId");
    if (!draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });

    await prisma.syncLog.deleteMany({
      where: { entityType: "survey_draft", entityId: draftId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
