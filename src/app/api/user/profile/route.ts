import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createSession } from "@/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            surveys: true,
            surveyAccess: true,
            collectedResponses: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to load profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionUser = await getSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, bio, phone } = body;

    if (email && email !== sessionUser.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        ...(name !== undefined && { name: name || null }),
        ...(email !== undefined && { email }),
        ...(bio !== undefined && { bio: bio || null }),
        ...(phone !== undefined && { phone: phone || null }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await createSession({ id: updated.id, email: updated.email, name: updated.name });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update profile" }, { status: 500 });
  }
}
