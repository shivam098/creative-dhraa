import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromCookie } from "@/lib/auth/customer-auth";
import { getDb } from "@/lib/db";
import { customerAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Get current logged-in customer
export async function GET() {
  try {
    const payload = await getCustomerFromCookie();
    if (!payload) {
      return NextResponse.json({ user: null });
    }

    const db = getDb();
    const account = await db.query.customerAccounts.findFirst({
      where: eq(customerAccounts.id, payload.sub),
      with: { profile: true },
    });

    if (!account) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: account.id,
        email: account.email,
        name: account.name,
        avatarUrl: account.avatarUrl,
        phone: account.phone,
        provider: account.provider,
        profile: account.profile,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}

// Update customer profile
export async function PATCH(req: NextRequest) {
  try {
    const payload = await getCustomerFromCookie();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone } = body;

    const db = getDb();
    const [updated] = await db
      .update(customerAccounts)
      .set({
        ...(name && { name }),
        ...(phone && { phone }),
        updatedAt: new Date(),
      })
      .where(eq(customerAccounts.id, payload.sub))
      .returning();

    return NextResponse.json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        phone: updated.phone,
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
