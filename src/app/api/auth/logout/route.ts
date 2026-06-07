import { NextResponse } from "next/server";
import { clearCustomerCookie } from "@/lib/auth/customer-auth";

export async function POST() {
  await clearCustomerCookie();
  return NextResponse.json({ success: true });
}
