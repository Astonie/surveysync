import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { inviteSchema, accessRemoveSchema, firstZodError } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";

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
    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing || existing.createdBy !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const access = await prisma.surveyAccess.findMany({
      where: { surveyId: id },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ access });
  } catch (error) {
    console.error("Failed to load access list:", error);
    return NextResponse.json({ error: "Failed to load access list" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing || existing.createdBy !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
    }
    const { email } = parsed.data;

    const targetUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "No user found with that email. They must register first." },
        { status: 404 }
      );
    }

    if (targetUser.id === user.id) {
      return NextResponse.json(
        { error: "You already own this survey" },
        { status: 400 }
      );
    }

    const existingAccess = await prisma.surveyAccess.findUnique({
      where: { userId_surveyId: { userId: targetUser.id, surveyId: id } },
    });

    if (existingAccess) {
      return NextResponse.json(
        { error: "User already has access" },
        { status: 409 }
      );
    }

    const access = await prisma.surveyAccess.create({
      data: {
        userId: targetUser.id,
        surveyId: id,
        role: "collector",
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    await recordAudit({
      action: "access.granted",
      entityType: "surveyAccess",
      entityId: access.id,
      surveyId: id,
      actorId: user.id,
      metadata: { email: targetUser.email },
    });

    return NextResponse.json(access, { status: 201 });
  } catch (error) {
    console.error("Failed to add collector:", error);
    return NextResponse.json({ error: "Failed to add collector" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing || existing.createdBy !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = accessRemoveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
    }
    const { userId } = parsed.data;

    await prisma.surveyAccess.deleteMany({
      where: { surveyId: id, userId },
    });

    await recordAudit({
      action: "access.revoked",
      entityType: "surveyAccess",
      surveyId: id,
      actorId: user.id,
      metadata: { userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove collector:", error);
    return NextResponse.json({ error: "Failed to remove collector" }, { status: 500 });
  }
}
