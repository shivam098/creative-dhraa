import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { customerProfiles, importantDates } from "@/lib/db/schema";
import { verifyAdmin } from "@/lib/auth/middleware";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * GET /api/admin/customers/[id] — Get single customer with important dates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;

    const [customer] = await db
      .select()
      .from(customerProfiles)
      .where(eq(customerProfiles.id, id))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const dates = await db
      .select()
      .from(importantDates)
      .where(eq(importantDates.customerId, id));

    return NextResponse.json({
      customer: {
        ...customer,
        totalSpent: customer.totalSpent ? Number(customer.totalSpent) : 0,
      },
      importantDates: dates,
    });
  } catch (error) {
    console.error("Get customer error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/customers/[id] — Update customer profile + manage dates
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = await request.json();

    const schema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(10).optional(),
      city: z.string().optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
      importantDates: z
        .array(
          z.object({
            type: z.enum(["birthday", "anniversary", "custom"]),
            label: z.string().min(1),
            date: z.string().datetime(),
            recipientName: z.string().optional(),
            reminderDaysBefore: z.number().int().min(1).max(30).optional(),
            isRecurring: z.boolean().optional(),
          })
        )
        .optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Update profile
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const [updated] = await db
      .update(customerProfiles)
      .set(updateData)
      .where(eq(customerProfiles.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Replace important dates if provided
    if (data.importantDates !== undefined) {
      // Delete existing
      await db.delete(importantDates).where(eq(importantDates.customerId, id));

      // Insert new ones
      if (data.importantDates.length > 0) {
        await db.insert(importantDates).values(
          data.importantDates.map((d) => ({
            customerId: id,
            type: d.type,
            label: d.label,
            date: new Date(d.date),
            recipientName: d.recipientName || null,
            reminderDaysBefore: d.reminderDaysBefore ?? 7,
            isRecurring: d.isRecurring ?? true,
          }))
        );
      }
    }

    return NextResponse.json({ customer: updated });
  } catch (error) {
    console.error("Update customer error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
