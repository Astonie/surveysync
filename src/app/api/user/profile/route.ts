import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, createSession } from "@/lib/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  } catch (error) {
    console.error("Failed to load profile:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
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

    if (email !== undefined && email && !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (name !== undefined && name && name.length > 100) {
      return NextResponse.json({ error: "Name must be at most 100 characters" }, { status: 400 });
    }

    if (bio !== undefined && bio && bio.length > 500) {
      return NextResponse.json({ error: "Bio must be at most 500 characters" }, { status: 400 });
    }

    if (phone !== undefined && phone && phone.length > 20) {
      return NextResponse.json({ error: "Phone must be at most 20 characters" }, { status: 400 });
    }

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
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
