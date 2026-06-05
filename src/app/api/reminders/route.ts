import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reminders, customerProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const reminderSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  name: z.string().min(1),
  productId: z.string().uuid(),
  occasionLabel: z.string().min(1), // "Mom's Birthday"
  remindAt: z.string().datetime(), // ISO date string
});

/**
 * POST /api/reminders — Customer sets a "Remind Me" for a product/date
 * Creates or finds a customer profile and schedules a reminder.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = reminderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reminder data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, phone, name, productId, occasionLabel, remindAt } = parsed.data;

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Either email or phone is required" },
        { status: 400 }
      );
    }

    // Find or create customer profile
    let customerId: string | null = null;

    if (email) {
      const existing = await db
        .select()
        .from(customerProfiles)
        .where(eq(customerProfiles.email, email))
        .limit(1);

      if (existing.length > 0) {
        customerId = existing[0].id;
      } else {
        const [created] = await db
          .insert(customerProfiles)
          .values({
            name,
            email,
            phone: phone || null,
            source: "voluntary",
          })
          .returning();
        customerId = created.id;
      }
    } else if (phone) {
      const existing = await db
        .select()
        .from(customerProfiles)
        .where(eq(customerProfiles.phone, phone))
        .limit(1);

      if (existing.length > 0) {
        customerId = existing[0].id;
      } else {
        const [created] = await db
          .insert(customerProfiles)
          .values({
            name,
            phone,
            source: "voluntary",
          })
          .returning();
        customerId = created.id;
      }
    }

    // Create the reminder
    const [reminder] = await db
      .insert(reminders)
      .values({
        customerId,
        email: email || null,
        phone: phone || null,
        productId,
        occasionLabel,
        remindAt: new Date(remindAt),
      })
      .returning();

    return NextResponse.json(
      { reminder: { id: reminder.id, remindAt: reminder.remindAt } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Reminder creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
