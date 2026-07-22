import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing || existing.createdBy !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invitations = await prisma.invitation.findMany({
      where: { surveyId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invitations });
  } catch {
    return NextResponse.json({ error: "Failed to load invitations" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.survey.findUnique({ where: { id } });
    if (!existing || existing.createdBy !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingAccess = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingAccess) {
      const alreadyHasAccess = await prisma.surveyAccess.findUnique({
        where: { userId_surveyId: { userId: existingAccess.id, surveyId: id } },
      });
      if (alreadyHasAccess) {
        return NextResponse.json({ error: "User already has access" }, { status: 409 });
      }
    }

    const existingPending = await prisma.invitation.findFirst({
      where: { email: normalizedEmail, surveyId: id, status: "pending" },
    });
    if (existingPending) {
      return NextResponse.json(
        { error: "Invitation already sent to this email", status: "pending", invitationId: existingPending.id },
        { status: 409 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: {
        email: normalizedEmail,
        surveyId: id,
        token,
        invitedBy: user.id,
        expiresAt,
      },
    });

    const host = request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${protocol}://${host}` : "http://localhost:3000");
    const inviteUrl = `${appUrl}/invite/${token}`;

    return NextResponse.json({
      invitation,
      inviteUrl,
      message: `Invitation link created. Share this link with ${normalizedEmail}.`,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }
}
