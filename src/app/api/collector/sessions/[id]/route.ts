import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const session = await prisma.collectionSession.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { action, responsesCount } = body;

    const now = new Date();
    let updateData: Record<string, any> = { updatedAt: now };

    switch (action) {
      case "pause":
        if (session.status !== "active") return NextResponse.json({ error: "Can only pause active sessions" }, { status: 400 });
        updateData.status = "paused";
        updateData.pausedAt = now;
        if (responsesCount !== undefined) updateData.responsesCount = responsesCount;
        break;
      case "resume":
        if (session.status !== "paused") return NextResponse.json({ error: "Can only resume paused sessions" }, { status: 400 });
        updateData.status = "active";
        updateData.resumedAt = now;
        if (responsesCount !== undefined) updateData.responsesCount = responsesCount;
        break;
      case "close":
        if (session.status !== "active" && session.status !== "paused") {
          return NextResponse.json({ error: "Can only close active or paused sessions" }, { status: 400 });
        }
        updateData.status = "closed";
        updateData.closedAt = now;
        if (responsesCount !== undefined) updateData.responsesCount = responsesCount;
        break;
      case "submit":
        updateData.status = "submitted";
        updateData.submittedAt = now;
        updateData.closedAt = now;
        if (responsesCount !== undefined) updateData.responsesCount = responsesCount;
        break;
      case "count":
        if (responsesCount !== undefined) updateData.responsesCount = responsesCount;
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await prisma.collectionSession.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const session = await prisma.collectionSession.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.collectionSession.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
