import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        survey: { select: { id: true, title: true, description: true, status: true } },
        inviter: { select: { name: true, email: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation link" }, { status: 404 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "Invitation already " + invitation.status }, { status: 410 });
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
    }

    const user = await getSession();
    const targetUser = user ? await prisma.user.findUnique({ where: { id: user.id } }) : null;
    const alreadyHasAccess = targetUser
      ? await prisma.surveyAccess.findUnique({
          where: { userId_surveyId: { userId: targetUser.id, surveyId: invitation.surveyId } },
        })
      : null;

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        survey: invitation.survey,
        inviter: invitation.inviter,
        expiresAt: invitation.expiresAt,
      },
      isLoggedIn: !!user,
      currentUserEmail: user?.email || null,
      alreadyHasAccess: !!alreadyHasAccess,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    }

    const { token } = await params;
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { survey: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "Invitation already " + invitation.status }, { status: 410 });
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
    }

    if (invitation.email !== user.email) {
      return NextResponse.json(
        { error: `This invitation is for ${invitation.email}. You are logged in as ${user.email}.` },
        { status: 403 }
      );
    }

    const existingAccess = await prisma.surveyAccess.findUnique({
      where: { userId_surveyId: { userId: user.id, surveyId: invitation.surveyId } },
    });

    if (!existingAccess) {
      await prisma.surveyAccess.create({
        data: {
          userId: user.id,
          surveyId: invitation.surveyId,
          role: "collector",
        },
      });
    }

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    });

    return NextResponse.json({
      success: true,
      surveyId: invitation.surveyId,
      surveyTitle: invitation.survey.title,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
